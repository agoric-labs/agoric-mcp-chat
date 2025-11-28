export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

// Maximum allowed characters for user input
export const MAX_INPUT_LENGTH = 8000;
const CONTENT_TOO_LARGE_ERROR = `Request too large. Please limit input to ${MAX_INPUT_LENGTH.toLocaleString()} characters.`;
const CONTENT_TOO_LARGE_STATUS = 413;

export function validateInputLength(content: string): ValidationResult {
  if (content.length > MAX_INPUT_LENGTH) {
    return {
      valid: false,
      error: CONTENT_TOO_LARGE_ERROR,
      statusCode: CONTENT_TOO_LARGE_STATUS,
    };
  }

  return { valid: true };
}
