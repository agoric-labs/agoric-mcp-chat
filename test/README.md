# Integration Tests

Comprehensive integration test suite for the Agoric MCP Chat application.

## Overview

This test suite validates the application's core functionality **without database persistence** (database operations are currently disabled). The tests focus on:

- **MCP Server Integration** - Connection and tool execution across 3 production servers
- **API Endpoints** - Chat, Ymax, and Support API functionality
- **Streaming Responses** - AI response streaming validation
- **Multi-turn Conversations** - Context maintenance across messages
- **End-to-End Flows** - Complete user scenarios

## Test Structure

```
test/
├── integration/
│   ├── mcp-servers.test.ts      # MCP client connectivity & tools
│   ├── chat-api.test.ts         # /api/chat endpoint tests
│   ├── ymax-api.test.ts         # /api/ymax endpoint tests
│   ├── support-api.test.ts      # /api/support endpoint tests
│   └── e2e-flows.test.ts        # End-to-end user scenarios
├── utils/
│   ├── test-helpers.ts          # Reusable test utilities
│   └── test-data.ts             # Sample data & configurations
├── mcp-schema-validation.test.ts # Existing schema tests
└── test-ymax-api.js             # Existing ymax script
```

## Running Tests

### All Tests
```bash
yarn test:run                    # Run all tests
yarn test                        # Run in watch mode
yarn test:ui                     # Open Vitest UI
```

### MCP Schema Tests (Existing)
```bash
yarn test:mcp                    # MCP schema validation only
```

### Integration Tests
```bash
yarn test:integration            # All integration tests

# Individual test suites
yarn test:integration:mcp        # MCP server tests
yarn test:integration:chat       # Chat API tests
yarn test:integration:ymax       # Ymax API tests
yarn test:integration:support    # Support API tests
yarn test:integration:e2e        # E2E flow tests
```

## Test Suites

### 1. MCP Server Tests (`mcp-servers.test.ts`)

Tests MCP client connectivity and tool availability across all 3 production servers.

**What's Tested:**
- ✅ SSE transport connections
- ✅ Tool listing from each server
- ✅ Schema validation (all tools have schemas)
- ✅ Multiple concurrent MCP clients
- ✅ Connection cleanup
- ✅ Error handling (invalid URLs, timeouts)

**Servers Tested:**
- Agoric MCP Server: `https://agoric-mcp-server.agoric-core.workers.dev/sse`
- Ymax MCP Server: `https://ymax-mcp-server.agoric-core.workers.dev/sse`
- Agoric DevOps MCP Server: `https://agoric-mcp-devops-server.agoric-core.workers.dev/sse`

**Key Tests:**
```typescript
it('should connect to Agoric MCP Server via SSE')
it('should list tools from Agoric MCP Server')
it('should have all Agoric tools defined in schema')
it('should handle multiple concurrent MCP clients')
```

---

### 2. Chat API Tests (`chat-api.test.ts`)

Tests the main `/api/chat` endpoint with various configurations.

**What's Tested:**
- ✅ Request validation (userId required)
- ✅ Streaming response format
- ✅ Multiple AI models (Claude, GPT, Groq)
- ✅ MCP server integration
- ✅ System prompts (default vs INO mode)
- ✅ Context parameter injection
- ✅ Multi-turn conversations
- ✅ Web tools for Claude models
- ✅ Error handling

**Key Tests:**
```typescript
it('should reject requests without userId')
it('should stream AI responses in event-stream format')
it('should work with multiple MCP servers')
it('should use Ymax system prompt when ino=true')
it('should maintain context across messages')
```

---

### 3. Ymax API Tests (`ymax-api.test.ts`)

Tests the `/api/ymax` portfolio optimization endpoint.

**What's Tested:**
- ✅ Ymax-specific system prompt
- ✅ Portfolio optimization queries
- ✅ Multi-chain yield comparisons
- ✅ Context parameter for portfolio data
- ✅ Protocol-specific queries (Aave, Compound, USDN)
- ✅ AI model compatibility
- ✅ CORS headers
- ✅ Performance benchmarks

