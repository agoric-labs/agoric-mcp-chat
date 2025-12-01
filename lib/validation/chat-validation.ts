/**
 * Shared Validation Logic for Chat API Routes
 *
 * PURPOSE OF EXTRACTION:
 * This validation logic is used by BOTH:
 * 1. Real API routes (app/api/chat/route.ts, app/api/ymax/route.ts, app/api/support/route.ts)
 * 2. Test mocks (test/setup.ts - MSW handlers)
 *
 * By extracting validation into shared functions, we ensure:
 * - Single source of truth for validation rules
 * - Tests automatically stay in sync with API changes
 * - If a developer changes validation logic here, both API and tests update together
 * - Impossible for tests to return different status codes than real API
 *
 * ARCHITECTURE:
 * Each validation concern is separated into its own function for:
 * - Better modularity and reusability
 * - Easier testing of individual validators
 * - Ability to compose validators based on endpoint needs
 * - Future extensibility (add new validators without modifying existing ones)
 *
 * IMPORTANT: Any changes to validation logic should be made HERE, not in individual route files.
 */

import { MODELS, type modelID } from '@/ai/providers';

export const EXPECTED_MCP_SERVERS = {
  CHAT: 'https://agoric-mcp-server.agoric-core.workers.dev/sse',
  YMAX: 'https://ymax-mcp-server.agoric-core.workers.dev/sse',
  SUPPORT: 'https://agoric-mcp-devops-server.agoric-core.workers.dev/sse'
} as const;

export interface ValidationError {
  error: string;
  status: 400 | 401 | 403 | 422;
}

/**
 * Message part structure from AI SDK
 * Simplified version matching UIMessagePart
 */
interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Message structure from AI SDK
 * Simplified version matching UIMessage interface
 */
interface Message {
  id?: string;  // Optional for backwards compatibility
  role: string;
  parts: MessagePart[];
  metadata?: unknown;
  [key: string]: unknown;
}

/**
 * Request body structure for chat API endpoints
 *
 * Required fields are validated by their respective validator functions:
 * - userId: validateUserId()
 * - messages: validateMessages() and validateMessageStructure()
 * - selectedModel: validateSelectedModel()
 *
 * Optional fields have runtime defaults:
 * - chatId: falls back to nanoid() if not provided
 * - mcpServers: defaults to [] if not provided
 */
export interface ChatRequestBody {
  userId: string;
  messages: unknown;
  selectedModel: modelID;
  chatId?: string;
  mcpServers?: unknown[];
}

/**
 * Validates that userId is present and is a string
 *
 * @param body - The request body containing userId
 * @returns ValidationError if userId is missing or invalid, null if valid
 */
export function validateUserId(body: ChatRequestBody): ValidationError | null {
  if (!body.userId || typeof body.userId !== 'string') {
    return {
      error: 'User ID is required',
      status: 400
    };
  }

  return null;
}

/**
 * Validates that selectedModel is present and is a valid model ID
 *
 * @param body - The request body containing selectedModel
 * @returns ValidationError if selectedModel is missing or invalid, null if valid
 */
export function validateSelectedModel(body: ChatRequestBody): ValidationError | null {
  if (!body.selectedModel || typeof body.selectedModel !== 'string') {
    return {
      error: 'selectedModel is required',
      status: 400
    };
  }

  if (!MODELS.includes(body.selectedModel)) {
    return {
      error: `Invalid model: ${body.selectedModel}. Valid models are: ${MODELS.join(', ')}`,
      status: 400
    };
  }

  return null;
}
/**
 * Validates that messages field is an array
 *
 * @param body - The request body containing messages
 * @returns ValidationError if messages is missing or not an array, null if valid
 */
export function validateMessages(body: ChatRequestBody): ValidationError | null {
  if (!body.messages || !Array.isArray(body.messages)) {
    return {
      error: 'Messages must be an array',
      status: 400
    };
  }

  return null;
}


/**
 * Type guard to check if a value is a valid MessagePart
 */
function isMessagePart(value: unknown): value is MessagePart {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'type' in value &&
    typeof (value as MessagePart).type === 'string'
  );
}

/**
 * Type guard to check if a value is a valid Message
 */
function isMessage(value: unknown): value is Message {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }

  const msg = value as Record<string, unknown>;

  if (
    !('role' in msg) ||
    typeof msg.role !== 'string' ||
    !('parts' in msg) ||
    !Array.isArray(msg.parts)
  ) {
    return false;
  }

  if (msg.parts.length === 0) {
    return false;
  }

  for (const part of msg.parts) {
    if (!isMessagePart(part)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that each message has the required parts array structure
 *
 * @param body - The request body containing messages
 * @returns ValidationError if message structure is invalid, null if valid
 */
export function validateMessageStructure(body: ChatRequestBody): ValidationError | null {
  // Defensive: Ensure messages is an array (in case validateMessages wasn't called)
  if (!Array.isArray(body.messages)) {
    return {
      error: 'Messages must be an array',
      status: 400
    };
  }

  const messages = body.messages;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      return {
        error: `Invalid message at index ${i}: must be an object`,
        status: 400
      };
    }

    if (!('role' in msg) || typeof (msg as Record<string, unknown>).role !== 'string') {
      return {
        error: `Invalid message at index ${i}: must have role field (string)`,
        status: 400
      };
    }

    if (!('parts' in msg) || !Array.isArray((msg as Record<string, unknown>).parts)) {
      return {
        error: `Invalid message at index ${i}: must have parts field (array)`,
        status: 400
      };
    }

    const parts = (msg as Record<string, unknown>).parts as unknown[];

    if (parts.length === 0) {
      return {
        error: `Invalid message at index ${i}: parts array cannot be empty`,
        status: 400
      };
    }

    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];

      if (!part || typeof part !== 'object' || Array.isArray(part)) {
        return {
          error: `Invalid message at index ${i}, part ${j}: must be an object`,
          status: 400
        };
      }

      if (!('type' in part) || typeof (part as Record<string, unknown>).type !== 'string') {
        return {
          error: `Invalid message at index ${i}, part ${j}: must have type field (string)`,
          status: 400
        };
      }
    }

    if (!isMessage(msg)) {
      return {
        error: `Invalid message at index ${i}: message structure is malformed`,
        status: 400
      };
    }
  }

  return null;
}

