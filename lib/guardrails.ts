export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

export function validateInputLength(content: string): ValidationResult {
  if (content.length > 15000) {
    return {
      valid: false,
      error: "Request too large. Please limit input to 15,000 characters.",
      statusCode: 413,
    };
  }

  return { valid: true };
}