**Key Tests:**
```typescript
it('should use Ymax system prompt by default')
it('should handle portfolio optimization requests')
it('should handle multi-chain yield queries')
it('should inject portfolio context into system prompt')
it('should handle Aave-specific queries')
```

---

### 4. Support API Tests (`support-api.test.ts`)

Tests the `/api/support` endpoint for Fast USDC support queries.

**What's Tested:**
- ✅ Fast USDC support system prompt
- ✅ DevOps MCP server integration
- ✅ Transaction tracking queries
- ✅ Troubleshooting workflows
- ✅ Escalation procedure queries
- ✅ Multi-turn support conversations
- ✅ Scope limitations (declines unrelated questions)

**Key Tests:**
```typescript
it('should use Fast USDC support system prompt')
it('should work with DevOps MCP server')
it('should handle transaction state queries')
it('should handle escalation procedure queries')
it('should decline unrelated questions gracefully')
```

---

### 5. E2E Flow Tests (`e2e-flows.test.ts`)

Tests complete user scenarios across multiple APIs and requests.

**What's Tested:**
- ✅ Complete multi-turn conversations
- ✅ Portfolio optimization workflows
- ✅ Support ticket resolution flows
- ✅ Cross-API workflows
- ✅ MCP server switching
- ✅ AI model switching
- ✅ Context-aware conversations
- ✅ Error recovery
- ✅ Concurrent requests
- ✅ Long conversation flows

**Key Tests:**
```typescript
it('should handle complete multi-turn chat conversation')
it('should complete full portfolio optimization workflow')
it('should handle workflow spanning chat and ymax APIs')
it('should switch between MCP servers in same conversation')
it('should handle concurrent requests to different endpoints')
```

---

## Test Utilities

### `test-helpers.ts`

Reusable functions for integration testing:

```typescript
// User/Chat ID generation
generateTestUserId()
generateTestChatId()

// Message creation
createUserMessage(content)
createAssistantMessage(content)
createToolCallMessage(toolName, toolCallId, args)
createToolResultMessage(toolCallId, toolName, result)

// API requests
postToAPI(endpoint, body, options)
readStreamingResponse(response)
parseStreamingChunks(chunks)

// Response parsing
extractTextFromEvents(events)
extractToolCallsFromEvents(events)
isStreamingResponse(response)

// MCP configuration
createMCPServerConfig(url, type)
```

### `test-data.ts`

Sample data for testing:

```typescript
// MCP Server URLs
MCP_SERVERS.AGORIC
MCP_SERVERS.YMAX
MCP_SERVERS.DEVOPS

// Sample messages
SAMPLE_MESSAGES.SIMPLE_GREETING
SAMPLE_MESSAGES.AGORIC_QUESTION
SAMPLE_MESSAGES.YMAX_OPTIMIZATION
SAMPLE_MESSAGES.SUPPORT_QUESTION

// Sample AI models
SAMPLE_MODELS.CLAUDE
SAMPLE_MODELS.GPT
SAMPLE_MODELS.GROQ

// Sample contexts
SAMPLE_CONTEXTS.USER_PORTFOLIO
SAMPLE_CONTEXTS.OPEN_POSITIONS

// Test timeouts
TEST_TIMEOUTS.SHORT (5s)
TEST_TIMEOUTS.MEDIUM (15s)
TEST_TIMEOUTS.LONG (30s)
TEST_TIMEOUTS.STREAMING (60s)
```

---

## CI/CD Integration

Tests run automatically on GitHub Actions:

### Workflow: `.github/workflows/test.yml`

**Jobs:**
1. **mcp-schema-tests** - Validates MCP tool schemas (existing)
2. **integration-tests** - Runs all 5 integration test suites in parallel
3. **all-tests-passed** - Summary job (gates PR merging)

