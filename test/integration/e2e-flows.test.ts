/**
 * End-to-End Flow Integration Tests
 * Tests complete user scenarios across multiple APIs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTestUserId,
  createUserMessage,
  createAssistantMessage,
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
  TEST_TIMEOUTS
} from '../utils/test-data';

describe('E2E Flow Integration Tests', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = generateTestUserId();
  });

  describe('Complete Chat Conversation Flow', () => {
    it('should handle complete multi-turn chat conversation', async () => {
      // Turn 1: Initial question
      const response1 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('What is Agoric?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.AGORIC_SSE]
        },
        { userId: testUserId }
      );

      expect(response1.status).toBe(200);
      const chunks1 = await readStreamingResponse(response1);
      const events1 = parseStreamingChunks(chunks1);
      const text1 = extractTextFromEvents(events1);

      expect(text1.length).toBeGreaterThan(0);

      // Turn 2: Follow-up question with context
      const response2 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [
            createUserMessage('What is Agoric?'),
            createAssistantMessage(text1),
            createUserMessage('Tell me more about BLD token')
          ],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.AGORIC_SSE]
        },
        { userId: testUserId }
      );

      expect(response2.status).toBe(200);
      const chunks2 = await readStreamingResponse(response2);
      const events2 = parseStreamingChunks(chunks2);

      expect(events2.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING * 3);

    it('should maintain conversation context across turns', async () => {
      const messages = [
        createUserMessage('My name is Alice'),
        createAssistantMessage('Hello Alice! Nice to meet you.'),
        createUserMessage('What is my name?')
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

      // Should remember the name
      expect(text.toLowerCase()).toContain('alice');
    }, TEST_TIMEOUTS.STREAMING);
  });

  describe('Portfolio Optimization Flow', () => {
    it('should complete full portfolio optimization workflow', async () => {
      // Step 1: Ask about available protocols
      const response1 = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('What protocols do you support?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.YMAX_SSE]
        },
        { userId: testUserId }
      );

      expect(response1.status).toBe(200);
      const chunks1 = await readStreamingResponse(response1);
      const events1 = parseStreamingChunks(chunks1);
      const text1 = extractTextFromEvents(events1);

      expect(text1.length).toBeGreaterThan(0);

      // Step 1 validation: Should mention supported protocols
      const supportedProtocols = [
        /Aave/i,
        /Compound/i,
        /Beefy/i,
        /USDN|Noble/i
      ];
      const protocolsFound = supportedProtocols.filter(pattern => pattern.test(text1)).length;
      expect(protocolsFound).toBeGreaterThanOrEqual(1);

      // Step 2: Request optimization with context
      const context = JSON.stringify({
        portfolio: [
          { asset: 'USDC', amount: '10000' },
          { asset: 'DAI', amount: '5000' }
        ]
      });

      const response2 = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [
            createUserMessage('What protocols do you support?'),
            createAssistantMessage(text1),
            createUserMessage('Optimize my portfolio (pick any available from portfolio0, portfolio1, portfolio2) for maximum yield')
          ],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.YMAX_SSE]
        },
        {
          userId: testUserId,
          queryParams: { context: encodeURIComponent(context) }
        }
      );

      expect(response2.status).toBe(200);
      const chunks2 = await readStreamingResponse(response2);
      const events2 = parseStreamingChunks(chunks2);
      const text2 = extractTextFromEvents(events2);

      expect(text2.length).toBeGreaterThan(0);

      // Step 2 validation: Should provide optimization recommendations
      const optimizationConcepts = [
        /yield|APY|return/i,                                    // Yield metrics
        /recommend|suggest|optimize/i,                          // Optimization language
        /protocol|pool|strategy|allocation/i,                   // Investment targets
        /risk|diversif/i,                                       // Risk considerations
        /\d+\.?\d*\s*%/i,                                       // Percentage values
        /Aave|Compound|Beefy|USDN/i,                           // Specific protocols
        /TVL|liquidity/i,                                       // Liquidity metrics
        /Base|Ethereum|Optimism|Arbitrum|Avalanche|Polygon/i  // Chain mentions
      ];
      const conceptsFound = optimizationConcepts.filter(pattern => pattern.test(text2)).length;
      expect(conceptsFound).toBeGreaterThanOrEqual(3);
    }, TEST_TIMEOUTS.STREAMING * 3);
  });

  describe('Support Ticket Flow', () => {
    it('should handle complete support ticket resolution', async () => {
      // Step 1: Report issue
      const response1 = await postToAPI(
        '/api/support',
        {
          messages: [createUserMessage('My Fast USDC transaction is stuck')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.DEVOPS_SSE]
        },
        { userId: testUserId }
      );

      expect(response1.status).toBe(200);
      const chunks1 = await readStreamingResponse(response1);
      const events1 = parseStreamingChunks(chunks1);
      const text1 = extractTextFromEvents(events1);

      expect(text1.length).toBeGreaterThan(0);

      // Step 2: Provide transaction details
      const response2 = await postToAPI(
        '/api/support',
        {
          messages: [
            createUserMessage('My Fast USDC transaction is stuck'),
            createAssistantMessage(text1),
            createUserMessage('The transaction has been in "Transaction Observed" state for 10 minutes')
          ],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.DEVOPS_SSE]
        },
        { userId: testUserId }
      );

      expect(response2.status).toBe(200);
      const chunks2 = await readStreamingResponse(response2);
      const events2 = parseStreamingChunks(chunks2);

      expect(events2.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING * 3);
  });

  describe('Cross-API Workflows', () => {
    it('should handle workflow spanning chat and ymax APIs', async () => {
      // Start with general chat
      const chatResponse = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('I want to maximize my yields')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(chatResponse.status).toBe(200);

      const chatChunks = await readStreamingResponse(chatResponse);
      expect(chatChunks.length).toBeGreaterThan(0);

      // Continue with ymax for optimization
      const ymaxResponse = await postToAPI(
        API_ENDPOINTS.YMAX,
        {
          messages: [createUserMessage('Show me the best yield opportunities')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.YMAX_SSE]
        },
        { userId: testUserId }
      );

      expect(ymaxResponse.status).toBe(200);

      const ymaxChunks = await readStreamingResponse(ymaxResponse);
      expect(ymaxChunks.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING * 2);
  });

  describe('MCP Server Switching', () => {
    it('should switch between MCP servers in same conversation', async () => {
      // Use Agoric MCP first
      const response1 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('What is IBC?')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.AGORIC_SSE]
        },
        { userId: testUserId }
      );

      expect(response1.status).toBe(200);
      const chunks1 = await readStreamingResponse(response1);
      expect(chunks1.length).toBeGreaterThan(0);

      // Switch to Ymax MCP
      const response2 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('What is IBC?'), createUserMessage('Show me yields')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.YMAX_SSE] // Different server
        },
        { userId: testUserId }
      );

      expect(response2.status).toBe(200);
      const chunks2 = await readStreamingResponse(response2);
      expect(chunks2.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING * 2);
  });

  describe('Model Switching', () => {
    it('should switch AI models between conversations', async () => {
      // Use Claude
      const response1 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('Hello')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response1.status).toBe(200);
      const chunks1 = await readStreamingResponse(response1);
      expect(chunks1.length).toBeGreaterThan(0);

      // Switch to GPT
      const response2 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('Hello again')],
          selectedModel: SAMPLE_MODELS.GPT, // Different model
          userId: testUserId
        },
        { userId: testUserId }
      );

      expect(response2.status).toBe(200);
      const chunks2 = await readStreamingResponse(response2);
      expect(chunks2.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING * 2);
  });

  describe('Context-Aware Conversations', () => {
    it('should use context across multiple requests', async () => {
      const context = JSON.stringify({
        address: 'agoric1test123',
        portfolio: [
          { asset: 'BLD', amount: '1000' },
          { asset: 'IST', amount: '5000' }
        ]
      });

      // Request 1: Ask about balance
      const response1 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage("What's in my portfolio?")],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        {
          userId: testUserId,
          queryParams: { context: encodeURIComponent(context) }
        }
      );

      expect(response1.status).toBe(200);
      const chunks1 = await readStreamingResponse(response1);
      const events1 = parseStreamingChunks(chunks1);
      const text1 = extractTextFromEvents(events1);

      expect(text1.toLowerCase()).toMatch(/bld|ist/);

      // Request 2: Ask follow-up using same context
      const response2 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [
            createUserMessage("What's in my portfolio?"),
            createAssistantMessage(text1),
            createUserMessage('Should I rebalance?')
          ],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId
        },
        {
          userId: testUserId,
          queryParams: { context: encodeURIComponent(context) }
        }
      );

      expect(response2.status).toBe(200);
      const chunks2 = await readStreamingResponse(response2);
      expect(chunks2.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING * 2);
  });

  describe('Error Recovery', () => {
    it('should recover from failed MCP connection and continue', async () => {
      // Try with invalid MCP server first
      const response1 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('Hello')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [
            {
              url: 'https://invalid-server.example.com/sse',
              type: 'sse',
              headers: []
            }
          ]
        },
        { userId: testUserId }
      );

      // Should still work without MCP tools
      expect(response1.status).toBe(200);

      // Retry with valid server
      const response2 = await postToAPI(
        API_ENDPOINTS.CHAT,
        {
          messages: [createUserMessage('Hello again')],
          selectedModel: SAMPLE_MODELS.CLAUDE,
          userId: testUserId,
          mcpServers: [SAMPLE_MCP_CONFIGS.AGORIC_SSE]
        },
        { userId: testUserId }
      );

      expect(response2.status).toBe(200);

      const chunks = await readStreamingResponse(response2);
      expect(chunks.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.STREAMING * 2);
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests to same endpoint', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        postToAPI(
          API_ENDPOINTS.CHAT,
          {
            messages: [createUserMessage(`Hello ${i}`)],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: `${testUserId}-${i}`
          },
          { userId: `${testUserId}-${i}` }
        )
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Read all streams
      const allChunks = await Promise.all(
        responses.map(response => readStreamingResponse(response))
      );

      allChunks.forEach(chunks => {
        expect(chunks.length).toBeGreaterThan(0);
      });
    }, TEST_TIMEOUTS.STREAMING);

    it('should handle concurrent requests to different endpoints', async () => {
      const requests = [
        postToAPI(
          API_ENDPOINTS.CHAT,
          {
            messages: [createUserMessage('Chat query')],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId
          },
          { userId: testUserId }
        ),
        postToAPI(
          API_ENDPOINTS.YMAX,
          {
            messages: [createUserMessage('Ymax query')],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId
          },
          { userId: testUserId }
        ),
        postToAPI(
          '/api/support',
          {
            messages: [createUserMessage('Support query')],
            selectedModel: SAMPLE_MODELS.CLAUDE,
            userId: testUserId
          },
          { userId: testUserId }
        )
      ];

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(isStreamingResponse(response)).toBe(true);
      });
    }, TEST_TIMEOUTS.STREAMING * 2);
  });

  describe('Long Conversation Flows', () => {
    it('should handle conversations with many turns', async () => {
      const messages = [
        createUserMessage('Question 1'),
        createAssistantMessage('Answer 1'),
        createUserMessage('Question 2'),
        createAssistantMessage('Answer 2'),
        createUserMessage('Question 3'),
        createAssistantMessage('Answer 3'),
        createUserMessage('Question 4')
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
  });
});
