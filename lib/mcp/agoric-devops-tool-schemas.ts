/**
 * Tool schemas sourced from agoric-mcp-devops
 *
 * TODO: This duplication is temporary and will be removed once the different
 * repositories are merged into a monorepo structure.
 */
import { z } from 'zod';

export const agoricMcpDevopsToolSchemas = {
  'fetch-betterstack-incident': {
    inputSchema: z.object({
      incident_id: z.string().describe('The incident ID to fetch details for'),
    }),
  },

  'diagnose-fast-usdc-transaction': {
    inputSchema: z.object({
      forwardingAddress: z
        .string()
        .describe('The Noble forwarding account address to diagnose'),
    }),
  },

  'diagnose-fast-usdc-transaction-from-srcTxHash-and-srcChainName': {
    inputSchema: z.object({
      srcTxHash: z.string().describe('The src txn hash/id to diagnose'),
      srcChainName: z.string().describe('The src chain name for the above txn'),
    }),
  },

  'check-destination-account-balance-noble': {
    inputSchema: z.object({
      destinationAddress: z
        .string()
        .describe('The destination account address to check'),
    }),
  },

  'check-destination-account-txs-noble': {
    inputSchema: z.object({
      destinationAddress: z
        .string()
        .describe('The destination account address to check'),
    }),
  },

  'fetch-generic-endpoint': {
    inputSchema: z.object({
      url: z.string(),
    }),
  },

  'render-webpage': {
    inputSchema: z.object({
      url: z.string().describe('The URL of the webpage to render'),
      waitFor: z
        .number()
        .optional()
        .describe(
          'Time to wait in milliseconds before capturing (default: 5000)',
        ),
      selector: z
        .string()
        .optional()
        .describe('CSS selector to wait for before capturing'),
    }),
  },

  'get-network-config': {
    inputSchema: z.object({}),
  },

  'set-network': {
    inputSchema: z.object({
      agoricNet: z
        .enum(['main', 'devnet', 'emerynet', 'local'])
        .describe(
          'Network to set ("local" will not work with remote MCP server',
        ),
    }),
  },

  'fetch-information-from-vstorage': {
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "The vstorage path to fetch data from (e.g., 'published.ymax0.portfolios')",
        ),
    }),
  },
};
