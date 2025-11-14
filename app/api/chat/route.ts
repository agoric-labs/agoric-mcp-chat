import { model, type modelID } from "@/ai/providers";
import { streamText, type UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

import { experimental_createMCPClient as createMCPClient, type MCPTransport } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from "child_process";
import { anthropic } from '@ai-sdk/anthropic';
import { toolSchemas } from "@/lib/mcp/tool-schemas";
// import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 120;

interface KeyValuePair {
  key: string;
  value: string;
}

interface MCPServerConfig {
  url: string;
  type: 'sse' | 'stdio';
  command?: string;
  args?: string[];
  env?: KeyValuePair[];
  headers?: KeyValuePair[];
}

export async function POST(req: Request) {
  // Extract context and ino flag from URL query params
  const url = new URL(req.url);
  const contextParam = url.searchParams.get('context');
  const inoParam = url.searchParams.get('ino');
  
  const {
    messages,
    chatId,
    selectedModel,
    userId,
    mcpServers = [],
  }: {
    messages: UIMessage[];
    chatId?: string;
    selectedModel: modelID;
    userId: string;
    mcpServers?: MCPServerConfig[];
  } = await req.json();

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "User ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const id = chatId || nanoid();

  // Check if chat already exists for the given ID
  // If not, we'll create it in onFinish
  let isNewChat = false;
  if (chatId) {
    try {
      const existingChat = await db.query.chats.findFirst({
        where: and(
          eq(chats.id, chatId),
          eq(chats.userId, userId)
        )
      });
      isNewChat = !existingChat;
    } catch (error) {
      console.error("Error checking for existing chat:", error);
      // Continue anyway, we'll create the chat in onFinish
      isNewChat = true;
    }
  } else {
    // No ID provided, definitely new
    isNewChat = true;
  }

  // Initialize tools
  let tools = {};
  const mcpClients: any[] = [];

  // Process each MCP server configuration
  for (const mcpServer of mcpServers) {
    try {
      // Create appropriate transport based on type
      let transport: MCPTransport | { type: 'sse', url: string, headers?: Record<string, string> };

      if (mcpServer.type === 'sse') {
        console.log('Using SSE transport type');
        // Convert headers array to object for SSE transport
        const headers: Record<string, string> = {};

        transport = {
          type: 'sse' as const,
          url: mcpServer.url,
          headers: Object.keys(headers).length > 0 ? headers : undefined
        };

        console.log('Transport configuration:', {
          type: transport.type,
          url: transport.url,
          headersPresent: transport.headers ? Object.keys(transport.headers).join(', ') : 'none'
        });
        
        // Validate URL
        try {
          new URL(mcpServer.url);
          console.log('URL is valid');
        } catch (error) {
          console.error('Invalid URL format:', mcpServer.url, error);
        }
        
        // Make a test request to check status before actual connection
        console.log('Making test request to URL:', mcpServer.url);
        fetch(mcpServer.url, {
          // method: 'GET', // To get the whole response
          method: 'HEAD',
          headers: transport.headers
        })
        .then(response => {
          // console.log('MCP server response: ', response);
          console.log('Test request response status:', response.status, response.statusText);
          console.log('Test request response headers:', Object.fromEntries(response.headers.entries()));
        })
        .catch(error => {
          console.error('Test request failed:', error);
        });
      } else if (mcpServer.type === 'stdio') {
        // For stdio transport, we need command and args
        if (!mcpServer.command || !mcpServer.args || mcpServer.args.length === 0) {
          console.warn("Skipping stdio MCP server due to missing command or args");
          continue;
        }

        // Convert env array to object for stdio transport
        const env: Record<string, string> = {};
        if (mcpServer.env && mcpServer.env.length > 0) {
          mcpServer.env.forEach(envVar => {
            if (envVar.key) env[envVar.key] = envVar.value || '';
          });
        }

        // Check for uvx pattern and transform to python3 -m uv run
        if (mcpServer.command === 'uvx') {
          // install uv
          const subprocess = spawn('pip3', ['install', 'uv']);
          subprocess.on('close', (code: number) => {
            if (code !== 0) {
              console.error(`Failed to install uv: ${code}`);
            }
          });
          // wait for the subprocess to finish
          await new Promise((resolve) => {
            subprocess.on('close', resolve);
            console.log("installed uv");
          });
          console.log("Detected uvx pattern, transforming to python3 -m uv run");
          mcpServer.command = 'python3';
          // Get the tool name (first argument)
          const toolName = mcpServer.args[0];
          // Replace args with the new pattern
          mcpServer.args = ['-m', 'uv', 'run', toolName, ...mcpServer.args.slice(1)];
        }
        // if python is passed in the command, install the python package mentioned in args after -m with subprocess or use regex to find the package name
        else if (mcpServer.command.includes('python3')) {
          const packageName = mcpServer.args[mcpServer.args.indexOf('-m') + 1];
          console.log("installing python package", packageName);
          const subprocess = spawn('pip3', ['install', packageName]);
          subprocess.on('close', (code: number) => {
            if (code !== 0) {
              console.error(`Failed to install python package: ${code}`);
            }
          });
          // wait for the subprocess to finish
          await new Promise((resolve) => {
            subprocess.on('close', resolve);
            console.log("installed python package", packageName);
          });
        }

        transport = new StdioClientTransport({
          command: mcpServer.command,
          args: mcpServer.args,
          env: Object.keys(env).length > 0 ? env : undefined
        });
      } else {
        console.warn(`Skipping MCP server with unsupported transport type: ${mcpServer.type}`);
        continue;
      }

      const mcpClient = await createMCPClient({ transport });
      mcpClients.push(mcpClient);

      const mcptools = await mcpClient.tools({
        schemas: toolSchemas,
      });

      console.log(`MCP tools from ${mcpServer.type} transport:`, Object.keys(mcptools));
      console.log(`MCP response whole:`, mcptools);

      // Add MCP tools to tools object
      tools = { ...tools, ...mcptools };
    } catch (error) {
      console.error("Failed to initialize MCP client:", error);
      console.error('MCP Server config:', mcpServer);
      // Continue with other servers instead of failing the entire request
    }
  }

  // Register cleanup for all clients
  if (mcpClients.length > 0) {
    req.signal.addEventListener('abort', async () => {
      for (const client of mcpClients) {
        try {
          await client.close();
        } catch (error) {
          console.error("Error closing MCP client:", error);
        }
      }
    });
  }

  console.log("messages", messages);
  console.log("parts", messages.map(m => m.parts.map(p => p)));

  // Build dynamic system prompt based on ino parameter
  let systemPrompt;
  
  if (inoParam === 'true') {
    // Use Ymax system prompt for INO mode
    systemPrompt = `You are Ymax, an expert portfolio optimization AI specialized in Agoric ecosystem DeFi yield strategies.

    Your role is to analyze user portfolios and provide data-driven recommendations to maximize yield while managing risk across the Agoric ecosystem and connected chains via IBC.

    The currently supported Protocols/Pools are USDN, Aave and Compound ONLY. Here's a more granular mapping:
    For Aave, the 3 supported chains are Optimism, Arbitrum and Ethereum.
    For Compound, the 3 supported chains are Ethereum, Arbitrum and Polygon.
    For USDN, the only supported chain is Noble.

    ## Core Expertise Areas:
    - Cross-chain yield farming opportunities across Cosmos ecosystem (currently Noble USDN only) and EVM chains
    - Agoric smart contract yield optimization
    - Risk-adjusted portfolio allocation strategies
    - TVL and APY trend analysis
    - IBC transfer and gas cost-benefit analysis 

    ## Analysis Framework:
    1. **Current State Assessment**: Analyze existing allocations vs target allocations
    2. **Yield Gap Analysis**: Identify underperforming assets and missed opportunities  
    3. **Risk Evaluation**: Assess concentration risk, impermanent loss exposure, smart contract risks
    4. **Market Timing**: Consider APY trends and TVL movements for optimal entry/exit points
    5. **Transaction Cost Optimization**: Factor in gas fees, slippage, and time costs

    ## Key Principles:
    - Prioritize yield maximization but do consider risk management
    - Consider portfolio correlation and diversification
    - Account for lock-up periods and liquidity requirements
    - Factor in user's transaction history and preferences
    - Provide concrete yield estimates with supporting data

    Abbreviations:
    BLD = Agoric's native staking token
    IBC = Inter-Blockchain Communication
    TVL = Total Value Locked
    APY = Annual Percentage Yield

    Today's date is ${new Date().toISOString().split('T')[0]}.

    The tools are very powerful, and you can use them to answer the user's question.
    So choose the tool that is most relevant to the user's question.

    If tools are not available, say you don't know or if the user wants a tool they can add one from the server icon in bottom left corner in the sidebar.

    You can use multiple tools in a single response.
    Always respond after using the tools for better user experience.
    You can run multiple steps using all the tools!!!!
    Make sure to use the right tool to respond to the user's question.

    Multiple tools can be used in a single response and multiple steps can be used to answer the user's question.

    ## Response Format
    - Markdown is supported.
    - Respond according to tool's response.
    - Use the tools to answer the user's question.
    - If you don't know the answer, use the tools to find the answer or say you don't know.
    `;
  } else {
    // Use default Agoric system prompt
    systemPrompt = `You are an expert AI Assistant for Agoric Orchestration users with access to a variety of tools.

    Your primary role is to help users safely and confidently perform multi-chain operations using
    Agoric\'s Orchestration capabilities and smart contracts.
    You act as a vigilant assistant asset manager,
    guiding users through actions like IBC transfers, cross-chain swaps, staking, vault management,
    and contract interactions. Always prioritize the safety and sovereignty of user assets.
    Before suggesting or performing any action:
      Verify the user\'s intent and provide clear, simple explanations of the risks and outcomes.
      Confirm transaction details explicitly, especially if they involve asset movement.

    Focus on substance over praise. Skip unnecessary compliments or praise that lacks depth.
    Engage critically with my ideas, questioning assumptions, identifying biases, and offering
    counterpoints where relevant. Don\'t shy away from disagreement when it\'s warranted, and ensure
    that any agreement is grounded in reason and evidence.

    When handling user requests involving financial transactions or assets:

    1. NEVER make assumptions about products or services that don't exist. If a user refers to a product or service that doesn't exist (like "Fast USDT" when only "Fast USDC" exists):
      - Clearly inform them that the specified product/service doesn't exist
      - DO NOT assume they meant a similar-sounding product
      - Ask for explicit clarification before proceeding with any transaction

    2. Always verify the existence of any product/service before attempting to execute transactions with it

    3. When faced with unclear or incorrect references in financial contexts, prioritize precision and safety over convenience - stop and request clarification rather than guessing the user's intent

    4. Remember that incorrect assumptions about financial products could lead to unintended transactions or loss of funds

    Abbreviations:
    PSM = Parity Stability Module
    MCP = Model Context Protocol (this is not a prodocut from agoric)
    IBC = Inter-Blockchain Communication

    Today's date is ${new Date().toISOString().split('T')[0]}.

    The tools are very powerful, and you can use them to answer the user's question.
    So choose the tool that is most relevant to the user's question.

    If tools are not available, say you don't know or if the user wants a tool they can add one from the server icon in bottom left corner in the sidebar.

    You can use multiple tools in a single response.
    Always respond after using the tools for better user experience.
    You can run multiple steps using all the tools!!!!
    Make sure to use the right tool to respond to the user's question.

    Multiple tools can be used in a single response and multiple steps can be used to answer the user's question.

    When a tool is used to generate code (workflow), do not move to next step until the code accepted by the user. 
    User may review the code and edit it before accepting it, and might give you edited code back to use.

    ## Response Format
    - Markdown is supported.
    - Respond according to tool's response.
    - Use the tools to answer the user's question.
    - If you don't know the answer, use the tools to find the answer or say you don't know.
    `;
  }

  // Add context to system prompt if provided
  if (contextParam) {
    try {
      const context = decodeURIComponent(contextParam) || '';
      // Validate it's valid JSON
      JSON.parse(context);
      systemPrompt += `\n\nAdditional information regarding a user's profile is provided via Context: ${context}.
          For example, a user's address, or portfolio, or open positions. Instead of asking for missing 
          information in a user's query, first defer to this context information and see if this suffices.`;
    } catch (error) {
      console.error('Failed to decode context parameter:', error);
    }
  }

  // If there was an error setting up MCP clients but we at least have composio tools, continue
  const result = streamText({
    model: model.languageModel(selectedModel),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(20),
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 2048,
        },
      },
      anthropic: {
        thinking: { 
          type: 'enabled', 
          budgetTokens: 12000 
        },
      } 
    },
    onError: (error) => {
      console.error(JSON.stringify(error, null, 2));
    },
    async onFinish({ response }) {
      // In v5, response.messages already contains all formatted messages
      // await saveChat({
      //   id,
      //   userId,
      //   messages: response.messages,
      // });

      // const dbMessages = convertToDBMessages(response.messages, id);
      // await saveMessages({ messages: dbMessages });
      // close all mcp clients
      // for (const client of mcpClients) {
      //   await client.close();
      // }
    }
  });
  
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true, // Enable streaming of reasoning/thinking content
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}
