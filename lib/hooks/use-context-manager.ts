import { type CoreMessage } from "ai";
import {
  manageContext,
  estimateTokens,
  type ContextManagerConfig,
  type ContextManagerResult,
} from "../context-manager";

function cleanupToolInvocations(messages: any[]): any[] {
  return messages.map((msg) => {
    if (!msg.toolInvocations?.length) return msg;
    
    const completeInvocations = msg.toolInvocations.filter(
      (inv: any) => inv.state === "result" || inv.result !== undefined
    );

    if (completeInvocations.length === 0) {
      const { toolInvocations: _, ...rest } = msg;
      return rest;
    }

    return completeInvocations.length < msg.toolInvocations.length
      ? { ...msg, toolInvocations: completeInvocations }
      : msg;
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
  const cleanedMessages = cleanupToolInvocations(result.messages);
  const newTokens = estimateTokens(cleanedMessages);

  return {
    ...result,
    messages: cleanedMessages,
    newTokens,
    tokensSaved: result.originalTokens - newTokens,
  };
}
