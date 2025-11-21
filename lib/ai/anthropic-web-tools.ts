import { anthropic } from '@ai-sdk/anthropic';

/**
 * Configuration options for Anthropic web tools
 */
export interface AnthropicWebToolsConfig {
  maxUses?: number;
  maxContentTokens?: number;
  enableCitations?: boolean;
}

/**
 * Adds Anthropic web search and web fetch tools to the provided tools object
 * Assumes the caller has already validated that the model is a Claude model.
 * 
 * @param existingTools - Existing tools object to extend
 * @param config - Optional configuration for the web tools
 * @returns Updated tools object with web tools added (if applicable)
 */
export function addAnthropicWebTools(
  existingTools: Record<string, unknown> = {},
  config: AnthropicWebToolsConfig = {}
): Record<string, unknown> {

  const {
    maxUses = 5,
    maxContentTokens = 5000,
    enableCitations = true,
  } = config;

  const webSearchTool = anthropic.tools.webSearch_20250305({
    maxUses,
  });

  const webFetchTool = anthropic.tools.webFetch_20250910({
    maxUses,
    maxContentTokens,
    citations: { enabled: enableCitations },
  });

  console.log('Added Anthropic web search and fetch tools for Claude model');

  return {
    ...existingTools,
    web_fetch: webFetchTool,
    web_search: webSearchTool,
  };
}
