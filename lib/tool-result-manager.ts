/**
 * @property maxChars - Maximum characters to include in truncated output (default: 30,000)
 * @property bypassThreshold - Content smaller than this won't be truncated, even if > maxChars (default: 100,000)
 * @property sliceRatioHead - Ratio of maxChars to allocate to head section (default: 0.4)
 * @property sliceRatioMiddle - Ratio of maxChars to allocate to middle section (default: 0.2)
 * @property sliceRatioTail - Ratio of maxChars to allocate to tail section (default: 0.4)
 *
 */
export interface ToolResultConfig {
  maxChars?: number;
  bypassThreshold?: number;
  sliceRatioHead?: number;
  sliceRatioMiddle?: number;
  sliceRatioTail?: number;
}

const DEFAULT_CONFIG: Required<ToolResultConfig> = {
  maxChars: 30_000,
  bypassThreshold: 100_000,
  sliceRatioHead: 0.4,
  sliceRatioMiddle: 0.2,
  sliceRatioTail: 0.4,
};

/**
 * Attempts to parse a string as JSON, returning null on failure.
 * Used for safely testing if content fragments are valid JSON.
 */
function tryParseSmallJson(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Attempts to find and parse a valid JSON fragment from large content.
 *
 * Samples multiple overlapping sections of the content to find parseable JSON.
 * This helps extract schema information from truncated JSON strings.
 *
 * @param content - The content to search for JSON fragments
 * @param tries - Number of sampling attempts (default: 5)
 * @returns Parsed JSON object if found, null otherwise
 */
function findJsonFragment(content: string, tries = 5): unknown | null {
  const length = content.length;
  const approxChunk = Math.floor(length / tries);

  for (let i = 0; i < tries; i++) {
    const start = i * approxChunk;
    const end = Math.min(length, start + approxChunk * 2);

    const fragment = content.slice(start, end);
    const parsed = tryParseSmallJson(fragment);

    if (parsed && typeof parsed === 'object') return parsed;
  }

  return null;
}

/**
 * Extracts schema (key names) from a sample JSON object.
 *
 * For arrays, returns keys from the first element.
 * For objects, returns top-level keys.
 *
 * @param sample - The parsed JSON sample
 * @returns Array of key names, or undefined if not extractable
 */
function extractSchema(sample: unknown): string[] | undefined {
  if (!sample || typeof sample !== 'object') return undefined;

  if (Array.isArray(sample)) {
    const first = sample[0];
    if (first && typeof first === 'object') {
      return Object.keys(first);
    }
    return [];
  }

  return Object.keys(sample);
}

/**
 * Extracts the first N characters from content.
 */
function sliceHead(content: string, size: number): string {
  return content.slice(0, size);
}

/**
 * Extracts characters from the middle of content.
 * extracts exactly 'size' characters from the center.
 */
function sliceMiddle(content: string, size: number): string {
  const start = Math.max(0, Math.floor(content.length / 2 - size / 2));
  return content.slice(start, start + size);
}

/**
 * Extracts the last N characters from content.
 */
function sliceTail(content: string, size: number): string {
  return content.slice(-size);
}

/**
 * Truncates large JSON/text content by extracting head, middle, and tail sections.
 *
 * @param content - The content to truncate
 * @param cfg - Configuration for truncation ratios
 * @param toolName - Name of the tool that produced this content (for debugging)
 * @returns JSON string with metadata and sliced content
 */
function truncateJSON(
  content: string,
  cfg: Required<ToolResultConfig>,
  toolName: string,
): string {
  const { maxChars, sliceRatioHead, sliceRatioMiddle, sliceRatioTail } = cfg;

  const headSize = Math.floor(maxChars * sliceRatioHead);
  const midSize = Math.floor(maxChars * sliceRatioMiddle);
  const tailSize = Math.floor(maxChars * sliceRatioTail);

  const head = sliceHead(content, headSize);
  const middle = sliceMiddle(content, midSize);
  const tail = sliceTail(content, tailSize);

  const parsedFragment = findJsonFragment(head);
  const schema = extractSchema(parsedFragment);

  return JSON.stringify(
    {
      _meta: {
        tool_name: toolName,
        original_size: `${content.length.toLocaleString()} chars`,
        truncated_size: `${headSize + midSize + tailSize} chars`,
        omitted_percentage: `${Math.round(
          (1 - (headSize + midSize + tailSize) / content.length) * 100,
        )}%`,
        schema,
      },
      _head: head,
      _middle: middle,
      _tail: tail,
      _note:
        'Large content detected and truncated. Showing head/middle/tail slices. Use the schema to understand the structure.',
    },
    null,
    2,
  );
}

/**
 * Truncation behavior:
 * 1. If no config provided, returns result as-is
 * 2. If content ≤ maxChars, returns as-is
 * 3. If content < bypassThreshold, returns as-is (avoids truncating moderate-sized content)
 * 4. If content ≥ bypassThreshold, applies head/middle/tail truncation
 *
 * @param toolName - Name of the tool (for logging and metadata)
 * @param result - The tool's raw result (string or object)
 * @param config - Optional truncation configuration
 * @returns Processed result as a string
 */
export function processToolResult(
  toolName: string,
  result: unknown,
  config?: ToolResultConfig,
): string {
  if (!config) {
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  const cfg: Required<ToolResultConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const content: string =
    typeof result === 'string' ? result : JSON.stringify(result);

  // Small content: return as-is
  if (content.length <= cfg.maxChars) {
    return content;
  }

  // Medium-sized content: bypass truncation if below threshold
  // This prevents truncation of moderately large but manageable responses
  if (content.length < cfg.bypassThreshold) {
    return content;
  }

  // Large content: apply truncation
  console.warn(
    `[TRUNCATION] ${toolName} → ${content.length.toLocaleString()} chars (max: ${cfg.maxChars.toLocaleString()}, threshold: ${cfg.bypassThreshold.toLocaleString()})`,
  );

  return truncateJSON(content, cfg, toolName);
}

/**
 * Add tool names here to apply custom truncation rules.
 */
export const YMAX_TOOL_CONFIGS: Record<string, ToolResultConfig> = {
  'ymax-get-all-instruments': { maxChars: 30_000 },
  'ymax-get-instrument': { maxChars: 30_000 },
};

/**
 * Wraps a tool execution function to automatically process and truncate large results.
 *
 * This wrapper:
 * 1. Executes the original tool function
 * 2. Applies truncation rules based on YMAX_TOOL_CONFIGS
 * 3. Catches and logs errors with tool context
 *
 * @param toolName - Name of the tool (used for logging and config lookup)
 * @param originalFn - The original async tool function to wrap
 * @returns Wrapped function that returns a processed string result
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
      console.error(`[Tool Execution Error] ${toolName}:`, error);
      throw error;
    }
  };
}
