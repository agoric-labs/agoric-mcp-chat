# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `yarn dev` - Start development server with turbopack
- `yarn build` - Build the application
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn deploy` - Deploy to Cloudflare using OpenNext
- `yarn db:generate` - Generate Drizzle schema
- `yarn db:migrate` - Run database migrations
- `yarn db:push` - Push schema changes to database
- `yarn db:studio` - Open Drizzle Studio

### Testing Commands

- `node test-ymax-api.js` - Test the ymax portfolio optimization API with real multi-chain data

## Architecture Overview

This is a Next.js 15 AI chat application that integrates with Model Context Protocol (MCP) servers to provide enhanced AI capabilities for Agoric blockchain operations.

### Core Architecture

**Frontend:**

- Next.js 15 with App Router
- React 19 with Suspense
- Tailwind CSS + shadcn/ui components
- Context providers for MCP server management and editor state

**Backend:**

- Next.js API routes for chat functionality
- Drizzle ORM with PostgreSQL (Neon)
- AI SDK by Vercel for multi-provider AI integration
- MCP client integration for tool access

**Key Components:**

- `lib/context/mcp-context.tsx` - Manages MCP server configurations and selection
- `app/api/chat/route.ts` - Main chat API endpoint with MCP integration
- `app/api/ymax/route.ts` - Portfolio optimization API with CORS support
- `components/mcp-server-manager.tsx` - UI for configuring MCP servers
- `test-ymax-api.js` - Multi-chain testing utility for ymax API

### MCP Integration

The application supports two MCP transport types:

- **SSE (Server-Sent Events)**: For HTTP-based remote MCP servers
- **stdio**: For local MCP servers running as processes

MCP servers are configured through the UI and stored in localStorage. The chat API dynamically creates MCP clients based on selected servers and integrates their tools into the AI conversation.

### Database Schema

Uses Drizzle ORM with these main entities:

- `chats` - Chat sessions with user association
- Messages are handled in-memory during conversations

### AI Integration

- Supports multiple AI providers (Anthropic, OpenAI, Google, etc.)
- Dynamic system prompts with Agoric-specific context
- Tool integration through MCP servers
- Reasoning model support with thinking budgets

### Ymax Portfolio Optimization API

The `/api/ymax` endpoint provides AI-powered portfolio analysis for DeFi yield optimization:

**Supported Protocols:**

- **Aave**: Optimism, Arbitrum, Ethereum chains
- **Compound**: Ethereum, Arbitrum, Polygon chains
- **USDN**: Noble chain (Cosmos ecosystem)

**Key Features:**

- Multi-chain yield opportunity analysis
- Real-time APY and TVL data integration
- Historical trend analysis for market timing
- Risk-adjusted portfolio recommendations
- CORS-enabled for external application access

**Data Sources:**

- Agoric APY Worker: `https://apy-worker.agoric-core.workers.dev`
- Noble USDN: `https://worker.dollar.noble.xyz/`

### Special Features

- **Agoric Focus**: System prompts are tailored for Agoric blockchain operations
- **Asset Safety**: Emphasizes transaction verification and user confirmation
- **Dynamic Tool Loading**: MCP tools are loaded at runtime based on server selection
- **Auto-installation**: Automatically installs Python packages for stdio MCP servers
- **Cross-Origin Support**: APIs include comprehensive CORS headers for external access

## Development Notes

- Uses yarn as package manager
- TypeScript throughout with strict configuration
- Component library based on shadcn/ui
- Database migrations managed through Drizzle Kit
- Deployment optimized for Cloudflare Workers via OpenNext
