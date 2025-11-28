/**
 * MCP Tool Schema Synchronization Test
 *
 * This regression test uses snapshot testing to verify that schema definitions
 * in the /lib/mcp/ directory stay synchronized with tools exposed by MCP servers.
 *
 * Purpose:
 * - Ensure bidirectional sync between local schemas and remote MCP server tools
 * - Detect missing schemas (tools on server without local definitions)
 * - Detect orphaned schemas (local definitions for non-existent tools)
 * - Prevent runtime errors from schema mismatches
 * - Track tool evolution over time via git-tracked snapshots
 */

import { describe, it, expect } from 'vitest';
import { agoricMcpToolSchemas } from '@/lib/mcp/agoric-tool-schemas';
import { agoricMcpDevopsToolSchemas } from '@/lib/mcp/agoric-devops-tool-schemas';
import { ymaxMcptoolSchemas } from '@/lib/mcp/ymax-tool-schemas';
import { fetchMcpServerTools, type ServerConfig } from './test-helpers';

const MCP_SERVERS: Record<string, ServerConfig> = {
    agoric: {
        name: 'Agoric MCP Server',
        url: 'https://agoric-mcp-server.agoric-core.workers.dev/sse',
        schemas: agoricMcpToolSchemas,
    },
    ymax: {
        name: 'Ymax MCP Server',
        url: 'https://ymax-mcp-server.agoric-core.workers.dev/sse',
        schemas: ymaxMcptoolSchemas,
    },
    devops: {
        name: 'Agoric DevOps MCP Server',
        url: 'https://agoric-mcp-devops-server.agoric-core.workers.dev/sse',
        schemas: agoricMcpDevopsToolSchemas,
    },
};

const TEST_TIMEOUT = 60_000;

describe('MCP Server Schema Synchronization', () => {
    it.each(Object.entries(MCP_SERVERS))(
        '%s - should have matching schemas for all MCP server tools',
        { timeout: TEST_TIMEOUT },
        async (serverKey, serverConfig) => {
            const serverTools = await fetchMcpServerTools(serverKey, serverConfig);
            const definedSchemas = Object.keys(serverConfig.schemas);

            const sortedServerTools = [...serverTools].sort();
            const sortedDefinedSchemas = [...definedSchemas].sort();

            expect(sortedDefinedSchemas).toHaveLength(sortedServerTools.length);

            expect(sortedDefinedSchemas).toMatchSnapshot(`${serverKey}-defined-schemas`);

            expect(sortedServerTools).toMatchSnapshot(`${serverKey}-server-tools`);
        }
    );
});
