# Web Search with Domain Filtering Feature

## Overview

This application now supports automatic web search with domain filtering when users include URLs in their messages. When a URL is detected, Claude will have access to a web search tool that is restricted to searching only within the domains mentioned in the user's prompt.

## How It Works

### 1. URL Detection

When you send a message containing one or more URLs, the system automatically:
- Extracts all URLs from your message
- Parses the domain names from those URLs
- Configures a web search tool restricted to those specific domains

### 2. Web Search Tool Configuration

The web search tool is configured with:
- **Type**: `web_search_20250305` (Anthropic's web search API)
- **Name**: `web_search`
- **Max Uses**: 5 searches per request
- **Allowed Domains**: Only the domains extracted from your URLs

### 3. Claude's Capabilities

Once enabled, Claude can:
- Search for information within the specified domains
- Get current/updated content from those websites
- Answer questions about content on those specific domains
- Cannot search the broader internet (restricted to your domains only)

## Example Usage

### Example 1: Asking about a specific article

**User Input:**
```
Can you summarize the main points from this article? https://docs.agoric.com/guides/zoe/
```

**What Happens:**
1. System detects URL: `https://docs.agoric.com/guides/zoe/`
2. Extracts domain: `docs.agoric.com`
3. Enables web search tool restricted to `docs.agoric.com`
4. Claude can now search within docs.agoric.com to answer your question

### Example 2: Comparing multiple sources

**User Input:**
```
Compare the information about staking from these two sources:
- https://agoric.com/staking
- https://docs.agoric.com/guides/getting-started/
```

**What Happens:**
1. System detects 2 URLs
2. Extracts domains: `agoric.com`, `docs.agoric.com`
3. Web search restricted to both domains
4. Claude can search both sites to compare information

### Example 3: Research within a specific website

**User Input:**
```
What are all the security best practices mentioned on https://agoric.com?
```

**What Happens:**
1. Domain extracted: `agoric.com`
2. Claude can search the entire agoric.com domain
3. Returns comprehensive security information from that site

## Technical Details

### Architecture

The feature is implemented across three API routes:
- `/api/chat` - Default chat endpoint
- `/api/ymax` - Portfolio optimization endpoint
- `/api/support` - Fast USDC support endpoint

### URL Extraction Logic

Location: `/lib/utils/url-extractor.ts`

Functions:
- `extractDomainsFromText(text: string)` - Extracts domains from a single text string
- `extractDomainsFromMessages(messages: Array)` - Extracts domains from all messages
- `hasUrlsInLastUserMessage(messages: Array)` - Checks if the last user message contains URLs

### Web Search Tool Integration

The web search tool is only enabled when:
1. The selected model is Claude (Anthropic)
2. The user's message contains URLs
3. At least one domain was successfully extracted

Configuration object:
```typescript
{
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
  allowed_domains: ["example.com", "another-domain.org"]
}
```

### System Prompt Enhancement

When URLs are detected, the system prompt is automatically enhanced with:
```
## Web Search Capability

The user has provided URLs in their message: example.com, another-domain.org

You have access to a web_search tool that will ONLY search within these specific domains. Use this tool when you need to:
- Find information from the URLs the user provided
- Get current/updated content from those websites
- Answer questions about content on those specific domains

The search is restricted to these domains only, so you cannot search the broader internet.
```

## Limitations

1. **Anthropic Models Only**: Web search is only available when using Claude models (not OpenAI, Groq, or XAI)
2. **Domain Restriction**: The search is strictly limited to the domains you provide in URLs
3. **Max Uses**: Limited to 5 searches per request to prevent excessive API usage
4. **URL Requirement**: The feature only activates when you explicitly include URLs in your message

## Privacy & Security

- **No Broad Internet Access**: Claude cannot search the entire internet, only the domains you specify
- **User Control**: You have full control over which domains Claude can search by including/excluding URLs
- **Transparent**: Console logs show when web search is enabled and which domains are allowed

## Debugging

To see if web search is enabled for your request, check the server logs:

```
URLs detected in conversation: true
Allowed domains for web search: ['example.com', 'docs.example.org']
Web search tool enabled with config: { type: 'web_search_20250305', name: 'web_search', max_uses: 5, allowed_domains: [...] }
```

## Future Enhancements

Potential improvements:
- Support for blocked domains (exclusion list)
- Configurable max_uses per user preference
- User location-based search results
- Support for other AI providers (OpenAI, Google)
- UI indicator showing when web search is active
- Option to manually enable/disable web search

## Related Documentation

- [Claude Web Search Documentation](https://docs.anthropic.com/en/docs/build-with-claude/web-search)
- [Anthropic Web Search API](https://docs.anthropic.com/en/api/web-search)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
