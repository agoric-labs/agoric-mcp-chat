import { type CoreMessage } from "ai";
import {
  manageContext,
  estimateTokens,
  type ContextManagerConfig,
  type ContextManagerResult,
} from "../context-manager";

/**
 * Filter out incomplete tool invocations (calls without results)
 * This prevents AI_MessageConversionError when passing messages to streamText
 */
function filterIncompleteToolCalls(messages: any[]): any[] {
  return messages.map((msg) => {
    if (!msg.toolInvocations || !Array.isArray(msg.toolInvocations)) {
      return msg;
    }

    const toolInvocations = msg.toolInvocations;
    
    const completeInvocations = toolInvocations.filter(
      (inv: any) => {
        return inv.state === "result" || (inv.state !== "call" && inv.result !== undefined);
      }
    );

    if (completeInvocations.length === 0) {
      const { toolInvocations: _, ...rest } = msg;
      return rest;
    }

    if (completeInvocations.length < toolInvocations.length) {
      return {
        ...msg,
        toolInvocations: completeInvocations,
      };
    }

    // All invocations are complete, return as-is
    return msg;
  });
}

export async function useContextManager(
  messages: CoreMessage[] = [],
  config?: ContextManagerConfig
): Promise<ContextManagerResult> {
  if (messages.length === 0) {
    return {
      messages: [],
      wasSummarized: false,
      originalTokens: 0,
      newTokens: 0,
      tokensSaved: 0,
      method: "none",
    };
  }

  const result = await manageContext(messages, config);

  // Filter out incomplete tool calls from managed messages
  const cleanedMessages = filterIncompleteToolCalls(result.messages);

  return {
    ...result,
    messages: cleanedMessages,
    originalTokens: result.originalTokens,
    newTokens: estimateTokens(cleanedMessages),
    tokensSaved:
      result.tokensSaved ||
      (result.originalTokens) -
        estimateTokens(cleanedMessages),
    method: result.method || "none",
  };
}
