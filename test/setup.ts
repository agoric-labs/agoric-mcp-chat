/**
 * Vitest Setup File
 * Sets up MSW (Mock Service Worker) to intercept HTTP requests during tests
 * This prevents tests from making real API calls to AI providers
 *
 * IMPORTANT: Validation logic is imported from lib/validation/chat-validation.ts
 * This ensures tests use the SAME validation as the real API routes.
 */

import { beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  validateUserId,
  validateMessages,
  validateSelectedModel,
  validateMessageStructure,
  validateMcpServer,
  EXPECTED_MCP_SERVERS,
  type ChatRequestBody
} from '../lib/validation/chat-validation';

/**
 * Generate mock streaming response based on message content
 */
function generateMockResponse(messages: any[]): string {
  // Extract text from ALL messages (not just last one) for context awareness
  let allContent = '';
  for (const message of messages) {
    if (message?.parts) {
      const textParts = message.parts.filter((p: any) => p.type === 'text');
      allContent += textParts.map((p: any) => p.text).join(' ') + ' ';
    }
  }

  const userContent = allContent.toLowerCase();

  // Generate context-aware responses (check most specific keywords first)
  if (userContent.includes('bld')) {
    return 'BLD is the native staking token of the Agoric blockchain.';
  } else if (userContent.includes('ist')) {
    return 'IST is the native stablecoin of the Agoric blockchain.';
  } else if (userContent.includes('hello') || userContent.includes('hi') || userContent.includes('greeting')) {
    return 'Hello! How can I help you today?';
  } else if (userContent.includes('agoric')) {
    return 'Agoric is a blockchain platform that enables smart contracts written in JavaScript. It uses the Hardened JavaScript environment for secure contract execution.';
  } else if (userContent.includes('alice')) {
    return 'Your name is Alice, as you mentioned earlier.';
  } else if (userContent.includes('blue')) {
    return 'Your favorite color is blue, as you mentioned earlier.';
  } else if (userContent.includes('optimize') || (userContent.includes('portfolio') && userContent.includes('yield'))) {
    return 'Based on your portfolio analysis, I recommend the following allocation strategy:\n\n1. Aave Optimism USDC: 40% allocation (5.2% APY, $10M TVL)\n2. Compound Ethereum: 30% allocation (4.8% APY, $50M TVL)\n3. Beefy Finance: 30% allocation (6.1% APY, high risk)\n\nThis provides a balanced risk-adjusted return optimizing for both yield and liquidity.';
  } else if (userContent.includes('protocol') || userContent.includes('support')) {
    return 'We support Aave, Compound, Beefy, and USDN protocols across multiple chains including Optimism, Arbitrum, Base, Ethereum, and Polygon.';
  } else if (userContent.includes('apy') || userContent.includes('yield')) {
    return 'The current APY for USDC on Aave Optimism is 5.2%. Compound offers 4.8% APY on Ethereum. USDN on Noble offers 4.5% APY. These rates are updated in real-time based on protocol data.';
  } else if (userContent.includes('portfolio')) {
    return 'Your portfolio contains:\n- 1000 BLD tokens\n- 5000 IST stablecoins\n- Active positions in Aave Optimism (10,000 USDC at 5.2% APY)\n- Active positions in Compound Ethereum (5,000 DAI at 3.8% APY)';
  } else if (userContent.includes('balance') || userContent.includes('position')) {
    return 'Your portfolio contains:\n- 1000 BLD tokens\n- 5000 IST stablecoins\n- Active positions in Aave Optimism (10,000 USDC at 5.2% APY)\n- Active positions in Compound Ethereum (5,000 DAI at 3.8% APY)';
  } else if (userContent.includes('validator') || userContent.includes('node')) {
    return 'To set up a validator node:\n1. Install required dependencies\n2. Configure your node with the network parameters\n3. Stake the minimum BLD requirement\n4. Join the validator set through governance';
  } else if (userContent.includes('fast usdc') || userContent.includes('stuck') || userContent.includes('transaction')) {
    return 'If your Fast USDC transaction is stuck in "Transaction Observed" state:\n1. Check the transaction hash on the explorer\n2. Verify attestations have been received\n3. Contact support if stuck for more than 15 minutes\n4. Provide your transaction details for investigation';
  } else if (userContent.includes('ibc')) {
    return 'IBC (Inter-Blockchain Communication) is a protocol that enables different blockchains to communicate and transfer assets between each other in a secure and decentralized way.';
  }

  return 'This is a mock AI response. The AI SDK has been mocked to prevent real API calls during testing.';
}

