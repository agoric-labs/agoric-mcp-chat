# Web Search Feature - Quick Reference

## 🚀 Quick Start

**To enable web search, simply include a URL in your message:**

```
User: "What does https://docs.agoric.com say about smart contracts?"
```

That's it! Claude will automatically gain search access to that domain.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Auto-Detection** | URLs automatically detected in messages |
| **Domain Filtering** | Search limited to specified domains only |
| **Multiple Domains** | Support for multiple URLs/domains at once |
| **Secure** | Cannot search outside user-specified domains |
| **Model Support** | Claude (Anthropic) models only |

---

## 📋 Requirements

- ✅ URL must include `http://` or `https://`
- ✅ Must use Claude model (default)
- ✅ URL must be in the user's message
- ✅ Valid domain name

---

## 🎯 Usage Patterns

### Single Domain
```
"Summarize https://docs.agoric.com/guides/zoe/"
```
→ Search enabled for: `docs.agoric.com`

### Multiple Domains
```
"Compare https://agoric.com and https://cosmos.network"
```
→ Search enabled for: `agoric.com`, `cosmos.network`

### Deep Research
```
"What are all the tutorials on https://docs.agoric.com?"
```
→ Claude can search the entire domain

---

## ⚙️ Configuration

### Automatic Settings
- **Max Searches**: 5 per request
- **Tool Type**: `web_search_20250305`
- **Activation**: Automatic when URLs detected

### Manual Override
Not available - automatically enabled/disabled based on URL presence

---

## 🔍 How to Verify It's Working

### Check Console Logs
```javascript
URLs detected in conversation: true
Allowed domains for web search: ['docs.agoric.com']
Web search tool enabled with config: {...}
```

### Claude's Behavior
When enabled, Claude will:
- Mention using web search in responses
- Provide current/live information from the sites
- Reference specific pages it found

---

## ❌ Limitations

| Limitation | Impact |
|------------|--------|
| **Claude Only** | Won't work with GPT-4, Groq, or Grok |
| **5 Searches Max** | Limited to 5 searches per conversation turn |
| **Domain Restricted** | Cannot search outside specified domains |
| **Protocol Required** | URLs must start with http:// or https:// |

---

## 🐛 Troubleshooting

### Web Search Not Working?

**Check 1: Using Claude?**
```
Model: Claude 4.5 Sonnet ✅
Model: GPT-4 Mini ❌
```

**Check 2: URL Format**
```
https://docs.agoric.com ✅
docs.agoric.com ❌
www.docs.agoric.com ❌ (needs protocol)
```

**Check 3: URL in User Message?**
```
User: "Check https://agoric.com" ✅
Assistant: "Check https://agoric.com" ❌
```

**Check 4: Last Message**
```
User: "Check https://agoric.com"
User: "Thanks" ← Last message has no URL ❌
```

---

## 📊 Examples by Use Case

### Research
```
"What's new on https://blog.agoric.com this month?"
```

### Documentation
```
"Explain the setup process from https://docs.agoric.com/guides/getting-started/"
```

### Comparison
```
"Compare https://agoric.com vs https://cosmos.network"
```

### Portfolio Analysis
```
"Check current APY on https://aave.com for USDC"
```

---

## 🔐 Security & Privacy

- ✅ No broad internet access
- ✅ User controls which domains
- ✅ Transparent logging
- ✅ No data stored from searches

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `/lib/utils/url-extractor.ts` | Core logic |
| `/app/api/chat/route.ts` | Main chat API |
| `/app/api/ymax/route.ts` | Portfolio API |
| `/app/api/support/route.ts` | Support API |

---

## 🆘 Support

### Common Issues

**Issue**: "Claude isn't using web search"
**Solution**: Make sure URL has http:// or https://

**Issue**: "Getting stale information"
**Solution**: Web search provides live data - if info is stale, the website itself may not be updated

**Issue**: "Search limited error"
**Solution**: You've hit the 5 search limit. Start a new conversation or be more specific

---

## 🎓 Best Practices

1. **Be Specific**: Link to exact pages when possible
2. **Use HTTPS**: Always include the protocol
3. **Context Matters**: Explain what you want from the URL
4. **Combine Tools**: Web search works alongside MCP tools

---

## 📈 Performance

- **Detection Speed**: Instant (regex-based)
- **Search Speed**: Depends on Anthropic API
- **No Overhead**: Zero impact when no URLs present

---

## 🔄 Updates

**Current Version**: 1.0
**Last Updated**: 2025-01-06
**Compatibility**: Claude 4.5 Sonnet (and future Claude models)

---

## 💡 Pro Tips

1. Include multiple URLs for cross-reference checks
2. Ask follow-up questions without URLs (uses cached context)
3. Use specific page URLs for faster, more accurate results
4. Combine with MCP tools for powerful workflows

---

## 🚦 Status Indicators

| Console Message | Meaning |
|----------------|---------|
| `URLs detected: true` | Feature active |
| `URLs detected: false` | Feature inactive |
| `Allowed domains: [...]` | Domains available for search |
| `Web search tool enabled` | Successfully configured |

---

## 🎯 Quick Commands

### Enable Web Search
```
"Check https://example.com"
```

### Multiple Domains
```
"Compare https://site1.com and https://site2.com"
```

### Disable Web Search
```
"Tell me about Agoric"
(no URLs = no web search)
```

---

## 📞 Getting Help

1. Check console logs for diagnostic info
2. Verify URL format (needs http/https)
3. Confirm using Claude model
4. Review `/WEB_SEARCH_FEATURE.md` for details
5. See `/EXAMPLE_USAGE.md` for more examples

---

**Happy Searching! 🎉**
