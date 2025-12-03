import { type ModelMessage } from 'ai';
import { TOKEN_CONFIG } from './token-config';

type MessageWithTools = ModelMessage & {
  toolInvocations?: Array<unknown>;
};

export function estimateTokens(content: string | ModelMessage[]): number {
  if (typeof content === 'string') {
    return Math.ceil(content.length / TOKEN_CONFIG.CHARS_PER_TOKEN);
  }

  let totalChars = 0;
  for (const msg of content) {
    totalChars += JSON.stringify(msg).length;
    const msgWithTools = msg as MessageWithTools;
    if (msgWithTools.toolInvocations?.length) {
      totalChars += msgWithTools.toolInvocations.length * TOKEN_CONFIG.TOOL_CALL_OVERHEAD;
    }
  }

  return Math.ceil(totalChars / TOKEN_CONFIG.CHARS_PER_TOKEN);
}

export function estimateToolSchemaTokens(toolCount: number): number {
  return toolCount * TOKEN_CONFIG.TOOL_SCHEMA_OVERHEAD;
}
