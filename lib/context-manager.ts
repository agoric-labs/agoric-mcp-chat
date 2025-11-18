import { generateText, type CoreMessage } from "ai";
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
  useContextEditing?: boolean;
  debug?: boolean;
  contextEditConfig?: ContextEditingOptions;
}

export const DEFAULT_CONTEXT_CONFIG: Required<Omit<ContextManagerConfig, 'contextEditConfig'>> = {
  maxTokens: 120_000,
  keepRecentMessages: 8,
  useContextEditing: true,
  debug: false,
};

export interface ContextManagerResult {
  messages: CoreMessage[];
  wasSummarized: boolean;
  originalTokens: number;
  newTokens: number;
  tokensSaved: number;
  method?: "api" | "context-editing" | "none";
}

export interface ContextEditingOptions {
  clearThinking?: {
    enabled?: boolean;
    keepThinkingTurns?: number;
  };
  clearToolUses?: {
    enabled?: boolean;
    triggerInputTokens?: number;
    keepToolUses?: number;
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

// Helper to generate deterministic fallback IDs
const genId = () => `toolu_${Math.random().toString(36).slice(2, 16)}`;

// Convert Vercel AI messages -> Anthropic message format
function convertToAnthropicFormat(messages: CoreMessage[]): any[] {
  const anthropicMessages: any[] = [];

  for (const msg of messages.filter((m: any) => m.role !== "system")) {
    const contentText =
      typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

    if (msg.role === "assistant" && (msg as any).toolInvocations?.length) {
      const toolUseBlocks = (msg as any).toolInvocations.map((inv: any) => ({
        type: "tool_use",
        id: inv.toolCallId ?? genId(),
        name: inv.toolName,
        input: inv.args ?? {}
      }));

      anthropicMessages.push({
        role: "assistant",
        content: [
          { type: "text", text: contentText },
          ...toolUseBlocks
        ]
      });

      const toolResultBlocks = (msg as any).toolInvocations
        .filter((inv: any) => inv.result !== undefined)
        .map((inv: any) => ({
          type: "tool_result",
          tool_use_id: inv.toolCallId ?? genId(),
          content:
            typeof inv.result === "string"
              ? inv.result
              : JSON.stringify(inv.result)
        }));

      if (toolResultBlocks.length) {
        anthropicMessages.push({
          role: "user",
          content: toolResultBlocks
        });
      }
    } else {
      anthropicMessages.push({
        role: msg.role,
        content: [{ type: "text", text: contentText }]
      });
    }
  }

  return anthropicMessages;
}

// Convert Anthropic messages -> Vercel AI message format
function convertFromAnthropicFormat(anthropicMessages: any[]): CoreMessage[] {
  const converted: CoreMessage[] = [];
  let pendingToolUses: any[] = [];

  for (const msg of anthropicMessages) {
    const parts = Array.isArray(msg.content)
      ? msg.content
      : [{ type: "text", text: msg.content }];

    if (msg.role === "assistant") {
      const text = parts.find((p: any) => p.type === "text")?.text ?? "";
      const toolUses = parts.filter((p: any) => p.type === "tool_use");

      if (toolUses.length) {
        pendingToolUses = toolUses.map((tool: any) => ({
          toolCallId: tool.id,
          toolName: tool.name,
          args: tool.input,
          result: undefined
        }));

        converted.push({
          role: "assistant",
          content: text,
          toolInvocations: [...pendingToolUses]
        });
      } else {
        converted.push({ role: "assistant", content: text });
      }
      continue;
    }

    if (msg.role === "user" && pendingToolUses.length) {
      const toolResults = parts.filter((p: any) => p.type === "tool_result");

      if (toolResults.length) {
        for (const pending of pendingToolUses) {
          const match = toolResults.find(
            (r: any) => r.tool_use_id === pending.toolCallId
          );
          if (match) pending.result = match.content;
        }

        const last = converted[converted.length - 1];
        if (last?.toolInvocations) {
          last.toolInvocations = [...pendingToolUses];
        }

        pendingToolUses = [];
        continue;
      }
    }

    if (msg.role === "user") {
      const text =
        parts.find((p: any) => p.type === "text")?.text ??
        (typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content));

      converted.push({ role: "user", content: text });
    }
  }

  return converted;
}



async function summarizeWithDirectAPI(messages: CoreMessage[]): Promise<string> {
  const conversation = messages.map(formatMessageForSummary).join("\n");

  const result = await generateText({
    model: model.languageModel("claude-4-5-sonnet"),
    temperature: 0.3,
    maxTokens: 2000,
    system: `Summarize this DeFi conversation concisely. Focus on: user goals, key data/results, current portfolio state, and next actions. Avoid repetition.`,
    messages: [
      {
        role: "user",
        content: `Summarize the following conversation:\n\n${conversation}`,
      },
    ],
  });

  return `[CONVERSATION SUMMARY - ${messages.length} messages compacted]\n${result.text.trim()}\n[END SUMMARY]`;
}

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
    triggerInputTokens: options.clearToolUses?.triggerInputTokens ?? 20_000,
    keepToolUses: options.clearToolUses?.keepToolUses ?? 1,
    clearAtLeastTokens: options.clearToolUses?.clearAtLeastTokens ?? 15_000,
    excludeTools: options.clearToolUses?.excludeTools,
  };
  

  const apiKey = getApiKey("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY for context editing");

  const client = new Anthropic({ apiKey });

  // Convert to Anthropic's tool call format
  const anthropicMessages = convertToAnthropicFormat(messages);

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

    if (clearToolUses.clearAtLeastTokens) {
      toolEdit.clear_at_least = { type: "input_tokens", value: clearToolUses.clearAtLeastTokens };
    }
    if (clearToolUses.excludeTools?.length) {
      toolEdit.exclude = { tools: clearToolUses.excludeTools };
    }

    edits.push(toolEdit);
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

    if (clearThinking.enabled) {
      requestParams.thinking = { type: "enabled", budget_tokens: 1024 };
    }

    const response = await client.beta.messages.create(requestParams);
    console.log("Edit result:", JSON.stringify(response.context_management, null, 2));

    const appliedEdits = response.context_management?.applied_edits || [];

    if (appliedEdits.length === 0) {
      console.log("[ContextEditing] No edits applied");
      throw new Error("Context editing failed - no edits applied");
    }

    const editedMessages = response.messages || anthropicMessages;
    
    // Convert back to Vercel AI SDK format
    const convertedMessages = convertFromAnthropicFormat(editedMessages);
    const coreMessages: CoreMessage[] = systemMessage
      ? [systemMessage, ...convertedMessages]
      : convertedMessages;

    const originalTokens = estimateTokens(messages);
    const newTokens = estimateTokens(coreMessages);

    return {
      messages: coreMessages,
      tokensSaved: originalTokens - newTokens,
    };
  } catch (err) {
    console.error("[ContextEditing] Failed, falling back to direct summarization:", err);
    
    const keepRecentMessages = 8;
    const splitPoint = Math.max(0, messages.length - keepRecentMessages);
    const oldMessages = messages.slice(0, splitPoint);
    const recentMessages = messages.slice(splitPoint);
    
    if (oldMessages.length < 3) {
      return { messages: recentMessages, tokensSaved: 0 };
    }
    
    const summaryText = await summarizeWithDirectAPI(oldMessages);
    const summaryMessage: CoreMessage = { role: "system", content: summaryText };

    const finalMessages = [summaryMessage, ...recentMessages];
    const tokensSaved = estimateTokens(messages) - estimateTokens(finalMessages);
    
    return { messages: finalMessages, tokensSaved };
  }
}


export async function manageContext(
  messages: CoreMessage[],
  config: ContextManagerConfig = {}
): Promise<ContextManagerResult> {
  const maxTokens = config.maxTokens ?? DEFAULT_CONTEXT_CONFIG.maxTokens;
  const keepRecentMessages = config.keepRecentMessages ?? DEFAULT_CONTEXT_CONFIG.keepRecentMessages;
  const useContextEditing = config.useContextEditing ?? DEFAULT_CONTEXT_CONFIG.useContextEditing;
  const contextEditConfig = config.contextEditConfig;

  const originalTokens = estimateTokens(messages);
  console.log(`Token count: ${originalTokens}/${maxTokens}`);

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
    const { messages: editedMessages, tokensSaved } =
      await summarizeWithContextEditing(messages, { 
        ...contextEditConfig, 
      });
    return {
      messages: editedMessages,
      wasSummarized: true,
      originalTokens,
      newTokens: estimateTokens(editedMessages),
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

  console.log(`Summarizing ${oldMessages.length} old messages...`);
  const summaryText = await summarizeWithDirectAPI(oldMessages);

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
    method: "api",
  };
}
