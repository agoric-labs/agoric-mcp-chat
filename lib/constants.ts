/**
 * Constants used throughout the application
 */

// Local storage keys
export const STORAGE_KEYS = {
  MCP_SERVERS: "mcp-servers",
  SELECTED_MCP_SERVERS: "selected-mcp-servers",
  SIDEBAR_STATE: "sidebar-state"
};

// Model context window limits (in tokens)
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "claude-4-5-sonnet": 200_000,
  "gpt-4.1-mini": 128_000,
  "qwen-qwq": 32_000,
  "grok-3-mini": 128_000,
};

// Token usage warning thresholds (percentages)
export const TOKEN_THRESHOLDS = {
  WARNING: 0.90,   // 90% - Show warning, suggest new chat
  BLOCK: 0.95,     // 95% - Block input, force new chat (5% safety buffer to prevent server errors)
} as const;

// Token usage warning levels
export enum TokenWarningLevel {
  SAFE = 'safe',
  WARNING = 'warning',
  BLOCKED = 'blocked',
} 