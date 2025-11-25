/**
 * Support API Integration Tests
 * Tests /api/support endpoint with DevOps MCP server integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTestUserId,
  createUserMessage,
  postToAPI,
  readStreamingResponse,
  parseStreamingChunks,
  isStreamingResponse,
  extractTextFromEvents
} from '../utils/test-helpers';
import {
  SAMPLE_MODELS,
  SAMPLE_MCP_CONFIGS,
  SAMPLE_MESSAGES,
  TEST_TIMEOUTS,
  EXPECTED_ERRORS
} from '../utils/test-data';

describe('Support API Integration Tests', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = generateTestUserId();
  });

  describe('Basic Request Validation', () => {
    it('should reject requests without userId', async () => {
      const response = await postToAPI('/api/support', {
        messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
        selectedModel: SAMPLE_MODELS.CLAUDE
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain(EXPECTED_ERRORS.MISSING_USER_ID);
    }, TEST_TIMEOUTS.SHORT);

    it('should accept requests with valid userId', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);

    // Edge case: Tests API robustness when receiving empty messages array.
    // This ensures the API doesn't crash due to race conditions, UI bugs,
    // or API calls made before user input. Returning 200 indicates graceful
    // handling rather than throwing errors for this edge case.
    it('should handle empty messages array', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      // Should still return 200
      expect(response.status).toBe(200);
    }, TEST_TIMEOUTS.MEDIUM);
  });

  describe('Streaming Response', () => {
    it('should stream AI responses in event-stream format', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');

      const chunks = await readStreamingResponse(response);
      expect(chunks.length).toBeGreaterThan(0);

      const events = parseStreamingChunks(chunks);
      expect(events.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);

    it('should complete streaming without errors', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      expect(chunks.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Support-Specific System Prompt', () => {
    it('should use Fast USDC support system prompt', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('What is Fast USDC?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      expect(text.length).toBeGreaterThan(0);

      // Response should be relevant to Fast USDC context
      // Should mention Fast USDC
      expect(text).toMatch(/Fast USDC/i);

      // Should contain at least 2 key concepts from the actual Fast USDC explanation
      const fastUsdcConcepts = [
        /CCTP|Circle.*Transfer.*Protocol/i,         // CCTP bridging
        /EVM.*chains?|Ethereum|Base|Optimism|Arbitrum|Polygon/i,  // Supported chains
        /Orchestration/i,                           // Orchestration contract
        /Liquidity Pool|market maker/i,             // Liquidity mechanism
        /under.*minute|1.*minute|one.*minute/i,     // Speed benefit
        /finality|16.*minutes?|20.*minutes?/i,      // Finality timing
        /USDC|stablecoin/i                         // Asset type
      ];

      const conceptsFound = fastUsdcConcepts.filter(pattern => pattern.test(text)).length;
      expect(conceptsFound).toBeGreaterThanOrEqual(2);
    }, TEST_TIMEOUTS.STREAMING);

    it('should handle Fast USDC transaction queries', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('How do I track a Fast USDC transaction?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      expect(text.length).toBeGreaterThan(0);

      // Should mention transaction tracking methods
      const trackingConcepts = [
        /dashboard/i,                                    // Transaction dashboard
        /transaction.*ID|ID.*transaction|hash/i,        // Transaction identifier
        /state|status/i,                                // Transaction state/status
        /Fast USDC/i,                                   // Product name
        /track|monitor|check/i                          // Tracking verbs
      ];

      const conceptsFound = trackingConcepts.filter(pattern => pattern.test(text)).length;
      expect(conceptsFound).toBeGreaterThanOrEqual(2);
    }, TEST_TIMEOUTS.STREAMING);

    it('should handle troubleshooting queries', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('My transaction is stuck, what should I do?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      expect(text.length).toBeGreaterThan(0);

      // Should provide troubleshooting guidance
      const troubleshootingConcepts = [
        /check|verify|examine/i,                        // Troubleshooting verbs
        /state|status/i,                                // Check status
        /Created|Observed|Advanced|Disbursed/i,         // Transaction states
        /escalate|contact|support/i,                    // Escalation path
        /abnormal|stuck|delayed/i,                      // Problem indicators
        /minutes?|time|timing/i                         // Time thresholds
      ];

      const conceptsFound = troubleshootingConcepts.filter(pattern => pattern.test(text)).length;
      expect(conceptsFound).toBeGreaterThanOrEqual(2);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('MCP DevOps Server Integration', () => {
    it('should work with DevOps MCP server', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.DEVOPS_SSE]
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);

    it('should handle empty MCP servers array', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: []
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);

    it('should continue if MCP server connection fails', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [
            {
              url: 'https://invalid-devops-server.example.com/sse',
              type: 'sse',
              headers: []
            }
          ]
        },
        { userId: testUserId }
      );

      // Should still succeed with degraded functionality
      expect(response.status).toBe(200);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('AI Model Support', () => {
    it('should work with Claude models', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);

    it('should work with GPT models', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.GPT,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);

    it('should work with Groq models', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.GROQ,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Context Parameter', () => {
    it('should inject context parameter into system prompt', async () => {
      const context = JSON.stringify({
        transactionId: 'tx-123',
        status: 'pending',
        timestamp: '2024-01-01T00:00:00Z'
      });

      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('Check this transaction status')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        {
          userId: testUserId,
          queryParams: { context: encodeURIComponent(context) }
        }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      expect(chunks.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Fast USDC Specific Queries', () => {
    it('should handle transaction state queries', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('What are the Fast USDC transaction states?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      expect(text.length).toBeGreaterThan(0);

      // Should mention Fast USDC transaction context
      expect(text).toMatch(/Fast USDC|transaction|state/i);

      // Should contain at least 2 of the actual Fast USDC transaction states
      const actualStates = [
        /Transaction Created|Created/i,
        /Transaction Observed|Observed/i,
        /Transaction Advanced|Advanced/i,
        /Transaction Disbursed|Disbursed/i,
        /Forward Skipped|Skipped/i
      ];

      const statesFound = actualStates.filter(pattern => pattern.test(text)).length;
      expect(statesFound).toBeGreaterThanOrEqual(2);
    }, TEST_TIMEOUTS.STREAMING);

    it('should handle escalation procedure queries', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('How do I escalate a Fast USDC issue?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      expect(text.length).toBeGreaterThan(0);

      // Should mention escalation context
      expect(text).toMatch(/escalate|escalation|issue|problem/i);

      // Should contain specific escalation channels or procedures
      // At least one of: channel mentions, OCW, IBC, Noble, or contact methods
      const escalationDetails = [
        /#ops-fast-usdc|ops.*fast.*usdc/i,
        /OCW|Off-Chain Worker/i,
        /IBC.*relaying?|relaying?.*IBC/i,
        /Noble.*forwarding|forwarding.*Noble/i,
        /agoric-critical|opsgenie/i,
        /critical.*email|email.*critical/i
      ];

      const detailsFound = escalationDetails.filter(pattern => pattern.test(text)).length;
      expect(detailsFound).toBeGreaterThanOrEqual(1);
    }, TEST_TIMEOUTS.STREAMING);

    it('should handle red button queries', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('When should I deploy the red button?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      expect(text.length).toBeGreaterThan(0);

      // Should mention red button deployment
      expect(text).toMatch(/red button|deploy|fastUsdcAllowed/i);

      // Should contain at least 2 of the key deployment criteria/steps
      const deploymentDetails = [
        /5.*transactions|five.*transactions/i,              // 5 transactions threshold
        /\$20,?000|\$20K|20,?000.*dollars?/i,              // $20,000 threshold
        /stuck.*abnormal|abnormal.*state/i,                 // Stuck in abnormal state
        /security.*compromised|compromised.*security/i,     // Security compromise
        /Cloudflare.*KV|KV.*store/i,                       // Cloudflare KV store
        /deploymentParams/i,                                // deploymentParams key
        /fastUsdcAllowed.*false|false.*fastUsdcAllowed/i,  // Set to false
        /main\/network-config/i                             // Path to config
      ];

      const detailsFound = deploymentDetails.filter(pattern => pattern.test(text)).length;
      expect(detailsFound).toBeGreaterThanOrEqual(2);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Multi-turn Conversations', () => {
    it('should handle multiple messages in conversation', async () => {
      const messages = [
        createUserMessage('What is Fast USDC?'),
        createUserMessage('How long does a transaction take?')
      ];

      const response = await postToAPI(
        '/api/support',
        {
          messages,
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);

      expect(events.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);

    it('should maintain context across messages', async () => {
      const messages = [
        createUserMessage('I have a stuck transaction'),
        createUserMessage('What should I check first?')
      ];

      const response = await postToAPI(
        '/api/support',
        {
          messages,
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      expect(text.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Web Tools for Claude', () => {
    it('should have access to web search for Claude models', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('Search for Fast USDC documentation')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [{ invalid: 'message' }],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    }, TEST_TIMEOUTS.MEDIUM);

    it('should handle missing selectedModel', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    }, TEST_TIMEOUTS.MEDIUM);
  });

  describe('Chat ID Handling', () => {
    it('should accept optional chatId parameter', async () => {
      const chatId = 'test-support-chat-123';

      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          chatId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
    }, TEST_TIMEOUTS.STREAMING);

    it('should work without chatId parameter', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(30000); // 30 seconds
      expect(chunks.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Scope Limitations', () => {
    it('should decline unrelated questions gracefully', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('What is the weather like today?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      expect(text.length).toBeGreaterThan(0);

      // 1. Should contain refusal language indicating scope limitation
      const refusalPatterns = [
        // Direct refusal expressions
        /cannot|can't|unable to/i,
        /not (able|designed|intended) to/i,
        /outside (of )?(my|the) (scope|expertise|knowledge|support)/i,

        // Role/design limitation expressions
        /(specifically|exclusively) (designed|built|created|made) (to|for)/i,
        /role is (specifically )?(limited|designed|restricted) to/i,
        /designed (specifically |exclusively )?for Fast USDC/i,

        // Scope limitation expressions
        /focus(ed)? (exclusively )?(on|for) (Fast USDC|Agoric)/i,
        /can only (assist|help) with/i,
        /(exclusively|solely) for Fast USDC/i,
        /specialize (exclusively )?in Fast USDC/i,

        // "Only" emphasis patterns
        /Fast USDC.*only/i,
        /only.*Fast USDC/i,

        // Negative capability expressions
        /no weather|not.*weather/i,
        /can'?t (help|provide|assist) with (that|weather)/i
      ];

      const containsRefusal = refusalPatterns.some(pattern => pattern.test(text));
      expect(containsRefusal).toBe(true);

      // 2. Should offer Fast USDC support capabilities instead
      const helpfulRedirectPatterns = [
        /can help (with|you with)/i,
        /transaction.*(tracking|monitoring|diagnostics)/i,
        /troubleshooting/i,
        /dashboard/i,
        /stuck transaction/i,
        /(system|performance) monitoring/i
      ];

      const offersHelp = helpfulRedirectPatterns.some(pattern => pattern.test(text));
      expect(offersHelp).toBe(true);

      // 3. Should NOT contain weather-related content
      const weatherKeywords = /temperature|sunny|cloudy|rain|forecast|degrees|celsius|fahrenheit/i;
      expect(text).not.toMatch(weatherKeywords);
    }, TEST_TIMEOUTS.STREAMING);
  });
});
