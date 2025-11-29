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

import { MODELS } from '@/ai/providers';

export interface ValidationError {
  error: string;
  status: 400 | 401 | 403 | 422;
}

/**
 * Message part structure from AI SDK
 */
interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Message structure from AI SDK
 */
interface Message {
  role: string;
  parts: MessagePart[];
  [key: string]: unknown;
}

/**
 * Request body structure for chat API endpoints
 */
export interface ChatRequestBody {
  userId?: string;
  messages?: unknown;
  selectedModel?: string;
  chatId?: string;
  mcpServers?: unknown[];
}

/**
 * Validates that the request body is a valid object
 *
 * @param body - The request body to validate
 * @returns ValidationError if body is not an object, null if valid
 */
export function validateRequestBody(body: unknown): ValidationError | null {
  if (!body || typeof body !== 'object') {
    return {
      error: 'Request body must be an object',
      status: 400
    };
  }
  return null;
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

  // Check if selectedModel is a valid model ID
  if (!MODELS.includes(body.selectedModel)) {
    return {
      error: `Invalid model: ${body.selectedModel}. Valid models are: ${MODELS.join(', ')}`,
      status: 400
    };
  }

  return null;
}

/**
 * Validates that each message has the required parts array structure
 *
 * @param body - The request body containing messages
 * @returns ValidationError if message structure is invalid, null if valid
 */
export function validateMessageStructure(body: ChatRequestBody): ValidationError | null {
  const messages = body.messages as Message[];

  for (const msg of messages) {
    if (!msg.parts || !Array.isArray(msg.parts)) {
      return {
        error: 'Invalid message format: messages must have parts array',
        status: 400
      };
    }
  }

  return null;
}

/**
 * Type guard to check if a value is a validation error
 */
export function isValidationError(value: unknown): value is ValidationError {
  return (
    value !== null &&
    typeof value === 'object' &&
    'error' in value &&
    'status' in value &&
    typeof (value as ValidationError).error === 'string' &&
    typeof (value as ValidationError).status === 'number'
  );
}
