import { z } from "zod";

/**
 * Tool schemas sourced from ymax-mcp-server
 *
 * TODO: This duplication is temporary and will be removed once the different
 * repositories are merged into a monorepo structure.
 */

const evmChainEnum = z.enum([
    'avalanche',
    'arbitrum',
    'ethereum',
    'optimism',
    'base',
]);

const bech32Agoric = z
    .string()
    .regex(/^agoric1[0-9a-z]{38,58}$/i, 'Invalid agoric address');

const bech32Noble = z
    .string()
    .regex(/^noble1[0-9a-z]{38,58}$/i, 'Invalid noble address');

const evmAddress = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address');


export const ymaxMcptoolSchemas = {
    // --- vstorage tool example ---
    'fetch-information-from-vstorage': {
        inputSchema: z.object({
            path: z
                .string()
                .describe(
                    "The vstorage path to fetch data from (e.g., 'published.ymax0.portfolios')",
                ),
        }),
    },

    // --- Ymax tools ---
    'ymax-get-portfolio-history': {
        inputSchema: z.object({
            portfolioId: z
                .string()
                .describe('Portfolio ID to get portfolio for a specific user'),
            duration: z
                .enum(['4h', '1d', '1w', '1m', '3m', 'all'])
                .optional()
                .describe('Optional time period duration parameter'),
        }),
    },

    'ymax-get-portfolio-summary': {
        inputSchema: z.object({
            portfolioId: z
                .string()
                .describe('Portfolio ID to get portfolio summary for a specific user'),
        }),
    },

    'ymax-get-all-instruments': {
        inputSchema: z.object({}),
    },

    'ymax-get-instrument': {
        inputSchema: z.object({
            instrumentId: z
                .string()
                .describe('The ID of the instrument/pool to fetch information for'),
        }),
    },

    'ymax-get-optimization-candidates': {
        inputSchema: z.object({
            portfolioId: z
                .string()
                .describe('The ID of the portfolio to get optimization candidates for'),
            mode: z
                .string()
                .optional()
                .describe('Optional mode parameter for optimization candidates'),
        }),
    },

    'ymax-get-portfolio-by-wallet': {
        inputSchema: z.object({
            address: z
                .string()
                .describe('The wallet address to get portfolio information for'),
        }),
    },

    'ymax-portfolio-activity': {
        inputSchema: z.object({
            portfolioId: z
                .string()
                .describe('Portfolio ID to get activity information for'),
        }),
    },

    'ymax-get-portfolio-flow': {
        inputSchema: z.object({
            portfolioId: z
                .string()
                .describe('Portfolio ID to get flow information for'),
            flowId: z.string().describe('Flow ID to get specific flow details'),
        }),
    },

    // --- mintscan-tools ---
    'mintscan-search-transactions-by-hash': {
        inputSchema: z.object({
            hash: z
                .string()
                .min(1)
                .describe('Transaction hash to search for'),
        }),
    },

    'mintscan-get-network-tx-details': {
        inputSchema: z.object({
            network: z
                .string()
                .min(1)
                .describe("Mintscan network id (e.g., 'agoric')"),
            hash: z
                .string()
                .min(1)
                .describe('Transaction hash'),
            height: z
                .string()
                .optional()
                .describe('Optional block height for the tx'),
        }),
    },

    'mintscan-get-account': {
        inputSchema: z.object({
            network: z
                .string()
                .min(1)
                .describe("Mintscan network id (e.g., 'agoric')"),
            address: z
                .string()
                .min(1)
                .describe('Account address'),
        }),
    },

    'mintscan-get-address-transactions': {
        inputSchema: z.object({
            network: z
                .string()
                .min(1)
                .describe("Mintscan network id (e.g., 'agoric')"),
            address: z
                .string()
                .min(1)
                .describe('Account address'),
            take: z
                .number()
                .int()
                .positive()
                .max(200)
                .optional()
                .default(20)
                .describe(
                    'Max number of transactions to return (default 20, max 200)',
                ),
            messageType: z
                .string()
                .optional()
                .describe(
                    'Optional Cosmos SDK message type to filter by (e.g., /cosmos.bank.v1beta1.MsgSend)',
                ),
        }),
    },

    // --- Etherscan tools (DEPRECATED - Use Alchemy tools instead) ---
    // @deprecated Etherscan has been replaced with Alchemy. These schemas are kept for backwards compatibility.
    // 'etherscan-get-balance': {
    //     inputSchema: z.object({
    //         chainid: z.coerce.number().int().positive().describe('EVM chain ID (e.g., 1, 42161, 43114)'),
    //         address: z
    //             .string()
    //             .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid 0x-address')
    //             .describe('0x-prefixed 40-hex address'),
    //         tag: z.enum(['latest']).optional().default('latest').describe('Block tag (latest)'),
    //     }),
    // },

    // @deprecated Etherscan has been replaced with Alchemy. These schemas are kept for backwards compatibility.
    // 'etherscan-get-token-transfers': {
    //     inputSchema: z.object({
    //         chainid: z.coerce.number().int().positive(),
    //         address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    //         page: z.coerce.number().int().positive().optional().default(1),
    //         offset: z.coerce.number().int().positive().max(10000).optional().default(20),
    //         sort: z.enum(['asc', 'desc']).optional().default('desc'),
    //     }),
    // },

    // @deprecated Etherscan has been replaced with Alchemy. These schemas are kept for backwards compatibility.
    // 'etherscan-get-internal-transactions': {
    //     inputSchema: z.object({
    //         chainid: z.coerce.number().int().positive(),
    //         address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    //         page: z.coerce.number().int().positive().optional().default(1),
    //         offset: z.coerce.number().int().positive().max(10000).optional().default(20),
    //         sort: z.enum(['asc', 'desc']).optional().default('desc'),
    //     }),
    // },

    // @deprecated Etherscan has been replaced with Alchemy. These schemas are kept for backwards compatibility.
    // 'etherscan-get-normal-transactions': {
    //     inputSchema: z.object({
    //         chainid: z.coerce.number().int().positive(),
    //         address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    //         page: z.coerce.number().int().positive().optional().default(1),
    //         offset: z.coerce.number().int().positive().max(10000).optional().default(20),
    //         sort: z.enum(['asc', 'desc']).optional().default('desc'),
    //     }),
    // },

    // @deprecated Etherscan has been replaced with Alchemy. These schemas are kept for backwards compatibility.
    // 'etherscan-get-tx-by-hash': {
    //     inputSchema: z.object({
    //         hash: z
    //             .string()
    //             .regex(/^(?:0x)?[a-fA-F0-9]{64}$/)
    //             .describe('Transaction hash (with or without 0x)'),
    //         chainid: z.coerce.number().int().positive().optional().describe('Optional chain ID to pin the lookup'),
    //     }),
    // },

    // --- Alchemy tools ---
    'alchemy-get-balance': {
        inputSchema: z.object({
            chainid: z.coerce
                .number()
                .int()
                .positive()
                .describe(
                    'EVM chain ID: 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 43114 (Avalanche), 137 (Polygon)',
                ),
            address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid 0x-address'),
            tag: z.enum(['latest']).optional().default('latest'),
        }),
    },

    'alchemy-get-token-transfers': {
        inputSchema: z.object({
            chainid: z.coerce
                .number()
                .int()
                .positive()
                .describe(
                    'EVM chain ID: 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 43114 (Avalanche), 137 (Polygon)',
                ),
            address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
            direction: z
                .enum(['sent', 'received', 'both'])
                .optional()
                .default('both')
                .describe('Filter by transfer direction'),
            pageKeySent: z
                .string()
                .optional()
                .describe('Pagination key for sent transfers'),
            pageKeyReceived: z
                .string()
                .optional()
                .describe('Pagination key for received transfers'),
            maxCount: z.number().optional().default(100),
        }),
    },

    'alchemy-get-internal-transactions': {
        inputSchema: z.object({
            chainid: z.coerce.number().int().positive().describe('Only supported on Ethereum (1) and Polygon (137)'),
            address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
            maxCount: z.number().optional().default(100),
        }),
    },

    'alchemy-get-normal-transactions': {
        inputSchema: z.object({
            chainid: z.coerce
                .number()
                .int()
                .positive()
                .describe(
                    'EVM chain ID: 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 43114 (Avalanche), 137 (Polygon)',
                ),
            address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
            maxCount: z.number().optional().default(100),
        }),
    },

    'alchemy-get-tx-by-hash': {
        inputSchema: z.object({
            hash: z.string().regex(/^(?:0x)?[a-fA-F0-9]{64}$/),
            chainid: z.coerce
                .number()
                .int()
                .positive()
                .optional()
                .describe(
                    'Optional chain ID. If omitted, searches: 1 (Ethereum), 42161 (Arbitrum), 43114 (Avalanche), 10 (Optimism), 8453 (Base), 137 (Polygon)',
                ),
        }),
    },

    // --- Axelar tools ---
    'axelar-gmp-search': {
        inputSchema: z.object({
            size: z.coerce.number().int().positive().max(100).optional().describe('Max results to return (default per upstream or 1).'),
            sourceAddress: z.string().optional().describe('Source chain caller address (e.g., agoric1... or 0x...).'),
            address: z.string().optional().describe('Destination chain contract address (e.g., factory contract).'),
            destinationChain: z.string().optional().describe('Destination chain (e.g., avalanche | arbitrum | ethereum).'),
        }),
    },

    // --- cross-chain trace tools ---
    'fetch-portfolio-addresses': {
        inputSchema: z.object({
            portfolioPath: z
                .string()
                .describe(
                    'Full vstorage portfolio path (e.g., published.ymax0.portfolios.portfolio0 or published.ymax1.portfolios.portfolio0)'
                ),
            network: z
                .string()
                .optional()
                .default('main')
                .describe('Network to query (default: main)'),
        }),
    },

    'trace-axelar-gmp-step': {
        inputSchema: z.object({
            destChain: evmChainEnum.describe(
                'Destination chain name (avalanche, arbitrum, ethereum, optimism, base)'
            ),
            agoricAddress: bech32Agoric.describe('Source Agoric address (agoric1...)'),
            size: z
                .number()
                .optional()
                .default(1)
                .describe('Number of results to return'),
        }),
    },

    'trace-agoric-funding-ack-step': {
        inputSchema: z.object({
            agoricAddress: bech32Agoric.describe('Agoric address (agoric1...)'),
            nobleAddress: bech32Noble.describe('Noble ICA address (noble1...)'),
            take: z
                .number()
                .optional()
                .default(20)
                .describe('Number of transactions to fetch (max 20, Mintscan API limit)'),
        }),
    },

    'trace-cctp-noble-step': {
        inputSchema: z.object({
            nobleAddress: bech32Noble.describe('Noble address (noble1...)'),
            destChain: evmChainEnum.describe(
                'Destination chain name (avalananche, arbitrum, ethereum, optimism, base)'
            ),
            destinationEvmAddress: evmAddress.describe('Destination EVM address (0x...)'),
            take: z
                .number()
                .optional()
                .default(20)
                .describe('Number of transactions to fetch'),
        }),
    },

    'trace-final-evm-step': {
        inputSchema: z.object({
            destChain: evmChainEnum.describe(
                'Destination chain name (avalanche, arbitrum, ethereum, optimism, base)'
            ),
            destinationEvmAddress: evmAddress.describe('Destination EVM address (0x...)'),
            expectedAmount: z
                .string()
                .optional()
                .describe('Expected transaction amount to match'),
        }),
    },

    'trace-complete-cross-chain-flow': {
        inputSchema: z.object({
            agoricAddress: bech32Agoric.describe('Source Agoric address (agoric1...)'),
            nobleAddress: bech32Noble.describe('Noble ICA address (noble1...)'),
            destChain: evmChainEnum.describe(
                'Destination chain name (avalanche, arbitrum, ethereum, optimism, base)'
            ),
            destinationEvmAddress: evmAddress.describe('Destination EVM address (0x...)'),
            positionName: z
                .string()
                .optional()
                .describe('Position name (e.g., USDN for special handling)'),
        }),
    }
};