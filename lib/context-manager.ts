import { generateText, type ModelMessage } from 'ai';
import { model } from '@/ai/providers';

export function estimateTokens(content: string | ModelMessage[]): number {
  if (typeof content === 'string') return Math.ceil(content.length / 3.5);

  let totalChars = 0;
  for (const msg of content) {
    // Serialize the message
    const msgStr = JSON.stringify(msg);
    totalChars += msgStr.length;

    //extra weight for tool invocations (they have significant overhead)
    if ((msg as any).toolInvocations?.length) {
      const toolCount = (msg as any).toolInvocations.length;
      totalChars += toolCount * 50; // Approximate overhead per tool call
    }
  }

  return Math.ceil(totalChars / 3.5);
}

export interface ContextManagerConfig {
  maxTokens?: number;
  keepRecentMessages?: number;
  debug?: boolean;
  systemPrompt?: string;
}

export const DEFAULT_CONTEXT_CONFIG: Required<
  Omit<ContextManagerConfig, 'contextEditConfig' | 'systemPrompt'>
> = {
  maxTokens: 100_000, // Maximum tokens before triggering summarization
  keepRecentMessages: 10,
  debug: false,
};

export interface ContextManagerResult {
  messages: ModelMessage[];
  wasSummarized: boolean;
  originalTokens: number;
  newTokens: number;
  tokensSaved: number;
  method?: 'api' | 'context-editing' | 'none';
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

function formatMessageForSummary(msg: ModelMessage): string {
  const content =
    typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
  return `${msg.role.toUpperCase()}: ${content.slice(0, 300)}`;
}

async function summarizeWithDirectAPI(
  messages: ModelMessage[],
): Promise<string> {
  const conversation = messages.map(formatMessageForSummary).join('\n');

  const result = await generateText({
    model: model.languageModel('claude-4-5-sonnet'),
    temperature: 0.3,
    maxOutputTokens: 2000,
    system: `You are summarizing a conversation about DeFi portfolio optimization and Agoric blockchain operations.

Create a structured, information-dense summary that preserves critical context for continuing the conversation:

## User Context & Goals
- Primary objectives and portfolio goals
- Risk preferences and constraints mentioned
- Specific chains, protocols, or assets of interest

## Key Data & Analysis
- Portfolio positions and allocations
- APY/TVL data points referenced
- Yield opportunities identified
- Risk assessments made

## Technical Actions & State
- MCP tools executed and their results
- API calls made and responses received
- Smart contract interactions or proposals
- Current system state or configurations

## Decisions & Next Steps
- Conclusions reached or recommendations made
- User confirmations or rejections
- Pending actions or follow-up tasks

Focus on facts, numbers, and actionable information. Omit pleasantries, acknowledgments, and repetitive explanations. Preserve exact protocol names, chain identifiers, token symbols, and numerical values.`,
    messages: [
      {
        role: 'user',
        content: `Summarize the following conversation:\n\n${conversation}`,
      },
    ],
  });

  return `[CONVERSATION SUMMARY - ${
    messages.length
  } messages compacted]\n${result.text.trim()}\n[END SUMMARY]`;
}

export async function manageContext(
  messages: ModelMessage[],
  config: ContextManagerConfig = {},
): Promise<ContextManagerResult> {
  if (messages.length === 0) {
    return {
      messages: [],
      wasSummarized: false,
      originalTokens: 0,
      newTokens: 0,
      tokensSaved: 0,
      method: 'none',
    };
  }

  const maxTokens = config.maxTokens ?? DEFAULT_CONTEXT_CONFIG.maxTokens;
  const keepRecentMessages =
    config.keepRecentMessages ?? DEFAULT_CONTEXT_CONFIG.keepRecentMessages;
  
  const messageTokens = estimateTokens(messages);
  const systemTokens = config.systemPrompt
    ? estimateTokens(config.systemPrompt)
    : 0;
  const originalTokens = messageTokens + systemTokens;

  console.log(
    `Token count: ${originalTokens}/${maxTokens}` +
      (systemTokens > 0
        ? ` (system: ${systemTokens}, messages: ${messageTokens})`
        : ''),
  );

  if (originalTokens < maxTokens) {
    return {
      messages,
      wasSummarized: false,
      originalTokens,
      newTokens: originalTokens,
      tokensSaved: 0,
      method: 'none',
    };
  }

  console.log(`Exceeded threshold (${originalTokens} > ${maxTokens})`);

  const safeSplitPoint = findSafeSplitPoint(messages, keepRecentMessages);
  const oldMessages = messages.slice(0, safeSplitPoint);
  const recentMessages = messages.slice(safeSplitPoint);

  if (oldMessages.length < 3) {
    console.log(`Too few messages (${oldMessages.length}) to summarize.`);
    return {
      messages,
      wasSummarized: false,
      originalTokens,
      newTokens: originalTokens,
      tokensSaved: 0,
      method: 'none',
    };
  }

  console.log(
    `Summarizing ${oldMessages.length} old messages, keeping ${recentMessages.length} recent...`
  );
  const summaryText = await summarizeWithDirectAPI(oldMessages);
  
  const summaryMessage: ModelMessage = { role: 'system', content: summaryText };
  const newMessages = [summaryMessage, ...recentMessages];
  const newTokens = estimateTokens(newMessages);
  const tokensSaved = originalTokens - newTokens;

  console.log(
    `Summarization done: ${originalTokens} -> ${newTokens} (saved ${tokensSaved})`,
  );

  return {
    messages: newMessages,
    wasSummarized: true,
    originalTokens,
    newTokens,
    tokensSaved,
    method: 'api',
  };
}

function findSafeSplitPoint(messages: ModelMessage[], keepRecentCount: number): number {
  const idealSplitPoint = Math.max(0, messages.length - keepRecentCount);

  if (idealSplitPoint === 0 || idealSplitPoint >= messages.length) {
    return idealSplitPoint;
  }

  for (let i = idealSplitPoint; i >= Math.max(0, idealSplitPoint - 3); i--) {
    const msg = messages[i];

    if (msg.role === 'tool') {
      for (let j = i - 1; j >= 0; j--) {
        const prevMsg = messages[j];
        if (prevMsg.role === 'assistant') {
          const content = Array.isArray(prevMsg.content) ? prevMsg.content : [];
          const hasToolCalls = Array.isArray(content) && content.some((part: any) => part.type === 'tool-call');
          if (hasToolCalls) {
            return j;
          }
        }
      }
    }

    if (msg.role === 'assistant' && i + 1 < messages.length) {
      const content = Array.isArray(msg.content) ? msg.content : [];
      const hasToolCalls = Array.isArray(content) && content.some((part: any) => part.type === 'tool-call');

      if (hasToolCalls && messages[i + 1].role === 'tool') {
        return i;
      }
    }
  }

  return idealSplitPoint;
}
