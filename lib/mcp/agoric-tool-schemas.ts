/**
 * Tool schemas sourced from agoric-mcp
 *
 * TODO: This duplication is temporary and will be removed once the different
 * repositories are merged into a monorepo structure.
 */
import { z } from 'zod';

const chainSchema_staking = z
  .union([z.literal('osmosis'), z.literal('noble')])
  .describe('Chain name');
const frequencySchema_staking = z
  .union([z.literal('daily'), z.literal('weekly')])
  .describe('Staking frequency');

// see https://github.com/noble-assets/express/blob/436fbc3b94c4f6ae0433b1e7e01892f4372166c5/config/fastUsdc.ts#L2
const originSchema = z
  .union([
    z.literal('ethereum'),
    z.literal('polygon'),
    z.literal('optimism'),
    z.literal('arbitrum'),
    z.literal('base'),
  ])
  .describe('Origin chain');

// see https://github.com/noble-assets/express/blob/436fbc3b94c4f6ae0433b1e7e01892f4372166c5/config/fastUsdc.ts#L12-L13
const destinationSchema = z
  .union([
    z.literal('agoric'),
    z.literal('cosmoshub'),
    z.literal('dydx'),
    z.literal('noble'),
    z.literal('omniflix'),
    z.literal('osmosis'),
    z.literal('stargaze'),
  ])
  .describe('Destination chain');

const portfolioSchema = z.string().describe('Portfolio identifier');

const positionSchema = z.string().describe('Position identifier');

const flowSchema = z.string().describe('Flow identifier');

const nobleAccountSchema = z
  .string()
  .startsWith('noble1')
  .describe('Noble account address');

const ethAccountSchema = z
  .string()
  .startsWith('0x')
  .describe('Ethereum account address');

const agoricAccountSchema = z
  .string()
  .startsWith('agoric1')
  .describe('Agoric account address');

const providerSchema = z.string().describe('Provider address');

const chainSchema = z
  .union([
    z.literal('ethereum'),
    z.literal('optimism'),
    z.literal('polygon'),
    z.literal('arbitrum'),
    z.literal('base'),
    z.literal('avalanche'),
    z.literal('noble'),
  ])
  .describe('Blockchain network name');

const protocolSchema = z
  .union([z.literal('usdn'), z.literal('aave'), z.literal('compound')])
  .describe('Protocol name');

export const agoricMcpToolSchemas = {
  'ymax-fetch-apy': {
    inputSchema: z.object({
      protocol: protocolSchema,
      chain: chainSchema,
    }),
  },

  'ymax-fetch-all-apr-historical-data': {
    inputSchema: z.object({}),
  },

  // --- Noble API Tools ---
  'ymax-fetch-noble-pool-info': {
    inputSchema: z.object({}),
  },

  'ymax-fetch-noble-holder-position': {
    inputSchema: z.object({
      provider: providerSchema,
    }),
  },

  'ymax-fetch-noble-claimable-yield': {
    inputSchema: z.object({
      account: nobleAccountSchema,
    }),
  },

  'ymax-fetch-noble-stableswap-position': {
    inputSchema: z.object({
      provider: providerSchema,
    }),
  },

  'ymax-fetch-noble-exchange-rates': {
    inputSchema: z.object({}),
  },

  'ymax-fetch-noble-openapi-specs': {
    inputSchema: z.object({}),
  },

  // --- Portfolio & Balance Tools ---
  'ymax-fetch-active-portfolios': {
    inputSchema: z.object({}),
  },

  'ymax-fetch-portfolio-flows-positions': {
    inputSchema: z.object({
      portfolio: portfolioSchema,
    }),
  },

  'ymax-fetch-portfolio-position-info': {
    inputSchema: z.object({
      portfolio: portfolioSchema,
      position: positionSchema,
    }),
  },

  'ymax-fetch-portfolio-flow-info': {
    inputSchema: z.object({
      portfolio: portfolioSchema,
      flow: flowSchema,
    }),
  },

  'ymax-fetch-portfolio-noble-remote-interchain-account-balance': {
    inputSchema: z.object({
      accountAddr: nobleAccountSchema,
    }),
  },

  'ymax-fetch-aave-v3-balance': {
    inputSchema: z.object({
      accountAddr: ethAccountSchema,
      chain: chainSchema,
    }),
  },

  'ymax-fetch-compound-v3-balance': {
    inputSchema: z.object({
      accountAddr: ethAccountSchema,
      chain: chainSchema,
    }),
  },

  'ymax-fetch-smart-wallet-info': {
    inputSchema: z.object({
      addr: agoricAccountSchema,
    }),
  },

  // --- Spend Action Tools ---
  'propose-spend-action': {
    inputSchema: z.object({
      spendActionB64: z
        .string()
        .describe(
          'Spend action blob (base64-encoded) created by another tool, such as swap-ist-to-usdc. DO NOT MODIFY.',
        ),
    }),
  },

  // --- Agoric Chain Tools ---
  'fetch-agoric-account-balance': {
    inputSchema: z.object({
      address: z.string(),
    }),
  },

  'fetch-agoric-transaction-info': {
    inputSchema: z.object({
      hash: z.string().length(64),
    }),
  },

  'fetch-agoric-user-transactions': {
    inputSchema: z.object({
      address: z.string(),
    }),
  },

  // --- Fast USDC Tools ---
  'transfer-usdc': {
    inputSchema: z.object({
      originChain: originSchema,
      destinationChain: destinationSchema,
    }),
  },

  'fetch-fast-usdc-transaction-info': {
    inputSchema: z.object({
      id: z.string(),
    }),
  },

  // --- Generic Fetch & Web Search Tools ---
  'fetch-generic-endpoint': {
    inputSchema: z.object({
      url: z.string(),
    }),
  },

  'web-search': {
    inputSchema: z.object({
      query: z.string().describe('The search query to execute'),
      count: z
        .number()
        .optional()
        .describe('Number of results to return (default: 10)'),
    }),
  },

  // --- Swap Tools ---
  'swap-ist-to-usdc': {
    inputSchema: z.object({
      dollars: z.number(),
    }),
  },

  // --- Network Config Tools ---
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

  // --- Cross-Chain Staking Tools ---
  'perform-cross-chain-staking': {
    inputSchema: z.object({
      chain: chainSchema_staking,
      frequency: frequencySchema_staking,
      onReceipt: z.string(),
      onRewards: z.string(),
    }),
  },

  // --- Vstorage & On-Chain Metadata Tools ---
  'fetch-available-registered-denoms': {
    inputSchema: z.object({}),
  },

  'fetch-contract-instances': {
    inputSchema: z.object({}),
  },

  'fetch-committees-list': {
    inputSchema: z.object({}),
  },

  'fetch-economic-committee-latest-question': {
    inputSchema: z.object({}),
  },

  'fetch-economic-committee-latest-question-outcome': {
    inputSchema: z.object({}),
  },

  'fetch-fast-usdc-fee-config': {
    inputSchema: z.object({
      usdcAmount: z.string(),
    }),
  },

  'fetch-vstorage-data': {
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "The vstorage path to fetch data from (e.g., 'published.ymax0.portfolios')",
        ),
    }),
  },

  // --- Workflow Tools ---
  'workflow-verify': {
    inputSchema: z.object({
      jsCode: z.string(),
    }),
  },

  'workflow-to-spend-action': {
    inputSchema: z.object({
      jsCode: z.string(),
      executionId: z
        .string()
        .describe('Execution ID generated by System based on the user input'),
    }),
  },

  'generate-orchestration-workflow': {
    inputSchema: z.object({
      address: z.string(),
    }),
  },
};
