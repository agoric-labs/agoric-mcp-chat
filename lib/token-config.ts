export const TOKEN_CONFIG = {
  MAX_CONTEXT_TOKENS: 70_000,
  CONTEXT_WARNING_THRESHOLD: 0.9,
  HIGH_USAGE_THRESHOLD: 80_000,
  KEEP_RECENT_MESSAGES: 8,
  SUMMARY_MAX_OUTPUT_TOKENS: 2000,
} as const;

export function shouldWarnContextUsage(currentTokens: number): boolean {
  return (
    currentTokens >
    TOKEN_CONFIG.MAX_CONTEXT_TOKENS * TOKEN_CONFIG.CONTEXT_WARNING_THRESHOLD
  );
}

export function getContextUtilization(currentTokens: number): number {
  return (
    Math.round((currentTokens / TOKEN_CONFIG.MAX_CONTEXT_TOKENS) * 1000) / 10
  );
}

export function isHighTokenUsage(totalTokens: number): boolean {
  return totalTokens > TOKEN_CONFIG.HIGH_USAGE_THRESHOLD;
}
