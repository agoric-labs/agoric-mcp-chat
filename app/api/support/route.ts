import { model, type modelID } from "@/ai/providers";
import { streamText, type UIMessage } from "ai";
import { appendResponseMessages } from "ai";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

import {
  experimental_createMCPClient as createMCPClient,
  MCPTransport,
} from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import { spawn } from "child_process";
import { extractDomainsFromMessages, hasUrlsInLastUserMessage } from '@/lib/utils/url-extractor';

// Allow streaming responses up to 30 seconds
export const maxDuration = 120;

interface KeyValuePair {
  key: string;
  value: string;
}

interface MCPServerConfig {
  url: string;
  type: "sse" | "stdio";
  command?: string;
  args?: string[];
  env?: KeyValuePair[];
  headers?: KeyValuePair[];
}

export async function POST(req: Request) {
  // Extract context and ino flag from URL query params
  const url = new URL(req.url);
  const contextParam = url.searchParams.get("context");

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
    return new Response(JSON.stringify({ error: "User ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const id = chatId || nanoid();

  // Check if chat already exists for the given ID
  // If not, we'll create it in onFinish
  let isNewChat = false;
  if (chatId) {
    try {
      const existingChat = await db.query.chats.findFirst({
        where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
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
      let transport:
        | MCPTransport
        | { type: "sse"; url: string; headers?: Record<string, string> };

      if (mcpServer.type === "sse") {
        console.log("Using SSE transport type");
        // Convert headers array to object for SSE transport
        const headers: Record<string, string> = {};

        transport = {
          type: "sse" as const,
          url: mcpServer.url,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        };

        console.log("Transport configuration:", {
          type: transport.type,
          url: transport.url,
          headersPresent: transport.headers
            ? Object.keys(transport.headers).join(", ")
            : "none",
        });

        // Validate URL
        try {
          new URL(mcpServer.url);
          console.log("URL is valid");
        } catch (error) {
          console.error("Invalid URL format:", mcpServer.url, error);
        }

        // Make a test request to check status before actual connection
        console.log("Making test request to URL:", mcpServer.url);
        fetch(mcpServer.url, {
          method: "HEAD",
          headers: transport.headers,
        })
          .then((response) => {
            console.log(
              "Test request response status:",
              response.status,
              response.statusText,
            );
            console.log(
              "Test request response headers:",
              Object.fromEntries(response.headers.entries()),
            );
          })
          .catch((error) => {
            console.error("Test request failed:", error);
          });
      } else if (mcpServer.type === "stdio") {
        // For stdio transport, we need command and args
        if (
          !mcpServer.command ||
          !mcpServer.args ||
          mcpServer.args.length === 0
        ) {
          console.warn(
            "Skipping stdio MCP server due to missing command or args",
          );
          continue;
        }

        // Convert env array to object for stdio transport
        const env: Record<string, string> = {};
        if (mcpServer.env && mcpServer.env.length > 0) {
          mcpServer.env.forEach((envVar) => {
            if (envVar.key) env[envVar.key] = envVar.value || "";
          });
        }

        // Check for uvx pattern and transform to python3 -m uv run
        if (mcpServer.command === "uvx") {
          // install uv
          const subprocess = spawn("pip3", ["install", "uv"]);
          subprocess.on("close", (code: number) => {
            if (code !== 0) {
              console.error(`Failed to install uv: ${code}`);
            }
          });
          // wait for the subprocess to finish
          await new Promise((resolve) => {
            subprocess.on("close", resolve);
            console.log("installed uv");
          });
          console.log(
            "Detected uvx pattern, transforming to python3 -m uv run",
          );
          mcpServer.command = "python3";
          // Get the tool name (first argument)
          const toolName = mcpServer.args[0];
          // Replace args with the new pattern
          mcpServer.args = [
            "-m",
            "uv",
            "run",
            toolName,
            ...mcpServer.args.slice(1),
          ];
        }
        // if python is passed in the command, install the python package mentioned in args after -m with subprocess or use regex to find the package name
        else if (mcpServer.command.includes("python3")) {
          const packageName = mcpServer.args[mcpServer.args.indexOf("-m") + 1];
          console.log("installing python package", packageName);
          const subprocess = spawn("pip3", ["install", packageName]);
          subprocess.on("close", (code: number) => {
            if (code !== 0) {
              console.error(`Failed to install python package: ${code}`);
            }
          });
          // wait for the subprocess to finish
          await new Promise((resolve) => {
            subprocess.on("close", resolve);
            console.log("installed python package", packageName);
          });
        }

        transport = new StdioMCPTransport({
          command: mcpServer.command,
          args: mcpServer.args,
          env: Object.keys(env).length > 0 ? env : undefined,
        });
      } else {
        console.warn(
          `Skipping MCP server with unsupported transport type: ${mcpServer.type}`,
        );
        continue;
      }

      const mcpClient = await createMCPClient({ transport });
      mcpClients.push(mcpClient);

      const mcptools = await mcpClient.tools();

      console.log(
        `MCP tools from ${mcpServer.type} transport:`,
        Object.keys(mcptools),
      );

      // Add MCP tools to tools object
      tools = { ...tools, ...mcptools };
    } catch (error) {
      console.error("Failed to initialize MCP client:", error);
      console.error("MCP Server config:", mcpServer);
      // Continue with other servers instead of failing the entire request
    }
  }

  // Register cleanup for all clients
  if (mcpClients.length > 0) {
    req.signal.addEventListener("abort", async () => {
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
  console.log(
    "parts",
    messages.map((m) => m.parts.map((p) => p)),
  );

  // Check if the user's message contains URLs and add web search tool with domain filtering
  const userHasUrls = hasUrlsInLastUserMessage(messages);
  const allowedDomains = userHasUrls ? extractDomainsFromMessages(messages) : [];

  console.log("URLs detected in conversation:", userHasUrls);
  console.log("Allowed domains for web search:", allowedDomains);

  // Placeholder system prompt - to be updated later
  let systemPrompt = `
    ## Description

    You're a support bot for Fast USDC product. You have a knowledge base of all technical and non-technical aspects of Fast USDC Project.
    You will help anyone track transactions, support engineers and users alike in finding information about Fast USDC transactions other related items for this project.

    ---
    Fast USDC Runbook for you
    Operation How-to
    For step-by-step instructions on how to perform a task, see Fast USDC | Operation How-to
    Red Button
    We have the ability to disable Fast USDC on frontend(s), see Fast USDC | Operation How-to on how to do so
    Guidelines on when to deploy the Red Button
    These are just guidelines, if you're not sure or think situation warrants deploying the Red Button but doesn't meet the guidelines below, here's the escalation path: Runbook | User Facing Product | Catch All
    More than 5 transactions in a row or a cumulative amount of more than $20,000 were stuck in an abnormal state detailed in the next section
    Something led you to believe that the security for Fast USDC is compromised
    States and when they're abnormal
    Handy Links
    Fast USDC Transactions Dashboard
    https://github.com/Agoric/opco-subql the indexer the powers the dashboard
    Transaction Created (tx included in block)
    Abnormal if it took more than 5 minutes for a transaction to transition from included in blocks to appearing as Transaction Created on Fast USDC Transactions Dashboard

	This is likely a OCW problem, escalate by following Fast USDC | Operation How-to
    Transaction Observed (tx reported by majority of OCWs)
    Abnormal if it took more than 3 minutes for a transaction to transition from Transaction Created to Transaction Observed

	This is likely a OCW problem, escalate by following Fast USDC | Operation How-to
    Transaction Advanced (Fast USDC contract advanced the USDC to EUD)
    Note: for EVM destinations, advanced state means Fast USDC contract sent out the USDC via CCTP through Noble, but the CCTP transfer itself could still fail when transaction is advanced
    Abnormal if it took more than 2 minutes for a transaction to transition from Transaction Observed to Transaction Advanced

	This is likely a IBC relaying problem (PFM from Agoric to Noble), escalate to Crypto Crew by following Fast USDC | Operation How-to
    Transaction Disbursed (CCTP replenished the pool)
    Abnormal if it took more than 30 minutes for a transaction to transition from Transaction Advanced to Transaction Disbursed

	This could be a problem with Noble forwarding or a problem with IBC relaying (IBC from Noble to Agoric)
	If it's a Noble forwarding problem, try manually clear NFA by following Fast USDC | Operation How-to
    If it's a IBC relaying problem (Noble to Agoric), escalate to Crypto Crew by following Fast USDC | Operation How-to

    Forward Skipped
    The user requested a destination that is not supported. No OpCo UIs would do this. If a user circumvents the UI and does this, it will not be forwarded and the minted funds will remain in the settlement account. Receiving the funds would require a contract upgrade that adds support for the destination and some way to reattempt skipped forwards.

    ---

    ## Chain of Thought Process

    For any query involving Fast USDC operations, troubleshooting, or data analysis:

    1. **Analyze the request** - Identify if it's about:
       - Transaction tracking/status
       - Troubleshooting issues

    2. **Determine data sources needed**:
       - Real-time dashboards for current state
       - Google Sheets for historical analysis
       - Internal documentation for procedures

    3. **Execute information gathering**:
       - Use file_search for internal procedures/documentation
       - Reference appropriate dashboards/sheets for data
       - Apply runbook knowledge for troubleshooting
       - use MCP tools for help in diagnosing issues

    4. **Provide structured response**:
       - Direct answer to the query
       - Next steps if applicable
       - Escalation path if needed

    5. **Verify completeness**:
       - All relevant data sources checked
       - Response addresses the core question
       - Actionable information provided

    ---

    ## Input Guardrails

    ONLY RESPOND IF EXPLICITLY TAGGED IN A MESSAGE.
    - Only respond to queries related to:
      - Fast USDC Diagnostics
      - Transaction tracking and analysis
      - Politely decline unrelated questions (e.g., general trivia, external personal queries)

    ---

    ## Output Guardrails

    - Always perform file_search when internal information might be relevant
    - Use the most current data sources available (dashboards over static docs when appropriate)
    - Never guess or make up information - if uncertain, state clearly
    - Filter search results to only include directly relevant documents
    - Provide actionable information with clear next steps
    - Follow escalation procedures when issues require human intervention
    - Use MCP tools
    - Say you don't know the answer if the question is not related to agoric or fast usdc.
    - Politely refuse to know the answer if the question is financial advice.
    - If there's no relevant information gathered from contextual docs and MCP tools, suggest to tag an Agoric admin on discord or contact Agoric support.

    ---

    ## Response Templates

    **For Transaction Issues:**
    1. Check transaction state and timing
    2. Compare against normal thresholds
    3. Identify likely root cause
    4. Provide troubleshooting steps
    5. Include escalation path if needed
    6. Explain the output of MCP tool call results as it has important information

    **For Performance Queries:**
    1. Identify relevant metrics/timeframe
    2. Access appropriate data source
    3. Analyze and summarize findings
    4. Highlight any anomalies
    5. Suggest monitoring or action items

    **For System Status:**
    1. Check current system state
    2. Review recent alerts/issues
    3. Provide status summary
    4. Include relevant dashboard links
    5. Note any ongoing concerns

    ---

    ## Key Resources

    **Real-time Monitoring:**
    - agoric mcp devops server for diagnosing fast usdc issues

    ---

    ## Tone and Style

    - **Action-oriented** - provide clear but short next steps
    - **Technically accurate** - use precise and concise terminology
    - **Concise and direct** - limit responses to essential information only
    - **Bullet points over paragraphs** - use simple and short lists when possible
    - **No excessive formatting** - avoid heavy markdown styling
    - **Key facts first** - lead with the most important information
    - **Maximum 3-4 sentences**
    `;

  // Add context to system prompt if provided
  if (contextParam) {
    try {
      const context = decodeURIComponent(contextParam) || "";
      // Validate it's valid JSON
      JSON.parse(context);
      systemPrompt += `\n\nAdditional information regarding a user's profile is provided via Context: ${context}.
          For example, a user's address, or portfolio, or open positions. Instead of asking for missing
          information in a user's query, first defer to this context information and see if this suffices.`;
    } catch (error) {
      console.error("Failed to decode context parameter:", error);
    }
  }

  // Add web search instruction if URLs are detected
  if (userHasUrls && allowedDomains.length > 0) {
    systemPrompt += `\n\n## Web Search Capability

The user has provided URLs in their message: ${allowedDomains.join(', ')}

You have access to a web_search tool that will ONLY search within these specific domains. Use this tool when you need to:
- Find information from the URLs the user provided
- Get current/updated content from those websites
- Answer questions about content on those specific domains

The search is restricted to these domains only, so you cannot search the broader internet.`;
  }

  // Prepare web search tool configuration
  let webSearchTool: any = undefined;

  // Only add web search for Anthropic models (Claude) and only when URLs are detected
  if (selectedModel.includes('claude') && userHasUrls && allowedDomains.length > 0) {
    webSearchTool = {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
      allowed_domains: allowedDomains,
    };

    console.log("Web search tool enabled with config:", webSearchTool);
  }

  // If there was an error setting up MCP clients but we at least have composio tools, continue
  const result = streamText({
    model: model.languageModel(selectedModel),
    system: systemPrompt,
    messages,
    tools,
    ...(webSearchTool && { webSearch: webSearchTool }),
    maxSteps: 20,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 2048,
        },
      },
      anthropic: {
        thinking: {
          type: "enabled",
          budgetTokens: 12000,
        },
      },
    },
    onError: (error) => {
      console.error(JSON.stringify(error, null, 2));
    },
    async onFinish({ response }) {
      const allMessages = appendResponseMessages({
        messages,
        responseMessages: response.messages,
      });

      // await saveChat({
      //   id,
      //   userId,
      //   messages: allMessages,
      // });

      // const dbMessages = convertToDBMessages(allMessages, id);
      // await saveMessages({ messages: dbMessages });
      // close all mcp clients
      // for (const client of mcpClients) {
      //   await client.close();
      // }
    },
  });

  result.consumeStream();
  return result.toDataStreamResponse({
    sendReasoning: true,
    getErrorMessage: (error) => {
      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          return "Rate limit exceeded. Please try again later.";
        }
      }
      console.error(error);
      return "An error occurred.";
    },
  });
}
