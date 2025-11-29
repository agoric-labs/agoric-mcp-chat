/**
 * Test Data for Integration Tests
 * Sample messages, contexts, and configurations
 */

import { type UIMessage } from 'ai';
import { createUserMessage, createAssistantMessage } from './test-helpers';
import { EXPECTED_MCP_SERVERS } from '@/lib/validation/chat-validation';

export const MCP_SERVERS = {
  AGORIC: EXPECTED_MCP_SERVERS.CHAT,
  YMAX: EXPECTED_MCP_SERVERS.YMAX,
  DEVOPS: EXPECTED_MCP_SERVERS.SUPPORT
} as const;

/**
 * Sample chat messages
 */
export const SAMPLE_MESSAGES = {
  SIMPLE_GREETING: createUserMessage('Hello, how are you?'),
  AGORIC_QUESTION: createUserMessage('What is Agoric?'),
  PORTFOLIO_QUERY: createUserMessage('Show me my portfolio balance'),
  YMAX_OPTIMIZATION: createUserMessage('Optimize my portfolio (pick any available from portfolio0, portfolio1, portfolio2) for maximum yield'),
  MULTI_CHAIN_QUERY: createUserMessage('Compare yields across Aave and Compound'),
  SUPPORT_QUESTION: createUserMessage('How do I set up a validator node?'),
  IBC_TRANSFER: createUserMessage('Transfer 100 USDC from Ethereum to Noble'),
  TOOL_REQUEST: createUserMessage('Use the get_wallet_balance tool'),
} as const;

/**
 * Sample conversation histories
 */
export const SAMPLE_CONVERSATIONS: Record<string, UIMessage[]> = {
  SIMPLE_EXCHANGE: [
    createUserMessage('What is BLD?'),
    createAssistantMessage('BLD is Agoric\'s native staking token used for securing the network.')
  ],

  MULTI_TURN: [
    createUserMessage('What pools are available on Aave?'),
    createAssistantMessage('Let me fetch the available Aave pools for you.'),
    createUserMessage('Show me the highest APY'),
    createAssistantMessage('The highest APY pool is currently USDC on Optimism at 5.2%.')
  ],

  WITH_CONTEXT: [
    createUserMessage('What\'s my balance?'),
    createAssistantMessage('According to your wallet, you have 1000 BLD.')
  ]
};

/**
 * Sample context objects for context parameter
 */
export const SAMPLE_CONTEXTS = {
  USER_PORTFOLIO: {
    address: 'agoric1abc123',
    portfolio: [
      { asset: 'BLD', amount: '1000', usdValue: '500' },
      { asset: 'IST', amount: '5000', usdValue: '5000' }
    ]
  },

  OPEN_POSITIONS: {
    address: 'agoric1xyz789',
    positions: [
      { protocol: 'Aave', chain: 'Optimism', asset: 'USDC', amount: '10000', apy: '5.2%' },
      { protocol: 'Compound', chain: 'Ethereum', asset: 'DAI', amount: '5000', apy: '3.8%' }
    ]
  },

  EMPTY_PORTFOLIO: {
    address: 'agoric1new000',
    portfolio: []
  }
};

/**
 * Sample AI model IDs
 *
 * IMPORTANT: This is an EXPLICIT list that must be manually synchronized.
 *
 * WHY EXPLICIT LIST (Not Auto-Generated):
 * - Developer must consciously update this when models change
 * - Tests fail if models mismatch → forces human decision
 * - Prevents silent changes (e.g., test uses wrong model without knowing)
 * - Documents which models tests are designed for
 *
 * SYNCHRONIZATION CHECK:
 * - Test suite validates this list matches actual MODELS from ai/providers.ts
 * - If mismatch detected → test fails with clear error message
 * - Developer must then decide: update providers or update tests
 *
 * TO UPDATE THIS LIST:
 * 1. Check ai/providers.ts to see current models
 * 2. Update this list to match
 * 3. Update tests if model-specific behavior changed
 */
export const SAMPLE_MODELS = {
  CLAUDE: 'claude-4-5-sonnet',
  GPT: 'gpt-4.1-mini',
  GROK: 'grok-3-mini',
  QWEN: 'qwen-qwq'
} as const;

/**
 * Expected models list for validation
 * This is the explicit list of models we expect in ai/providers.ts
 *
 * If actual MODELS array differs from this, tests will FAIL with message:
 * "Models in providers.ts have changed. Update EXPECTED_MODELS_IN_PROVIDERS."
 */
export const EXPECTED_MODELS_IN_PROVIDERS = [
  'gpt-4.1-mini',
  'claude-4-5-sonnet',
  'qwen-qwq',
  'grok-3-mini'
] as const;

/**
 * Sample MCP server configurations
 */
export const SAMPLE_MCP_CONFIGS = {
  AGORIC_SSE: {
    url: MCP_SERVERS.AGORIC,
    type: 'sse' as const,
    headers: []
  },

  YMAX_SSE: {
    url: MCP_SERVERS.YMAX,
    type: 'sse' as const,
    headers: []
  },

  DEVOPS_SSE: {
    url: MCP_SERVERS.DEVOPS,
    type: 'sse' as const,
    headers: []
  },

  LOCAL_STDIO: {
    url: '',
    type: 'stdio' as const,
    command: 'python3',
    args: ['-m', 'test_mcp_server'],
    env: []
  }
};

/**
 * Sample external API responses for Ymax
 */
export const SAMPLE_YMAX_DATA = {
  AAVE_OPTIMISM: {
    protocol: 'Aave',
    chain: 'Optimism',
    pools: [
      { asset: 'USDC', apy: 5.2, tvl: 10000000 },
      { asset: 'DAI', apy: 4.8, tvl: 5000000 }
    ]
  },

  COMPOUND_ETHEREUM: {
    protocol: 'Compound',
    chain: 'Ethereum',
    pools: [
      { asset: 'USDC', apy: 3.8, tvl: 50000000 },
      { asset: 'USDT', apy: 3.5, tvl: 30000000 }
    ]
  },

  USDN_NOBLE: {
    protocol: 'USDN',
    chain: 'Noble',
    apy: 4.5,
    tvl: 2000000
  }
};

/**
 * Expected error messages
 */
export const EXPECTED_ERRORS = {
  MISSING_USER_ID: 'User ID is required',
  INVALID_MODEL: 'Invalid model',
  MCP_CONNECTION_FAILED: 'Failed to initialize MCP client',
  STREAM_ERROR: 'Error streaming response'
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  YMAX: '/api/ymax',
  SUPPORT: '/api/support',
  CHATS: '/api/chats'
} as const;

/**
 * Test timeouts (ms)
 * NOTE: With mocked AI responses, tests are much faster (< 1 second)
 * These timeouts are kept conservative for safety but can be reduced further
 */
export const TEST_TIMEOUTS = {
  SHORT: 1000,      // 1 second (mocked responses are instant)
  MEDIUM: 2000,     // 2 seconds
  LONG: 5000,       // 5 seconds
  STREAMING: 10000  // 10 seconds for streaming (mocked, so very fast)
} as const;
