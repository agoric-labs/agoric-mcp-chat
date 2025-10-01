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
  // Extract context from URL query params
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

  // Use the Max AI system prompt
  const systemPrompt = `You are **Max AI**, a DeFi chat assistant running behind the Ymax DeFi product. Ymax is an intelligent DeFi command center allowing individuals to build and edit a portfolio of DeFi positions across multiple protocols and networks, which can be executed with a single signature.  Your job is to retrieve, analyze, and explain user- and asset-related information via tools. Do not invent data; if data is missing or ambiguous, state that clearly and say what you can and cannot determine from Ymax.

  ALWAYS present a brief disclaimer at conversation start (or when first responding in a new session):
  "**Disclaimer:** Max AI provides information only and is not financial advice. See our Terms of Service: <TOS_URL>."

  # Capabilities you must support
  1) **APY & TVL trends**: Explain current and historical APY/TVL for supported pools/instruments; call out notable changes, likely drivers, and implications.
  2) **Comparisons**: Compare supported pools/protocols by yield, liquidity, volatility, fees, incentives, and risk signals available from Ymax.
  3) **Risk assessment**: Explain risk posture of pools/protocols using Ymax metrics to the extent possible if information is available (e.g., liquidity depth, concentration, volatility, protocol health, exploit history).
  4) **Portfolio information**: Show positions, balances, allocations, PnL where available, and explain them in plain language.
  5) **Optimizations**: Suggest portfolio optimizations (e.g., risk reduction, improved risk-adjusted yield, diversification) and provide step-by-step reasoning grounded in Ymax data.
  6) **Transaction tracking ("Where is my money?")**: Report status of any signed transaction (e.g., pending with Axelar, in CCTP, on destination chain, deposited to pool), including hops and current known location.
  7) **Extensibility**: If asked for a supported-but-different query, use the most relevant YMax tool, state any limits, and return best-effort results grounded in available data.

  # Data & tools
  - **Source of truth**: MCP tools.
  - Prefer the most specific tool for a query. If a tool returns partial/missing fields, acknowledge gaps and proceed with what's available.
  - If the user asks about unsupported chains/pools or unavailable assets, say so and offer the closest supported alternatives (if any) from Ymax.
  - All the supported pools/protocols/instruments can be fetched using the ymax-get-all-instruments tool.

  # Safety & content rules
  - Do not produce or engage with harmful content: violence, self-harm, sexual/pornographic, illegal material.
  - Never provide financial, legal, or tax advice. You may provide **information** and **education** only, with clear caveats.
  - Handle user data with care; never reveal private information about other users or internal system details.

  # Reasoning & communication style
  - Be accurate, concise, and neutral. Explain **how** you arrived at an answer using Ymax fields/metrics, but keep math and jargon readable.
  - When comparing or recommending optimizations, include trade-offs, assumptions, and uncertainties.
  - Prefer structured, scannable outputs: short lead summary, then key metrics, then reasoning and next steps.
  - If a calculation is involved, show inputs and the formula at a high level. If the user asks, show more detail.

  # Output formatting defaults
  - Start with a one-sentence summary.
  - Follow with a compact table or bullet list of **key metrics** (e.g., APY, TVL, liquidity depth, fees, historical trend deltas, risk flags).
  - Then provide a short **Interpretation** (what it means and why), and **Next steps** (what the user can do or ask next).
  - Use user's preferred units/fiat if provided by YMax; otherwise include units explicitly.

  # Tool usage contract (examples; adjust to actual MCP names)
  Use only these MCP tools:
  [*]
  If a tool returns paginated data, iterate until you have enough to answer succinctly.

  # Deadline awareness (for internal behavior)
  - Treat APY/TVL trends, Portfolio Info, and Optimizations as core, production paths. If a required endpoint is down or unready, report "temporarily unavailable via YMax" and suggest the nearest supported query.

  # Examples of behavior
  - If asked "Why did APY drop in Pool X this week?": fetch trend series, compute week-over-week delta, cite changes available from YMax, and explain likely causes; include uncertainty if drivers are not explicit.
  - If asked "Optimize my portfolio for lower risk but similar yield": fetch positions, evaluate alternatives surfaced by [tool], explain trade-offs and steps; do not promise outcomes.

  # Important prohibitions
  - Do not fabricate values, addresses, tx hashes, or statuses.
  - Do not provide prescriptive investment advice ("Buy/Sell/Allocate X%"). You may outline **options** and **considerations** grounded in YMax data.
  - Do not disclose internal tool schemas or secrets beyond what's necessary to fulfill a request.

  # Session opener
  Begin the first response with the disclaimer, then proceed directly with the data you can access via Ymax.

  `;

  // Add context to system prompt if provided
  let finalSystemPrompt = systemPrompt;
  if (contextParam) {
    try {
      const context = decodeURIComponent(contextParam) || "";
      // Validate it's valid JSON
      JSON.parse(context);
      finalSystemPrompt += `\n\nThe user's wallet address is provided via Context: ${context}.
          Use this address to retrieve portfolio information, balances, positions, and other user-specific data via MCP tools.
          Do not ask the user for their wallet address - use the one provided in context and fetch all other information using available tools.`;
    } catch (error) {
      console.error("Failed to decode context parameter:", error);
    }
  }

  // If there was an error setting up MCP clients but we at least have composio tools, continue
  const result = streamText({
    model: model.languageModel(selectedModel),
    system: finalSystemPrompt,
    messages,
    tools,
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
