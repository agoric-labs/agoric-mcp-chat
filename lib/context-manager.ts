import { generateText, type ModelMessage } from 'ai';
import { model } from '@/ai/providers';
import { TOKEN_CONFIG } from './token-config';
import { estimateTokens, estimateToolSchemaTokens } from './token-estimation';

// Split point search constants
const TOOL_BOUNDARY_SEARCH_WINDOW = 3; // Max messages to search back when looking for matching tool-call boundaries

// System prompt for conversation summarization
const SUMMARIZATION_SYSTEM_PROMPT = `You are summarizing a conversation about DeFi portfolio optimization and Agoric blockchain operations.

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

Focus on facts, numbers, and actionable information. Omit pleasantries, acknowledgments, and repetitive explanations. Preserve exact protocol names, chain identifiers, token symbols, and numerical values.`;

export interface ContextManagerConfig {
  maxTokens?: number;
  keepRecentMessages?: number;
  systemPrompt?: string;
  toolCount?: number;
}

const DEFAULT_CONTEXT_CONFIG = {
  maxTokens: TOKEN_CONFIG.MAX_CONTEXT_TOKENS,
  keepRecentMessages: TOKEN_CONFIG.KEEP_RECENT_MESSAGES,
};

export enum ContextMethod {
  API = 'api',
  NONE = 'none',
}

export interface ContextManagerResult {
  messages: ModelMessage[];
  summarized: boolean;
  originalTokens: number;
  newTokens: number;
  tokensSaved: number;
  method: ContextMethod;
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
    model: model.languageModel('claude-4-5-haiku'),
    maxOutputTokens: TOKEN_CONFIG.SUMMARY_MAX_OUTPUT_TOKENS,
    system: SUMMARIZATION_SYSTEM_PROMPT,
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
      summarized: false,
      originalTokens: 0,
      newTokens: 0,
      tokensSaved: 0,
      method: ContextMethod.NONE,
    };
  }

  const maxTokens = config.maxTokens ?? DEFAULT_CONTEXT_CONFIG.maxTokens;
  const keepRecentMessages = config.keepRecentMessages ?? DEFAULT_CONTEXT_CONFIG.keepRecentMessages;

  const systemTokens = config.systemPrompt ? estimateTokens(config.systemPrompt) : 0;
  const messageTokens = estimateTokens(messages);
  const toolSchemaTokens = config.toolCount ? estimateToolSchemaTokens(config.toolCount) : 0;
  const estimatedTokens = systemTokens + messageTokens + toolSchemaTokens;

  console.log(`[Context] Estimated ${estimatedTokens}/${maxTokens} tokens`);

  if (estimatedTokens < maxTokens) {
    return {
      messages,
      summarized: false,
      originalTokens: estimatedTokens,
      newTokens: estimatedTokens,
      tokensSaved: 0,
      method: ContextMethod.NONE,
    };
  }

  console.log(`[Context] Exceeded threshold, triggering summarization`);

  const safeSplitPoint = findSafeSplitPoint(messages, keepRecentMessages);
  const oldMessages = messages.slice(0, safeSplitPoint);
  const recentMessages = messages.slice(safeSplitPoint);

  if (oldMessages.length < 3) {
    console.log(`[Context] Too few messages to summarize`);
    return {
      messages,
      summarized: false,
      originalTokens: estimatedTokens,
      newTokens: estimatedTokens,
      tokensSaved: 0,
      method: ContextMethod.NONE,
    };
  }

  console.log(`[Context] Summarizing ${oldMessages.length} messages, keeping ${recentMessages.length} recent`);
  const summaryText = await summarizeWithDirectAPI(oldMessages);

  const summaryMessage: ModelMessage = { role: 'system', content: summaryText };
  const newMessages = [summaryMessage, ...recentMessages];
  const newTokens = estimateTokens(newMessages);
  const tokensSaved = estimatedTokens - newTokens;

  console.log(`[Context] Summarization complete: ${estimatedTokens} → ${newTokens} (saved ${tokensSaved})`);

  return {
    messages: newMessages,
    summarized: true,
    originalTokens: estimatedTokens,
    newTokens,
    tokensSaved,
    method: ContextMethod.API,
  };
}

export function findSafeSplitPoint(messages: ModelMessage[], keepRecentCount: number): number {
  const idealSplitPoint = Math.max(0, messages.length - keepRecentCount);

  if (idealSplitPoint === 0 || idealSplitPoint >= messages.length) {
    return idealSplitPoint;
  }

  const searchWindowStart = Math.max(0, idealSplitPoint - TOOL_BOUNDARY_SEARCH_WINDOW);

  for (let i = idealSplitPoint; i >= searchWindowStart; i--) {
    const msg = messages[i];

    if (msg.role === 'tool') {
      for (let j = i - 1; j >= searchWindowStart; j--) {
        const prevMsg = messages[j];
        if (prevMsg.role === 'assistant') {
          const content = Array.isArray(prevMsg.content) ? prevMsg.content : [];
          const hasToolCalls = Array.isArray(content) && content.some((part) => part.type === 'tool-call');
          if (hasToolCalls) {
            return j;
          }
        }
      }
    }

    if (msg.role === 'assistant' && i + 1 < messages.length) {
      const content = Array.isArray(msg.content) ? msg.content : [];
      const hasToolCalls = Array.isArray(content) && content.some((part) => part.type === 'tool-call');

      if (hasToolCalls && messages[i + 1].role === 'tool') {
        return i;
      }
    }
  }

  return idealSplitPoint;
}
