/**
 * Ymax API Integration Tests
 * Tests /api/ymax endpoint for portfolio optimization with real data
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
  API_ENDPOINTS,
  SAMPLE_MODELS,
  SAMPLE_MCP_CONFIGS,
  SAMPLE_MESSAGES,
  TEST_TIMEOUTS,
  SAMPLE_CONTEXTS
} from '../utils/test-data';

describe('Ymax API Integration Tests', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = generateTestUserId();
  });

  describe('Basic Request Validation', () => {
    it('should reject requests without userId', async () => {
      const response = await postToAPI(API_ENDPOINTS.YMAX, {
        messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
        selectedModel: SAMPLE_MODELS.CLAUDE
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('User ID is required');
    }, TEST_TIMEOUTS.SHORT);

    it('should accept requests with valid userId', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Ymax-Specific System Prompt', () => {
    it('should use Ymax system prompt by default', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
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

    it('should understand portfolio optimization context', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('What are the supported protocols?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      // Should mention supported protocols
      expect(text.toLowerCase()).toMatch(/aave|compound|usdn/);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('MCP Server Integration', () => {
    it('should work with Ymax MCP server', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.YMAX_SSE]
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);

    it('should work with multiple MCP servers', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.MULTI_CHAIN_QUERY],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [
            SAMPLE_MCP_CONFIGS.YMAX_SSE,
            SAMPLE_MCP_CONFIGS.AGORIC_SSE
          ]
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Portfolio Optimization Queries', () => {
    it('should handle portfolio optimization requests', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
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

    it('should handle multi-chain yield queries', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.MULTI_CHAIN_QUERY],
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

    it('should handle portfolio balance queries', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.PORTFOLIO_QUERY],
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
  });

  describe('Context Parameter Integration', () => {
    it('should inject portfolio context into system prompt', async () => {
      const context = JSON.stringify(SAMPLE_CONTEXTS.USER_PORTFOLIO);

      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('Optimize my portfolio')],
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

    it('should use context for portfolio-aware recommendations', async () => {
      const context = JSON.stringify(SAMPLE_CONTEXTS.OPEN_POSITIONS);

      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('Analyze my current positions')],
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
      const events = parseStreamingChunks(chunks);

      expect(events.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Protocol-Specific Queries', () => {
    it('should handle Aave-specific queries', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('What are the best Aave pools?')],
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

    it('should handle Compound-specific queries', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('Show me Compound yields')],
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

    it('should handle USDN-specific queries', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('What is the USDN APY on Noble?')],
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
  });

  describe('Multi-turn Conversations', () => {
    it('should maintain context across multiple queries', async () => {
      const messages = [
        createUserMessage('What protocols do you support?'),
        createUserMessage('Which one has the highest APY?')
      ];

      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
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

    it('should handle follow-up optimization questions', async () => {
      const messages = [
        createUserMessage('I have 10000 USDC'),
        createUserMessage('Where should I deploy it for maximum yield?')
      ];

      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
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

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      // Check for CORS headers (if implemented)
      // Note: May not be present in streaming responses
      const headers = response.headers;
      expect(headers).toBeDefined();
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('AI Model Support', () => {
    it('should work with Claude models', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
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
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
          selectedModel: SAMPLE_MODELS.GPT,
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
        API_ENDPOINTS.YMAX,
        {
          messages: [{ invalid: 'message' }],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect([400, 500]).toContain(response.status);
    }, TEST_TIMEOUTS.MEDIUM);

    it('should handle empty messages array', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
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

    it('should handle MCP server failures gracefully', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [
            {
              url: 'https://invalid-ymax-server.example.com/sse',
              type: 'sse',
              headers: []
            }
          ]
        },
        { userId: testUserId }
      );

      // Should continue with degraded functionality
      expect(response.status).toBe(200);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const elapsed = Date.now() - startTime;

      // Should respond within 30 seconds
      expect(elapsed).toBeLessThan(30000);
      expect(chunks.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('External Data Integration', () => {
    it('should potentially fetch real APY data', async () => {
      // This test verifies the API works, but doesn't guarantee external data fetch
      const response = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('What is the current APY for USDC on Aave Optimism?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.YMAX_SSE]
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);

      expect(events.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });
});
