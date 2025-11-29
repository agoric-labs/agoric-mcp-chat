/**
 * API Routes Integration Tests (Mocked)
 * Tests /api/chat, /api/ymax, and /api/support endpoints with mocked AI responses
 *
 * All three routes share the same structure and logic, so we test them together
 * using parametrized tests to avoid duplication.
 *
 * NOTE: AI SDK is mocked in test/setup.ts to avoid calling live APIs, which:
 * - Saves API costs (no real AI tokens consumed)
 * - Avoids rate limits
 * - Makes tests fast and deterministic
 * - Eliminates network dependencies
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTestUserId,
  postToAPI,
  isStreamingResponse
} from '../utils/test-helpers';
import {
  API_ENDPOINTS,
  SAMPLE_MODELS,
  SAMPLE_MCP_CONFIGS,
  SAMPLE_MESSAGES,
  TEST_TIMEOUTS,
  EXPECTED_ERRORS,
  EXPECTED_MODELS_IN_PROVIDERS
} from '../utils/test-data';
import { MODELS } from '@/ai/providers';

/**
 * Test configuration for each API endpoint
 * All three endpoints have identical behavior, just different system prompts
 */
const API_CONFIGS = [
  {
    name: 'Chat API',
    endpoint: API_ENDPOINTS.CHAT,
    defaultMcpServer: SAMPLE_MCP_CONFIGS.AGORIC_SSE,
    sampleMessage: SAMPLE_MESSAGES.AGORIC_QUESTION
  },
  {
    name: 'Ymax API',
    endpoint: API_ENDPOINTS.YMAX,
    defaultMcpServer: SAMPLE_MCP_CONFIGS.YMAX_SSE,
    sampleMessage: SAMPLE_MESSAGES.YMAX_OPTIMIZATION
  },
  {
    name: 'Support API',
    endpoint: API_ENDPOINTS.SUPPORT,
    defaultMcpServer: SAMPLE_MCP_CONFIGS.DEVOPS_SSE,
    sampleMessage: SAMPLE_MESSAGES.SUPPORT_QUESTION
  }
];

/**
 * Single Source of Truth Validation
 *
 * PURPOSE: Enforce synchronization between test data and actual providers
 *
 * PHILOSOPHY:
 * - Tests should FAIL when models change (not silently adapt)
 * - Developer must CONSCIOUSLY update test data
 * - This prevents unexpected behavior from silent model substitution
 */
describe('Single Source of Truth - Model Synchronization', () => {
  it('should match expected models list with actual providers', () => {
    const actualModels = [...MODELS].sort();
    const expectedModels = [...EXPECTED_MODELS_IN_PROVIDERS].sort();

    expect(actualModels).toEqual(expectedModels);
  });

  it('should have all SAMPLE_MODELS exist in actual providers', () => {
    const sampleModelValues = Object.values(SAMPLE_MODELS);

    sampleModelValues.forEach(model => {
      expect(MODELS).toContain(model);
    });
  });
});

// Run tests for each API endpoint
API_CONFIGS.forEach(({ name, endpoint, defaultMcpServer, sampleMessage }) => {
  describe(`${name} Integration Tests`, () => {
    let testUserId: string;

    beforeEach(() => {
      testUserId = generateTestUserId();
    });

    describe('Basic Request Validation', () => {
      it('should reject requests without userId', async () => {
        const response = await postToAPI(endpoint, {
          messages: [sampleMessage],
          selectedModel: SAMPLE_MODELS.CLAUDE
        });

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toContain(EXPECTED_ERRORS.MISSING_USER_ID);
      }, TEST_TIMEOUTS.SHORT);

      it('should accept requests with valid userId', async () => {
        const response = await postToAPI(
          endpoint,
          {
            messages: [sampleMessage],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId,
            mcpServers: [defaultMcpServer]
          },
          { userId: testUserId }
        );

        expect(response.status).toBe(200);
        expect(isStreamingResponse(response)).toBe(true);
      }, TEST_TIMEOUTS.STREAMING);

      it('should handle empty messages array', async () => {
        const response = await postToAPI(
          endpoint,
          {
            messages: [],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId,
            mcpServers: [defaultMcpServer]
          },
          { userId: testUserId }
        );

        // Should still return 200 (AI can handle empty context)
        expect(response.status).toBe(200);
      }, TEST_TIMEOUTS.MEDIUM);
    });

    describe('MCP Server Integration', () => {
      it('should accept correct MCP server for endpoint', async () => {
        const response = await postToAPI(
          endpoint,
          {
            messages: [sampleMessage],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId,
            mcpServers: [defaultMcpServer]
          },
          { userId: testUserId }
        );

        expect(response.status).toBe(200);
        expect(isStreamingResponse(response)).toBe(true);
      }, TEST_TIMEOUTS.STREAMING);

      it('should reject request without MCP server', async () => {
        const response = await postToAPI(
          endpoint,
          {
            messages: [sampleMessage],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId,
            mcpServers: []
          },
          { userId: testUserId }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('MCP server is required');
      }, TEST_TIMEOUTS.MEDIUM);

      it('should reject request with wrong MCP server', async () => {
        // Use wrong MCP server for this endpoint
        const wrongServer = endpoint === API_ENDPOINTS.CHAT
          ? SAMPLE_MCP_CONFIGS.YMAX_SSE
          : SAMPLE_MCP_CONFIGS.AGORIC_SSE;

        const response = await postToAPI(
          endpoint,
          {
            messages: [sampleMessage],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId,
            mcpServers: [wrongServer]
          },
          { userId: testUserId }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid MCP server');
      }, TEST_TIMEOUTS.MEDIUM);
    });

    describe('Error Handling', () => {
      it('should handle malformed messages gracefully', async () => {
        const response = await postToAPI(
          endpoint,
          {
            messages: [{ invalid: 'message' }],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId,
            mcpServers: [defaultMcpServer]
          },
          { userId: testUserId }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid message format');
      }, TEST_TIMEOUTS.MEDIUM);

      it('should handle missing selectedModel', async () => {
        const response = await postToAPI(
          endpoint,
          {
            messages: [sampleMessage],
            userId: testUserId,
            mcpServers: [defaultMcpServer]
          },
          { userId: testUserId }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('selectedModel is required');
      }, TEST_TIMEOUTS.MEDIUM);

      it('should reject invalid selectedModel', async () => {
        const response = await postToAPI(
          endpoint,
          {
            messages: [sampleMessage],
            selectedModel: 'invalid-model-xyz',
            userId: testUserId,
            mcpServers: [defaultMcpServer]
          },
          { userId: testUserId }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid model');
      }, TEST_TIMEOUTS.MEDIUM);
    });
  });
});
