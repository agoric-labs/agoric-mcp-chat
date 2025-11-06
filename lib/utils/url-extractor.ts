/**
 * Extracts URLs from text and returns their domains
 */
export function extractDomainsFromText(text: string): string[] {
  // URL regex pattern that matches http/https URLs
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

  const urls = text.match(urlRegex) || [];
  const domains = new Set<string>();

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      // Extract just the hostname (domain)
      domains.add(urlObj.hostname);
    } catch (error) {
      console.error(`Failed to parse URL: ${url}`, error);
    }
  }

  return Array.from(domains);
}

/**
 * Extracts domains from all messages in a conversation
 */
export function extractDomainsFromMessages(messages: Array<{ content: string | any }>): string[] {
  const allDomains = new Set<string>();

  for (const message of messages) {
    // Handle both string content and structured content
    const textContent = typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content);

    const domains = extractDomainsFromText(textContent);
    domains.forEach(domain => allDomains.add(domain));
  }

  return Array.from(allDomains);
}

/**
 * Check if the last user message contains URLs
 */
export function hasUrlsInLastUserMessage(messages: Array<{ role: string; content: string | any }>): boolean {
  // Find the last user message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      const textContent = typeof messages[i].content === 'string'
        ? messages[i].content
        : JSON.stringify(messages[i].content);

      const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
      return urlRegex.test(textContent);
    }
  }

  return false;
}
