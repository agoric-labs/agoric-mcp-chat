import { streamText, generateText, type CoreMessage } from "ai";
import { getApiKey, model } from "@/ai/providers";
import Anthropic from "@anthropic-ai/sdk";

export function estimateTokens(content: string | CoreMessage[]): number {
  if (typeof content === "string") return Math.ceil(content.length / 4);
  const totalChars = content.reduce(
    (acc, msg) => acc + JSON.stringify(msg).length,
    0
  );
  return Math.ceil(totalChars / 4);
}

export interface ContextManagerConfig {
  maxTokens?: number;
  keepRecentMessages?: number;
  useSkills?: boolean;
  useContextEditing?: boolean;
  debug?: boolean;
  contextEditConfig?: ContextEditingOptions;
}

export const DEFAULT_CONTEXT_CONFIG: Required<Omit<ContextManagerConfig, 'contextEditConfig'>> = {
  maxTokens: 150_000,
  keepRecentMessages: 8,
  useSkills: false,
  useContextEditing: false,
  debug: false,
};

export interface ContextManagerResult {
  messages: CoreMessage[];
  wasSummarized: boolean;
  originalTokens: number;
  newTokens: number;
  tokensSaved: number;
  method?: "skills" | "api" | "context-editing" | "none";
}

export interface ContextEditingOptions {
  clearThinking?: {
    enabled?: boolean;
    keepThinkingTurns?: number; // default: 2
  };
  clearToolUses?: {
    enabled?: boolean;
    triggerInputTokens?: number; // default: 50k
    keepToolUses?: number; // default: 5
    clearAtLeastTokens?: number;
    excludeTools?: string[];
  };
  debug?: boolean;
}

function formatMessageForSummary(msg: CoreMessage): string {
  const content =
    typeof msg.content === "string"
      ? msg.content
      : JSON.stringify(msg.content);
  return `${msg.role.toUpperCase()}: ${content.slice(0, 300)}`;
}

/**
 * METHOD 1: Skills-based Summarization
 * 
 * How it works:
 * - Uses streamText with agent capabilities (maxSteps: 3)
 * - The AI can use tools and multi-step reasoning to create a better summary
 * - More intelligent but slower and uses more tokens
 * 
 * Best for: Complex conversations with lots of tool usage and context dependencies
 */
async function summarizeWithSkills(messages: CoreMessage[]): Promise<string> {
   throw Error("Not implemented yet");
}

/**
 * METHOD 2: Direct API Summarization (Default)
 * 
 * How it works:
 * - Uses generateText for a single-shot summary
 * - Simple prompt asking AI to compress the conversation
 * - Fast and cost-effective
 * 
 * Best for: Most use cases, good balance of speed, quality, and cost
 */
async function summarizeWithDirectAPI(messages: CoreMessage[]): Promise<string> {
  const conversation = messages.map(formatMessageForSummary).join("\n");

  const result = await generateText({
    model: model.languageModel("claude-4-5-sonnet"),
    temperature: 0.3,
    maxTokens: 2000,
    system: `You are an expert conversation summarizer specialized in DeFi and blockchain contexts.

Your task: produce a **concise narrative summary** of chat histories with minimal tokens and maximum information density.

Claude best practices:
- Be explicit and organized.
- Show reasoning flow and tool usage.
- Avoid filler or repetition.
- Output should read like a coherent debrief.

### STRUCTURE
Context → Actions → Outcomes → Current State
`,
    messages: [
      {
        role: "user",
        content: `Summarize the following conversation:\n\n${conversation}`,
      },
    ],
  });

  return `[CONVERSATION SUMMARY - ${messages.length} messages compacted]\n${result.text.trim()}\n[END SUMMARY]`;
}

/**
 * METHOD 3: Anthropic Context Editing API
 * 
 * How it works:
 * - Uses Anthropic's beta context management API
 * - Automatically removes thinking blocks and old tool calls
 * - No manual summarization needed - Claude does it internally
 * - Keeps last 2 thinking turns and 5 most recent tool uses
 * 
 * Best for: Anthropic models only, most efficient but requires beta API access
 */