/**
 * Create a streaming response in AI SDK v5 SSE format
 *
 * Uses Server-Sent Events (SSE) protocol:
 * - Prefix: `data: ` (not `0:`)
 * - Line ending: `\n\n` (double newline)
 * - Field: `delta` (not `textDelta`)
 */
function createStreamingResponse(responseText: string): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const textId = '1';

      // Lifecycle: start
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`)
      );

      // Text: start
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'text-start', id: textId })}\n\n`)
      );

      // Text: stream deltas
      const words = responseText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'text-delta', id: textId, delta: word })}\n\n`)
        );
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Text: end
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'text-end', id: textId })}\n\n`)
      );

      // Lifecycle: finish
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          type: 'finish',
          finishReason: 'stop',
          usage: {
            promptTokens: 100,
            completionTokens: words.length,
            totalTokens: 100 + words.length
          }
        })}\n\n`)
      );

      // SSE termination
      controller.enqueue(encoder.encode('[DONE]'));

      controller.close();
    }
  });
}

function createApiHandler(endpoint: string) {
  return http.post(`http://localhost:3000${endpoint}`, async ({ request }) => {
    const body = await request.json() as ChatRequestBody;

    const userIdError = validateUserId(body);
    if (userIdError) {
      return HttpResponse.json(
        { error: userIdError.error },
        { status: userIdError.status }
      );
    }

    const messagesError = validateMessages(body);
    if (messagesError) {
      return HttpResponse.json(
        { error: messagesError.error },
        { status: messagesError.status }
      );
    }

    const selectedModelError = validateSelectedModel(body);
    if (selectedModelError) {
      return HttpResponse.json(
        { error: selectedModelError.error },
        { status: selectedModelError.status }
      );
    }

    const messageStructureError = validateMessageStructure(body);
    if (messageStructureError) {
      return HttpResponse.json(
        { error: messageStructureError.error },
        { status: messageStructureError.status }
      );
    }

    let expectedMcpServer: string;
    if (endpoint === '/api/chat') {
      expectedMcpServer = EXPECTED_MCP_SERVERS.CHAT;
    } else if (endpoint === '/api/ymax') {
      expectedMcpServer = EXPECTED_MCP_SERVERS.YMAX;
    } else if (endpoint === '/api/support') {
      expectedMcpServer = EXPECTED_MCP_SERVERS.SUPPORT;
    } else {
      return HttpResponse.json({ error: 'Unknown endpoint' }, { status: 404 });
    }

    const mcpServerError = validateMcpServer(body, expectedMcpServer);
    if (mcpServerError) {
      return HttpResponse.json(
        { error: mcpServerError.error },
        { status: mcpServerError.status }
      );
    }

    const responseText = generateMockResponse(Array.isArray(body.messages) ? body.messages : []);
    const stream = createStreamingResponse(responseText);

    return new HttpResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  });
}

/**
 * MSW Request Handlers
 * These intercept HTTP requests to /api/chat, /api/ymax, /api/support
 */
const handlers = [
  createApiHandler('/api/chat'),
  createApiHandler('/api/ymax'),
  createApiHandler('/api/support')
];

// Create MSW server
const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => {
  server.listen({
    // Allow real MCP server requests to pass through (for mcp-servers.test.ts)
    onUnhandledRequest(request, print) {
      // Allow MCP server URLs to pass through
      const url = request.url;
      if (url.includes('agoric-mcp-server') ||
          url.includes('ymax-mcp-server') ||
          url.includes('agoric-mcp-devops-server')) {
        return; // Don't warn about MCP server requests
      }
      print.warning(); // Warn about other unhandled requests
    }
  });
  console.log('🔧 MSW server started - all HTTP requests will be mocked');
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
  console.log('🔧 MSW server closed');
});
