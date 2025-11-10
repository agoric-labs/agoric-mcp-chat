export interface ToolSchemaSizeResult {
    /** Estimated number of tokens the tool schemas would consume */
    estimatedTokens: number;
    /** Number of tools included */
    toolCount: number;
    /** Whether the tool size is near the limit (warn but still allowed) */
    isNearLimit: boolean;
    /** Whether the tool size exceeds the safe limit (must stop execution) */
    exceedsLimit: boolean;
}

/**
 * Estimates the total token usage of a given tool schema set
 * and classifies whether it is within safe limits for LLM context windows.
 * @param tools - The tool schema set to estimate
 * @returns An object containing the estimated tokens, tool count, near limit flag, and exceeds limit flag
 */
export function checkToolSchemaSize(tools: Record<string, any>): ToolSchemaSizeResult {
    const toolCount = Object.keys(tools).length;
  const estimatedTokens = Math.ceil(JSON.stringify(tools).length / 3);

  const TOKEN_WARNING_THRESHOLD = 150_000;
  const TOKEN_ERROR_THRESHOLD = 180_000;

  if (estimatedTokens > TOKEN_ERROR_THRESHOLD) {
    console.error(`Schema too large: ~${estimatedTokens} tokens (${toolCount} tools)`);
    return { estimatedTokens, toolCount, isNearLimit: true, exceedsLimit: true };
  }

  if (estimatedTokens > TOKEN_WARNING_THRESHOLD) {
    console.warn(`Schema approaching limit: ~${estimatedTokens} tokens (${toolCount} tools)`);
    return { estimatedTokens, toolCount, isNearLimit: true, exceedsLimit: false };
  }

  console.log(`Tools loaded: ${toolCount} tools, ~${Math.round(estimatedTokens / 1000)}k tokens estimated`);
  return { estimatedTokens, toolCount, isNearLimit: false, exceedsLimit: false };
}
  