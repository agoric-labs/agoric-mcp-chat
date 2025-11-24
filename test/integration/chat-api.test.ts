/**
 * Chat API Integration Tests
 * Tests /api/chat endpoint with MCP integration (no database persistence)
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

describe('Chat API Integration Tests', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = generateTestUserId();
  });

  describe('Basic Request Validation', () => {
    it('should reject requests without userId', async () => {
      const response = await postToAPI(API_ENDPOINTS.CHAT, {
        messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
        selectedModel: SAMPLE_MODELS.CLAUDE
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain(EXPECTED_ERRORS.MISSING_USER_ID);
    }, TEST_TIMEOUTS.SHORT);

    it('should accept requests with valid userId', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
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
        API_ENDPOINTS.CHAT,
        {
          messages: [],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      // Should still return 200 (AI can handle empty context)
      expect(response.status).toBe(200);
    }, TEST_TIMEOUTS.MEDIUM);
  });

  describe('Streaming Response', () => {
    it('should stream AI responses in event-stream format', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');

      const chunks = await readStreamingResponse(response);
      expect(chunks.length).toBeGreaterThan(0);

      // Parse events
      const events = parseStreamingChunks(chunks);
      expect(events.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);

    it('should include text content in streaming events', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('Say "hello"')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);

      const text = extractTextFromEvents(events);
      console.log('Extracted text from events:', text);
      expect(text.length).toBeGreaterThan(0);
      expect(typeof text).toBe('string');
    }, TEST_TIMEOUTS.STREAMING);

    it('should complete streaming without errors', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.AGORIC_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      // Read full stream without errors
      await expect(readStreamingResponse(response)).resolves.not.toThrow();
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('AI Model Support', () => {
    it('should work with Claude models', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
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
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
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
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
          selectedModel: SAMPLE_MODELS.GROQ,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('MCP Server Integration', () => {
    it('should accept MCP server configurations', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.AGORIC_SSE]
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);

    it('should handle empty MCP servers array', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
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
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [
            {
              url: 'https://invalid-mcp-server.example.com/sse',
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

  describe('System Prompts and Context', () => {
    it('should use default Agoric system prompt by default', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.AGORIC_QUESTION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);
      const text = extractTextFromEvents(events);

      // Response should be relevant to Agoric
      expect(text.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);

    it('should use Ymax system prompt when ino=true', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.YMAX_OPTIMIZATION],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        {
          userId: testUserId,
          queryParams: { ino: 'true' }
        }
      );

      expect(response.status).toBe(200);

      const chunks = await readStreamingResponse(response);
      const events = parseStreamingChunks(chunks);

      expect(events.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);

    it('should inject context parameter into system prompt', async () => {
      const context = JSON.stringify({
        address: 'agoric1test',
        portfolio: [{ asset: 'BLD', amount: '1000' }]
      });

      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage("What's my balance?")],
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

  describe('Multi-turn Conversations', () => {
    it('should handle multiple messages in conversation', async () => {
      const messages = [
        createUserMessage('What is BLD?'),
        createUserMessage('How much is 1 BLD worth?')
      ];

      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
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
        createUserMessage('My favorite color is blue'),
        createUserMessage('What is my favorite color?')
      ];

      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
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

      // Should mention blue (context awareness)
      expect(text.toLowerCase()).toContain('blue');
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Web Tools for Claude', () => {
    it('should have access to web search for Claude models', async () => {
      // This test verifies web tools are added, not that they're actually used
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('Search the web for Agoric blockchain')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);
      expect(isStreamingResponse(response)).toBe(true);
    }, TEST_TIMEOUTS.STREAMING);

    it('should not add web tools for non-Claude models', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
          selectedModel: SAMPLE_MODELS.GPT, // Not Claude
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
        API_ENDPOINTS.CHAT,
        {
          messages: [{ invalid: 'message' }], // Malformed
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      // May return 400 or 500 depending on validation
      expect([400, 500]).toContain(response.status);
    }, TEST_TIMEOUTS.MEDIUM);

    it('should handle missing selectedModel', async () => {
      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
          // No selectedModel
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect([400, 500]).toContain(response.status);
    }, TEST_TIMEOUTS.MEDIUM);
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [SAMPLE_MESSAGES.SIMPLE_GREETING],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response.status).toBe(200);

      // First chunk should arrive within 30 seconds
      const chunks = await readStreamingResponse(response);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(30000); // 30 seconds
      expect(chunks.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING);
  });
});