export async function summarizeWithContextEditing(
  messages: CoreMessage[],
  options: ContextEditingOptions = {}
): Promise<{ messages: CoreMessage[]; tokensSaved: number }> {

  const clearThinking = {
    enabled: options.clearThinking?.enabled ?? true,
    keepThinkingTurns: options.clearThinking?.keepThinkingTurns ?? 2,
  };
  
  const clearToolUses = {
    enabled: options.clearToolUses?.enabled ?? true,
    triggerInputTokens: options.clearToolUses?.triggerInputTokens ?? 50_000,
    keepToolUses: options.clearToolUses?.keepToolUses ?? 3,
    clearAtLeastTokens: options.clearToolUses?.clearAtLeastTokens, // Optional, no default
    excludeTools: options.clearToolUses?.excludeTools,
  };
  
  const debug = options.debug ?? false;

  const apiKey = getApiKey("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY for context editing");

  const client = new Anthropic({ apiKey });

  const anthropicMessages = messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
    }));

  const systemMessage = messages.find((m) => m.role === "system");

  const edits: any[] = [];

  if (clearThinking.enabled) {
    edits.push({
      type: "clear_thinking_20251015",
      keep: { type: "thinking_turns", value: clearThinking.keepThinkingTurns ?? 2 },
    });
  }

  if (clearToolUses.enabled) {
    const toolEdit: Record<string, any> = {
      type: "clear_tool_uses_20250919",
      trigger: {
        type: "input_tokens",
        value: clearToolUses.triggerInputTokens ?? 50_000,
      },
      keep: { type: "tool_uses", value: clearToolUses.keepToolUses ?? 5 },
    };

    // Optional: minimum tokens to clear
    if (clearToolUses.clearAtLeastTokens) {
      toolEdit.clear_at_least = { type: "tokens", value: clearToolUses.clearAtLeastTokens };
    }

    // Optional: exclude specific tools from clearing
    if (clearToolUses.excludeTools?.length) {
      toolEdit.exclude = { tools: clearToolUses.excludeTools };
    }

    edits.push(toolEdit);
  }

  if (debug) {
    console.log("[ContextEditing] Invoking Anthropic Context Management...");
    console.table(
      edits.map((e) => ({
        Strategy: e.type,
        Trigger: e.trigger?.value || "-",
        Keep: JSON.stringify(e.keep),
      }))
    );
  }

  try {
    const requestParams: any = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: anthropicMessages,
      system: systemMessage?.content as string | undefined,
      betas: ["context-management-2025-06-27"],
      context_management: { edits },
    };

    // Enable thinking if clear_thinking strategy is used
    if (clearThinking.enabled) {
      requestParams.thinking = {
        type: "enabled",
        budget_tokens: 1024,
      };
    }

    await client.beta.messages.create(requestParams);

    const editedMessages: CoreMessage[] = systemMessage
      ? [systemMessage, ...anthropicMessages]
      : anthropicMessages;

    const originalTokens = estimateTokens(messages);
    const newTokens = estimateTokens(editedMessages);

    if (debug) {
      console.log(
        `[ContextEditing] Success: ${originalTokens} → ${newTokens} (saved ${
          originalTokens - newTokens
        })`
      );
    }

    return {
      messages: editedMessages,
      tokensSaved: originalTokens - newTokens,
    };
  } catch (err) {
    console.error("[ContextEditing] Failed, fallback to manual pruning:", err);
    const pruned = messages.slice(-20);
    const tokensSaved = estimateTokens(messages) - estimateTokens(pruned);
    if (debug) console.warn(`[ContextEditing] Fallback applied. Saved ${tokensSaved} tokens.`);
    return { messages: pruned, tokensSaved };
  }
}


/**
 * Main Context Manager
 * 
 * Manages conversation context by reducing token count when it exceeds limits.
 * 
 * Strategy Selection:
 * - useContextEditing=true → Method 3 (Anthropic API, most efficient)
 * - useSkills=true → Method 1 (Agent-based, most intelligent)
 * - default → Method 2 (Direct API, best balance)
 * 
 * Decision Flow:
 * 1. If tokens < maxTokens → do nothing
 * 2. If useContextEditing → use Anthropic's context editing API
 * 3. Otherwise → summarize old messages, keep recent ones
 * 4. Need at least 3 old messages to summarize (otherwise overhead > savings)
 */
export async function manageContext(
  messages: CoreMessage[],
  config: ContextManagerConfig = {}
): Promise<ContextManagerResult> {
  // Merge user config with defaults
  const maxTokens = config.maxTokens ?? DEFAULT_CONTEXT_CONFIG.maxTokens;
  const keepRecentMessages = config.keepRecentMessages ?? DEFAULT_CONTEXT_CONFIG.keepRecentMessages;
  const useSkills = config.useSkills ?? DEFAULT_CONTEXT_CONFIG.useSkills;
  const useContextEditing = config.useContextEditing ?? DEFAULT_CONTEXT_CONFIG.useContextEditing;
  const contextEditConfig = config.contextEditConfig;

  const originalTokens = estimateTokens(messages);
  console.log(`Token count: ${originalTokens}/${maxTokens}`);

  // Skip if within limit
  if (originalTokens < maxTokens) {
    return {
      messages,
      wasSummarized: false,
      originalTokens,
      newTokens: originalTokens,
      tokensSaved: 0,
      method: "none",
    };
  }

  console.log(`Exceeded threshold (${originalTokens} > ${maxTokens})`);

  if (useContextEditing) {
    console.log("context editing");
    const { messages: editedMessages, tokensSaved } =
      await summarizeWithContextEditing(messages, contextEditConfig);
    const newTokens = estimateTokens(editedMessages);
    return {
      messages: editedMessages,
      wasSummarized: true,
      originalTokens,
      newTokens,
      tokensSaved,
      method: "context-editing",
    };
  }

  const splitPoint = Math.max(0, messages.length - keepRecentMessages);
  const oldMessages = messages.slice(0, splitPoint);
  const recentMessages = messages.slice(splitPoint);

  if (oldMessages.length < 3) {
    console.log(`Too few messages (${oldMessages.length}) to summarize.`);
    return {
      messages,
      wasSummarized: false,
      originalTokens,
      newTokens: originalTokens,
      tokensSaved: 0,
      method: "none",
    };
  }

  console.log(
    `Summarizing ${oldMessages.length} old messages with ${useSkills ? "skills" : "api"}...`
  );

  const summaryText = useSkills
    ? await summarizeWithSkills(oldMessages)
    : await summarizeWithDirectAPI(oldMessages);

  console.log("\n=== SUMMARY ===");
  console.log(summaryText);
  console.log("================\n");

  const summaryMessage: CoreMessage = { role: "system", content: summaryText };
  const newMessages = [summaryMessage, ...recentMessages];
  const newTokens = estimateTokens(newMessages);
  const tokensSaved = originalTokens - newTokens;

  console.log(`Summarization done: ${originalTokens} -> ${newTokens} (saved ${tokensSaved})`);

  return {
    messages: newMessages,
    wasSummarized: true,
    originalTokens,
    newTokens,
    tokensSaved,
    method: useSkills ? "skills" : "api",
  };
}
