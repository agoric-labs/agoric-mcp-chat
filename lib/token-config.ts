export const TOKEN_CONFIG = {
  MAX_CONTEXT_TOKENS: 150_000,
  CONTEXT_WARNING_THRESHOLD: 0.9,
  HIGH_USAGE_THRESHOLD: 180_000,
  KEEP_RECENT_MESSAGES: 8,
  SUMMARY_MAX_OUTPUT_TOKENS: 15_000,
  // Token estimation constants
  CHARS_PER_TOKEN: 3.5, // Average characters per token (adjusted for JSON-heavy content)
  TOOL_CALL_OVERHEAD: 50, // Approximate token overhead per tool call
  TOOL_SCHEMA_OVERHEAD: 1050, // Approximate tokens per tool schema
} as const;

export function shouldWarnContextUsage(currentTokens: number): boolean {
  return (
    currentTokens >
    TOKEN_CONFIG.MAX_CONTEXT_TOKENS * TOKEN_CONFIG.CONTEXT_WARNING_THRESHOLD
  );
}

export function getContextUtilization(currentTokens: number): string {
  return ((currentTokens / TOKEN_CONFIG.MAX_CONTEXT_TOKENS) * 100).toFixed(2);
}

export function isHighTokenUsage(totalTokens: number): boolean {
  return totalTokens > TOKEN_CONFIG.HIGH_USAGE_THRESHOLD;
}