/**
 * MCP Server configuration interface
 * Matches MCPServerConfig used in API routes
 */
interface MCPServerConfig {
  url: string;
  type: 'sse' | 'stdio';
  command?: string;
  args?: string[];
  env?: Array<{ key: string; value: string }>;
  headers?: Array<{ key: string; value: string }>;
}

/**
 * Type guard to check if a value is a valid MCPServerConfig
 */
function isMCPServerConfig(value: unknown): value is MCPServerConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const server = value as Record<string, unknown>;

  if (
    !('url' in server) ||
    typeof server.url !== 'string' ||
    server.url.trim() === ''
  ) {
    return false;
  }

  if (
    !('type' in server) ||
    (server.type !== 'sse' && server.type !== 'stdio')
  ) {
    return false;
  }

  // For stdio type, validate required fields
  if (server.type === 'stdio') {
    if (
      !('command' in server) ||
      typeof server.command !== 'string' ||
      server.command.trim() === ''
    ) {
      return false;
    }

    if (
      !('args' in server) ||
      !Array.isArray(server.args) ||
      server.args.length === 0
    ) {
      return false;
    }

    for (const arg of server.args) {
      if (typeof arg !== 'string') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Normalize URL for comparison (handles trailing slashes, protocol, etc.)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, lowercase hostname
    const pathname = parsed.pathname.replace(/\/$/, '');
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    // Return as-is if invalid URL, let validation catch it
    return url.trim().toLowerCase();
  }
}

/**
 * Validates that the request contains exactly one MCP server and it matches the expected server
 *
 * Security: This enforces a strict one-to-one mapping between routes and MCP servers,
 * preventing malicious server injection attacks where an attacker could send additional
 * unauthorized servers alongside the valid one.
 *
 * @param body - The request body containing mcpServers array
 * @param expectedServerUrl - The URL of the MCP server expected for this route
 * @returns ValidationError if validation fails, null if valid
 */
export function validateMcpServer(
  body: ChatRequestBody,
  expectedServerUrl: string
): ValidationError | null {
  if (!Array.isArray(body.mcpServers)) {
    if (body.mcpServers === undefined || body.mcpServers === null) {
      return {
        error: `MCP server is required. Expected exactly 1 server: ${expectedServerUrl}`,
        status: 400
      };
    }

    return {
      error: `MCP servers must be an array. Expected exactly 1 server: ${expectedServerUrl}`,
      status: 400
    };
  }

  const mcpServers = body.mcpServers;

  if (mcpServers.length === 0) {
    return {
      error: `MCP server is required. Expected exactly 1 server: ${expectedServerUrl}`,
      status: 400
    };
  }

  if (mcpServers.length > 1) {
    const receivedUrls = mcpServers
      .filter(isMCPServerConfig)
      .map(s => s.url)
      .join(', ');

    return {
      error: `Expected exactly 1 MCP server for this endpoint, got ${mcpServers.length}. This endpoint only supports: ${expectedServerUrl}. Received: ${receivedUrls}`,
      status: 400
    };
  }

  const server = mcpServers[0];

  if (!server || typeof server !== 'object' || Array.isArray(server)) {
    return {
      error: `Invalid MCP server: must be an object`,
      status: 400
    };
  }

  if (!('url' in server) || typeof (server as Record<string, unknown>).url !== 'string') {
    return {
      error: `Invalid MCP server: must have url field (string)`,
      status: 400
    };
  }

  const serverUrl = (server as Record<string, unknown>).url as string;
  if (serverUrl.trim() === '') {
    return {
      error: `Invalid MCP server: url cannot be empty`,
      status: 400
    };
  }

  if (!('type' in server)) {
    return {
      error: `Invalid MCP server: must have type field ('sse' | 'stdio')`,
      status: 400
    };
  }

  const serverType = (server as Record<string, unknown>).type;
  if (serverType !== 'sse' && serverType !== 'stdio') {
    return {
      error: `Invalid MCP server: type must be 'sse' or 'stdio', got '${serverType}'`,
      status: 400
    };
  }

  // For stdio type, validate required fields
  if (serverType === 'stdio') {
    if (!('command' in server) || typeof (server as Record<string, unknown>).command !== 'string') {
      return {
        error: `Invalid MCP server: stdio type requires command field (string)`,
        status: 400
      };
    }

    if (!('args' in server) || !Array.isArray((server as Record<string, unknown>).args)) {
      return {
        error: `Invalid MCP server: stdio type requires args field (array)`,
        status: 400
      };
    }

    const args = (server as Record<string, unknown>).args as unknown[];
    if (args.length === 0) {
      return {
        error: `Invalid MCP server: stdio args cannot be empty`,
        status: 400
      };
    }
  }

  if (!isMCPServerConfig(server)) {
    return {
      error: `Invalid MCP server: server structure is malformed`,
      status: 400
    };
  }

  const normalizedExpected = normalizeUrl(expectedServerUrl);
  const normalizedReceived = normalizeUrl(server.url);

  if (normalizedReceived !== normalizedExpected) {
    return {
      error: `Invalid MCP server. Expected: ${expectedServerUrl}, but received: ${server.url}`,
      status: 400
    };
  }

  return null;
}
