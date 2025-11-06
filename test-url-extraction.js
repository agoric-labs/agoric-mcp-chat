// Test script for URL extraction utility
// Run with: node test-url-extraction.js

// Simple implementation for testing (mimics the TypeScript version)
function extractDomainsFromText(text) {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

  const urls = text.match(urlRegex) || [];
  const domains = new Set();

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      domains.add(urlObj.hostname);
    } catch (error) {
      console.error(`Failed to parse URL: ${url}`, error.message);
    }
  }

  return Array.from(domains);
}

function extractDomainsFromMessages(messages) {
  const allDomains = new Set();

  for (const message of messages) {
    const textContent = typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content);

    const domains = extractDomainsFromText(textContent);
    domains.forEach(domain => allDomains.add(domain));
  }

  return Array.from(allDomains);
}

function hasUrlsInLastUserMessage(messages) {
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

// Test Cases
console.log('=== Testing URL Extraction ===\n');

// Test 1: Single URL
console.log('Test 1: Single URL');
const text1 = 'Check out this article: https://docs.agoric.com/guides/zoe/';
const domains1 = extractDomainsFromText(text1);
console.log('Input:', text1);
console.log('Domains:', domains1);
console.log('Expected: ["docs.agoric.com"]');
console.log('Pass:', JSON.stringify(domains1) === JSON.stringify(['docs.agoric.com']) ? '✓' : '✗');
console.log('');

// Test 2: Multiple URLs
console.log('Test 2: Multiple URLs');
const text2 = 'Compare https://agoric.com/staking and https://docs.agoric.com/guides/getting-started/';
const domains2 = extractDomainsFromText(text2);
console.log('Input:', text2);
console.log('Domains:', domains2);
console.log('Expected: ["agoric.com", "docs.agoric.com"]');
console.log('Pass:', domains2.length === 2 && domains2.includes('agoric.com') && domains2.includes('docs.agoric.com') ? '✓' : '✗');
console.log('');

// Test 3: URL with www
console.log('Test 3: URL with www');
const text3 = 'Visit www.example.com for more info';
const domains3 = extractDomainsFromText(text3);
console.log('Input:', text3);
console.log('Domains:', domains3);
console.log('Note: www is not included in extracted domain');
console.log('');

// Test 4: No URLs
console.log('Test 4: No URLs');
const text4 = 'This is just a regular message without any URLs';
const domains4 = extractDomainsFromText(text4);
console.log('Input:', text4);
console.log('Domains:', domains4);
console.log('Expected: []');
console.log('Pass:', domains4.length === 0 ? '✓' : '✗');
console.log('');

// Test 5: Messages array
console.log('Test 5: Messages array');
const messages = [
  { role: 'user', content: 'Check https://agoric.com' },
  { role: 'assistant', content: 'Sure, I found info about that.' },
  { role: 'user', content: 'Also look at https://docs.agoric.com and https://agoric.com/blog' }
];
const domains5 = extractDomainsFromMessages(messages);
console.log('Input: 3 messages with URLs');
console.log('Domains:', domains5);
console.log('Expected: ["agoric.com", "docs.agoric.com"]');
console.log('Pass:', domains5.length === 2 && domains5.includes('agoric.com') && domains5.includes('docs.agoric.com') ? '✓' : '✗');
console.log('');

// Test 6: Check last user message
console.log('Test 6: Has URLs in last user message');
const messages6 = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there!' },
  { role: 'user', content: 'Check https://agoric.com' }
];
const hasUrls6 = hasUrlsInLastUserMessage(messages6);
console.log('Has URLs:', hasUrls6);
console.log('Expected: true');
console.log('Pass:', hasUrls6 === true ? '✓' : '✗');
console.log('');

// Test 7: No URLs in last user message
console.log('Test 7: No URLs in last user message');
const messages7 = [
  { role: 'user', content: 'Check https://agoric.com' },
  { role: 'assistant', content: 'Sure!' },
  { role: 'user', content: 'Thank you' }
];
const hasUrls7 = hasUrlsInLastUserMessage(messages7);
console.log('Has URLs:', hasUrls7);
console.log('Expected: false');
console.log('Pass:', hasUrls7 === false ? '✓' : '✗');
console.log('');

// Test 8: Complex URL with query parameters
console.log('Test 8: Complex URL with query parameters');
const text8 = 'Search results: https://docs.agoric.com/search?q=staking&page=1';
const domains8 = extractDomainsFromText(text8);
console.log('Input:', text8);
console.log('Domains:', domains8);
console.log('Expected: ["docs.agoric.com"]');
console.log('Pass:', JSON.stringify(domains8) === JSON.stringify(['docs.agoric.com']) ? '✓' : '✗');
console.log('');

console.log('=== Testing Complete ===');
