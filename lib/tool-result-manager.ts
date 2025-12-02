/**
 * Tool result size limit configuration.
 *
 * When a tool returns data exceeding this threshold, an error message is returned
 * instead of the actual data.
 * @property maxChars - Maximum characters allowed in tool result (default: 300,000 ~100k tokens)
 */
export interface ToolResultConfig {
  maxChars?: number;
}

export const CHARS_PER_TOKEN = 4;

// Size limit for tool results to prevent context window overflow
// Claude: 200k tokens total budget
// Reserve: ~100k tokens for conversation + prompts + responses
// Tool results should stay under ~100k tokens (≈300k chars)
export const DEFAULT_MAX_TOOL_RESULT_CHARS = 300_000;

export const DEFAULT_CONFIG: Required<ToolResultConfig> = {
  maxChars: DEFAULT_MAX_TOOL_RESULT_CHARS,
};

/**
 * Safely stringifies a value, handling circular references and errors.
 * @param value - The value to stringify
 * @returns Stringified JSON or error placeholder
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, val) => {
      // Handle circular references
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    });
  } catch (error) {
    return '[Unserializable: JSON.stringify failed]';
  }
}


/**
 * Processes tool results and enforces size limits.
 * @param toolName - Name of the tool (for logging and error messages)
 * @param result - The tool's raw result (string or object)
 * @param config - Optional size limit configuration (overrides defaults)
 * @returns Processed result as a string, or error message if too large
 */
export function processToolResult(
  toolName: string,
  result: unknown,
  config: ToolResultConfig = {},
): string {
  const cfg: Required<ToolResultConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const content: string =
    typeof result === 'string' ? result : safeStringify(result);

  if (content.length > cfg.maxChars) {
    const actualTokens = Math.round(content.length / CHARS_PER_TOKEN);
    const maxTokens = Math.round(cfg.maxChars / CHARS_PER_TOKEN);

    const errorMsg = JSON.stringify({
      type: 'tool-result-size-error',
      tool: toolName,
      returnedChars: content.length,
      maxAllowedChars: cfg.maxChars,
      estimatedTokens: actualTokens,
      maxAllowedTokens: maxTokens,
      message: `TOOL_RESULT_TOO_LARGE: The tool '${toolName}' returned ${content.length.toLocaleString()} characters (approximately ${actualTokens.toLocaleString()} tokens), which exceeds the maximum allowed size of ${cfg.maxChars.toLocaleString()} characters (~${maxTokens.toLocaleString()} tokens). The result cannot be processed because of context size limitations. No assumptions should be made regarding the requested data.`,
    });

    const sample = content.slice(0, 200).replace(/\n/g, ' ') + '...';
    console.error(
      `[TOOL RESULT SIZE ERROR] ${toolName}: ${content.length.toLocaleString()} chars (${actualTokens.toLocaleString()} tokens) > ${cfg.maxChars.toLocaleString()} chars limit`,
      `\nSample: ${sample}`
    );

    return errorMsg;
  }

  return content;
}

/**
 * Per-tool size limit overrides.
 * Use this to set custom size limits for specific tools that legitimately need
 * larger or smaller result sizes than the default.
 */
export const YMAX_TOOL_CONFIGS: Record<string, ToolResultConfig> = {
  // Example: 'some-tool-with-large-results': { maxChars: 500_000 },
};

/**
 * Wraps a tool execution function to automatically process and validate result sizes.
 *
 * This wrapper:
 * 1. Executes the original tool function
 * 2. Checks result size against limits from YMAX_TOOL_CONFIGS or defaults
 * 3. Returns placeholder error message if result exceeds size limit
 * 4. Catches and logs errors with tool context
 *
 * @param toolName - Name of the tool (used for logging and config lookup)
 * @param originalFn - The original async tool function to wrap
 * @returns Wrapped function that returns a processed string result or error message
 */
export function wrapToolExecution<
  TArgs extends unknown[],
  TReturn extends Promise<unknown>,
>(
  toolName: string,
  originalFn: (...args: TArgs) => TReturn,
): (...args: TArgs) => Promise<string> {
  return async (...args: TArgs): Promise<string> => {
    const config = YMAX_TOOL_CONFIGS[toolName] ?? undefined;

    try {
      const result = await originalFn(...args);
      return processToolResult(toolName, result, config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(`[Tool Execution Error] ${toolName}:`, error);

      return JSON.stringify({
        type: 'tool-execution-error',
        tool: toolName,
        error: errorMessage,
        stack: errorStack,
        message: `Tool execution failed for '${toolName}': ${errorMessage}`,
      });
    }
  };
}
