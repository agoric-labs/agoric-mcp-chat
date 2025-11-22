# Test Directory

## MCP Schema Validation Tests

### Purpose
Automated regression tests to ensure MCP tool schemas stay synchronized with live server implementations.

### Test File
- **`mcp-schema-validation.test.ts`** - Main test suite covering 73 tools across 3 MCP servers

### What Gets Tested
1. **Schema Completeness**: All server tools have corresponding schemas in `/lib/mcp/`
2. **No Orphans**: No schemas exist without matching server tools
3. **Schema Structure**: All schemas have valid `inputSchema` property
4. **Multi-Server Coverage**: Tests all 3 MCP servers (Agoric, Ymax, DevOps)

### Running Tests

```bash
# Run all tests once (CI mode)
yarn test:run

# Run only MCP schema tests
yarn test:mcp

# Run tests in watch mode (development)
yarn test

# Open visual UI dashboard
yarn test:ui
```

### Test Execution

Tests run in **3 environments**:

1. **Local Development** (Pre-commit)
   - Triggered by: `git commit`
   - Via: Husky pre-commit hook
   - Purpose: Catch issues before code enters git history

2. **GitHub Actions** (CI/CD)
   - Triggered by: Push/PR to main, develop branches
   - Via: `.github/workflows/test.yml`
   - Purpose: Automated validation on every code change

3. **Manual Execution**
   - Triggered by: `yarn test:run` or `yarn test:mcp`
   - Purpose: On-demand testing during development

### Important Notes

#### Package.json `prepare` Script
```json
"prepare": "[ -d .git ] && husky || true"
```

**Why this conditional check?**
- **Problem**: The `prepare` script runs during `yarn install` in ALL environments (local, GitHub Actions, Cloudflare builds)
- **Issue**: Cloudflare Workers builds were failing because Husky tried to initialize git hooks during deployment
- **Solution**: Only run Husky when `.git` directory exists (local development only)
- **Benefit**: Separates testing from deployment builds

**Behavior:**
- ✅ **Local dev**: `.git` exists → Husky initializes → Pre-commit hooks work
- ❌ **Cloudflare build**: No `.git` → Husky skipped → Build succeeds
- ⚠️ **GitHub Actions**: Has `.git` but uses explicit test workflow (not hooks)

#### Pre-commit Hook CI Check
```bash
if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$CF_PAGES" ] || [ -n "$CLOUDFLARE" ]; then
  echo "Skipping tests in CI environment"
  exit 0
fi
```

**Why skip in CI?**
- Extra safety layer if Husky somehow gets initialized in CI environments
- Prevents deployment builds from being blocked by test failures
- Tests still run via GitHub Actions workflow (explicit command)
- Checks multiple environment variables because different CI systems use different names:
  - `$CI` - Generic CI indicator (set by most CI systems)
  - `$GITHUB_ACTIONS` - GitHub Actions specific
  - `$CF_PAGES` - Cloudflare Pages builds
  - `$CLOUDFLARE` - Cloudflare Workers builds

### Test Coverage

| MCP Server | URL | Tools | Schema File |
|------------|-----|-------|-------------|
| Agoric | `https://agoric-mcp-server.agoric-core.workers.dev/sse` | 38 | `lib/mcp/agoric-tool-schemas.ts` |
| Ymax | `https://ymax-mcp-server.agoric-core.workers.dev/sse` | 25 | `lib/mcp/ymax-tool-schemas.ts` |
| DevOps | `https://agoric-mcp-devops-server.agoric-core.workers.dev/sse` | 10 | `lib/mcp/agoric-devops-tool-schemas.ts` |
| **Total** | | **73** | |

### Test Framework

- **Framework**: Vitest (modern, fast, TypeScript-native)
- **Configuration**: `vitest.config.ts` in project root
- **Timeout**: 60 seconds per test (for network calls to live servers)
- **Duration**: ~23 seconds total

### Adding New Tests

When MCP servers add new tools:
1. Tests will **fail** (missing schema detected)
2. Add schema to appropriate file in `/lib/mcp/`
3. Re-run tests to verify

When removing tools:
1. Tests will **fail** (orphaned schema detected)
2. Remove schema from `/lib/mcp/` file
3. Re-run tests to verify

### Debugging Test Failures

**GitHub Actions:**
- Check workflow run at: `https://github.com/[org]/[repo]/actions`
- Download test artifacts for detailed logs

**Local:**
```bash
# Run with verbose output
yarn test:run --reporter=verbose

# Run specific test file
yarn vitest test/mcp-schema-validation.test.ts

# Debug in UI
yarn test:ui
```

### Related Documentation

- Main testing strategy: `CLAUDE.md` → Testing Strategy section
- GitHub workflow: `.github/workflows/test.yml`
- Pre-commit hook: `.husky/pre-commit`
- Vitest config: `vitest.config.ts`
