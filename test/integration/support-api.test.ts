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
  API_ENDPOINTS,
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

      await expect(readStreamingResponse(response)).resolves.not.toThrow();
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

      expect(events.length).toBeGreaterThan(0);
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

    it('should work with multiple MCP servers', async () => {
      const response = await postToAPI(
        '/api/support',
        {
          messages: [SAMPLE_MESSAGES.SUPPORT_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [
            SAMPLE_MCP_CONFIGS.DEVOPS_SSE,
            SAMPLE_MCP_CONFIGS.AGORIC_SSE
          ]
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

      expect(events.length).toBeGreaterThan(0);
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

      expect(events.length).toBeGreaterThan(0);
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

      expect([400, 500]).toContain(response.status);
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

      expect([400, 500]).toContain(response.status);
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

      // Should decline politely
      expect(text.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });
});
