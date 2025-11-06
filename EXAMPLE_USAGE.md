# Web Search Feature - Usage Examples

## Example 1: Research a Specific Website

### User Message:
```
What security best practices are recommended on https://docs.agoric.com?
```

### What Happens Behind the Scenes:

1. **URL Detection**
   ```javascript
   URLs detected: true
   Domains extracted: ['docs.agoric.com']
   ```

2. **System Prompt Enhancement**
   ```
   ## Web Search Capability

   The user has provided URLs in their message: docs.agoric.com

   You have access to a web_search tool that will ONLY search within these specific domains.
   ```

3. **Web Search Tool Configuration**
   ```javascript
   {
     type: "web_search_20250305",
     name: "web_search",
     max_uses: 5,
     allowed_domains: ["docs.agoric.com"]
   }
   ```

4. **Claude's Response**
   Claude will use the web_search tool to search docs.agoric.com for security best practices and provide a comprehensive answer based on the search results.

---

## Example 2: Compare Multiple Sources

### User Message:
```
Compare the tokenomics information from these sources:
- https://agoric.com/tokenomics
- https://docs.agoric.com/guides/getting-started/
- https://blog.agoric.com/economics
```

### What Happens:

1. **URL Detection**
   ```javascript
   URLs detected: true
   Domains extracted: ['agoric.com', 'docs.agoric.com', 'blog.agoric.com']
   ```

2. **Web Search Configuration**
   ```javascript
   {
     type: "web_search_20250305",
     name: "web_search",
     max_uses: 5,
     allowed_domains: ["agoric.com", "docs.agoric.com", "blog.agoric.com"]
   }
   ```

3. **Claude's Response**
   Claude can search all three domains to find tokenomics information and provide a comparison.

---

## Example 3: Deep Dive into Documentation

### User Message:
```
I'm learning about Zoe. Can you explain the key concepts from https://docs.agoric.com/guides/zoe/?
```

### What Happens:

1. **URL Detection**
   ```javascript
   URLs detected: true
   Domains extracted: ['docs.agoric.com']
   ```

2. **Claude's Capabilities**
   - Search for "Zoe key concepts" on docs.agoric.com
   - Search for "Zoe tutorial" on docs.agoric.com
   - Search for "Zoe smart contracts" on docs.agoric.com
   - Compile information from multiple pages within the domain
   - Provide a comprehensive explanation

---

## Example 4: No URLs (Normal Chat)

### User Message:
```
What is Agoric and what problems does it solve?
```

### What Happens:

1. **URL Detection**
   ```javascript
   URLs detected: false
   Domains extracted: []
   Web search: disabled
   ```

2. **Claude's Response**
   Claude responds using its training data and any MCP tools available, but without web search capability.

---

## Example 5: Portfolio Analysis with Web Research

### User Message (in Ymax mode):
```
What's the current APY for USDC on Aave according to https://aave.com?
```

### What Happens:

1. **URL Detection**
   ```javascript
   URLs detected: true
   Domains extracted: ['aave.com']
   ```

2. **Context**: Ymax API route with portfolio optimization prompt

3. **Claude's Capabilities**
   - Search aave.com for current USDC APY
   - Use MCP tools to fetch user's portfolio data
   - Combine web search results with portfolio analysis
   - Provide optimization recommendations

---

## Example 6: Multi-Protocol Research

### User Message:
```
Compare the documentation quality and completeness between:
- https://docs.aave.com
- https://docs.compound.finance
- https://docs.agoric.com

Which has the best developer onboarding experience?
```

### What Happens:

1. **URL Detection**
   ```javascript
   URLs detected: true
   Domains extracted: [
     'docs.aave.com',
     'docs.compound.finance',
     'docs.agoric.com'
   ]
   ```

2. **Claude's Approach**
   - Search each domain for onboarding content
   - Look for quickstart guides, tutorials, API references
   - Analyze structure and comprehensiveness
   - Provide comparative analysis

---

## Example 7: Support Bot with Documentation Search

### User Message (in Support mode):
```
I'm seeing a transaction stuck in "Advanced" state. What does the runbook say about this?
Check: https://docs.agoric.com/guides/fast-usdc
```

### What Happens:

1. **URL Detection**
   ```javascript
   URLs detected: true
   Domains extracted: ['docs.agoric.com']
   ```

2. **Context**: Support API route with Fast USDC knowledge

3. **Claude's Capabilities**
   - Search docs.agoric.com for Fast USDC transaction states
   - Use MCP diagnostic tools
   - Cross-reference web search results with internal runbook
   - Provide troubleshooting steps

---

## Console Output Examples

### When Feature is Active:
```
messages [ /* message array */ ]
parts [ /* message parts */ ]
URLs detected in conversation: true
Allowed domains for web search: [ 'docs.agoric.com', 'agoric.com' ]
Web search tool enabled with config: {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 5,
  allowed_domains: [ 'docs.agoric.com', 'agoric.com' ]
}
```

### When Feature is Inactive:
```
messages [ /* message array */ ]
parts [ /* message parts */ ]
URLs detected in conversation: false
Allowed domains for web search: []
```

---

## Edge Cases

### Case 1: Invalid URL Format
```
User: "Check out docs.agoric.com"
```
**Result**: No web search (requires http:// or https://)

### Case 2: Mixed Valid/Invalid URLs
```
User: "Compare https://agoric.com with docs.agoric.com"
```
**Result**: Web search enabled only for `agoric.com`

### Case 3: URL in Assistant Message
```
User: "Tell me about Agoric"
Assistant: "Check https://agoric.com"
User: "Thanks"
```
**Result**: No web search (last user message has no URLs)

### Case 4: Same Domain Multiple Times
```
User: "Compare https://agoric.com/about and https://agoric.com/tokenomics"
```
**Result**: Web search enabled for `agoric.com` (deduplicated)

---

## Best Practices

### ✅ Do:
- Include full URLs with https://
- Provide specific pages when possible
- Ask targeted questions about the content
- Use descriptive context around URLs

### ❌ Don't:
- Expect it to work without protocol (http/https)
- Use it with non-Claude models (won't activate)
- Expect searches outside specified domains
- Provide more than 5-10 domains per message

---

## Testing Your Implementation

### Test 1: Basic Functionality
```
User: "Summarize https://docs.agoric.com"
Expected: Web search enabled, Claude searches and summarizes
```

### Test 2: Multiple Domains
```
User: "Compare https://agoric.com and https://cosmos.network"
Expected: Web search enabled for both domains
```

### Test 3: No URLs
```
User: "What is Agoric?"
Expected: Normal chat, no web search
```

### Test 4: Non-Claude Model
```
Select: GPT-4 or Groq
User: "Summarize https://docs.agoric.com"
Expected: No web search (Anthropic only)
```

---

## Monitoring and Debugging

Check your server console for these logs:

```javascript
// Feature activated successfully
"URLs detected in conversation: true"
"Allowed domains for web search: ['example.com']"
"Web search tool enabled with config: {...}"

// Feature not activated
"URLs detected in conversation: false"
"Allowed domains for web search: []"
```

---

## API Endpoints

All three endpoints support web search:

1. **`/api/chat`** - Default Agoric assistant
2. **`/api/ymax`** - Portfolio optimization (theme=ymax)
3. **`/api/support`** - Fast USDC support (useAgoricWebsiteMCP=true)

The feature works identically across all three routes.
