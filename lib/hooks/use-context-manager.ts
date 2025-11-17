import { type CoreMessage } from "ai";
import {
  manageContext,
  estimateTokens,
  type ContextManagerConfig,
  type ContextManagerResult,
} from "../context-manager";

function cleanupToolInvocations(messages: any[]): any[] {
  return messages.map((msg) => {
    const invocations = msg.toolInvocations;

    if (!Array.isArray(invocations) || invocations.length === 0) {
      return msg;
    }

    const completed = invocations.filter(inv => inv.result !== undefined);

    if (completed.length === 0) {
      const { toolInvocations, ...rest } = msg;
      return rest;
    }

    if (completed.length < invocations.length) {
      return { ...msg, toolInvocations: completed };
    }

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

  const cleanedMessages = cleanupToolInvocations(messages);
  
  const result = await manageContext(cleanedMessages, config);

  return result;
}
