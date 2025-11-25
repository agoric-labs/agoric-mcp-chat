export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

export function validateInput(content: string): ValidationResult {
  const injectionPatterns = [
    /ignore (all |previous )?instructions/i,
    /disregard (all |previous )?instructions/i,
    /system (prompt|role)/i,
    /you are now/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(content)) {
      return {
        valid: false,
        error: "Invalid request format",
        statusCode: 400,
      };
    }
  }

  if (content.length > 15000) {
    return {
      valid: false,
      error: "Request too large. Please limit input to 15,000 characters.",
      statusCode: 413,
    };
  }

  if (/(?:give|send|share).{0,20}(?:private key|seed phrase|mnemonic)/i.test(content)) {
    return {
      valid: false,
      error: "Invalid request type",
      statusCode: 400,
    };
  }

  return { valid: true };
}