**Matrix Strategy:**
- Runs each integration test suite as a separate job
- Parallel execution for faster CI times
- Individual artifact uploads per suite

**Triggers:**
- Push to `main`, `develop`, `test/integration-test` branches
- Pull requests to `main`, `develop`

**Environment Variables:**
- `ANTHROPIC_API_KEY` (from secrets)
- `OPENAI_API_KEY` (from secrets)
- `XAI_API_KEY` (from secrets)

---

## Test Configuration

### `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    testTimeout: 60000,  // 60 seconds for network operations
    hookTimeout: 60000,
    environment: 'node',
    globals: true
  }
})
```

---

## Important Notes

### Database is Disabled

⚠️ **The application currently has database operations commented out**. These tests do NOT test:
- Chat persistence
- Message history retrieval
- Database CRUD operations
- User isolation in database

All tests validate **in-memory, session-based behavior** only.

### External Dependencies

Tests make real network requests to:
- Live MCP servers (production endpoints)
- AI provider APIs (Claude, GPT, Groq, Grok)
- External data sources (Agoric APY Worker, Noble USDN API)

This means:
- Tests require API keys in environment
- Tests may be slower due to network latency
- Tests may fail if external services are down

### Timeouts

Default timeout: **60 seconds** per test

Streaming tests are marked with `TEST_TIMEOUTS.STREAMING` (60s) to account for:
- MCP server connection time
- AI model response generation
- Network latency

---

## Writing New Tests

### Template for New Integration Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTestUserId,
  createUserMessage,
  postToAPI,
  readStreamingResponse,
  parseStreamingChunks
} from '../utils/test-helpers';
import {
  API_ENDPOINTS,
  SAMPLE_MODELS,
  TEST_TIMEOUTS
} from '../utils/test-data';

describe('My New Test Suite', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = generateTestUserId();
  });

  it('should do something', async () => {
    const response = await postToAPI(
      API_ENDPOINTS.CHAT,
      {
        messages: [createUserMessage('test')],
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
```

---

## Troubleshooting

### Tests Timeout
- Increase timeout in `vitest.config.ts`
- Check MCP server availability
- Verify API keys are set

### Connection Errors
- Verify MCP server URLs are accessible
- Check firewall/network settings
- Ensure CI has internet access

### Random Failures
- AI responses are non-deterministic
- Network issues with external services
- Rate limiting on AI providers

### Missing API Keys
- Set environment variables locally:
  ```bash
  export ANTHROPIC_API_KEY="your-key"
  export OPENAI_API_KEY="your-key"
  export XAI_API_KEY="your-key"
  ```
- Add secrets to GitHub repository settings

---

## Test Coverage

Current test coverage:

| Component | Coverage | Notes |
|-----------|----------|-------|
| MCP Servers | ✅ Full | All 3 servers tested |
| Chat API | ✅ Full | All features tested |
| Ymax API | ✅ Full | All features tested |
| Support API | ✅ Full | All features tested |
| E2E Flows | ✅ Full | Major scenarios covered |
| Database | ❌ None | DB operations disabled |

**Total:** ~150+ integration tests across 5 test suites

---

## Future Enhancements

Potential improvements:

1. **Database Tests** - Add tests once DB operations are enabled
2. **Performance Tests** - Load testing, stress testing
3. **Mock MCP Servers** - Faster tests with mocked servers
4. **Visual Regression** - Screenshot testing for UI
5. **Security Tests** - Input validation, XSS, injection
6. **Authentication Tests** - User auth flows (when implemented)

---

## Questions?

For issues or questions about the test suite:
1. Check test output for detailed error messages
2. Review CI/CD logs on GitHub Actions
3. Consult [CLAUDE.md](../CLAUDE.md) for project architecture
4. Open an issue on GitHub

---

**Last Updated:** 2025-01-22
**Test Framework:** Vitest 4.0.13
**Total Test Files:** 5 integration + 1 schema validation
