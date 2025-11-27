/**
 * MCP Tool Schema Coverage Test
 *
 * This regression test verifies that all tools exposed by MCP servers
 * have corresponding schema definitions in the /lib/mcp/ directory.
 *
 * Purpose:
 * - Ensure schema definitions stay synchronized with MCP server implementations
 * - Catch missing schemas when MCP servers add/modify tools
 * - Prevent runtime errors from undefined tool schemas
 */

import { describe, it, expect, afterAll } from 'vitest';
import { agoricMcpToolSchemas } from '@/lib/mcp/agoric-tool-schemas';
import { agoricMcpDevopsToolSchemas } from '@/lib/mcp/agoric-devops-tool-schemas';
import { ymaxMcptoolSchemas } from '@/lib/mcp/ymax-tool-schemas';
import { fetchMcpServerTools, cleanupMcpClients, type ServerConfig, type CachedClient } from './test-helpers';

const MCP_SERVERS: Record<string, ServerConfig> = {
    agoric: {
        name: 'Agoric MCP Server',
        url: 'https://agoric-mcp-server.agoric-core.workers.dev/sse',
        schemas: agoricMcpToolSchemas,
        schemaFile: 'lib/mcp/agoric-tool-schemas.ts',
    },
    ymax: {
        name: 'Ymax MCP Server',
        url: 'https://ymax-mcp-server.agoric-core.workers.dev/sse',
        schemas: ymaxMcptoolSchemas,
        schemaFile: 'lib/mcp/ymax-tool-schemas.ts',
    },
    devops: {
        name: 'Agoric DevOps MCP Server',
        url: 'https://agoric-mcp-devops-server.agoric-core.workers.dev/sse',
        schemas: agoricMcpDevopsToolSchemas,
        schemaFile: 'lib/mcp/agoric-devops-tool-schemas.ts',
    },
};

const mcpClientCache: Record<string, CachedClient> = {};

const TEST_TIMEOUT = 60_000;

describe('MCP Server Schema Coverage', () => {
    afterAll(async () => {
        await cleanupMcpClients(mcpClientCache, MCP_SERVERS);
    });

    Object.entries(MCP_SERVERS).forEach(([serverKey, serverConfig]) => {
        describe(serverConfig.name, () => {
            it('should have matching schemas for all MCP server tools', { timeout: TEST_TIMEOUT }, async () => {
                const serverTools = await fetchMcpServerTools(serverKey, serverConfig, mcpClientCache);
                const definedSchemas = Object.keys(serverConfig.schemas);

                console.log(`\n ${serverConfig.name} Validation:`);
                console.log(`   Server tools: ${serverTools.length}`);
                console.log(`   Defined schemas: ${definedSchemas.length}`);

                expect(
                    definedSchemas.length,
                    `Schema count mismatch in ${serverConfig.schemaFile}: expected ${serverTools.length} but got ${definedSchemas.length}`
                ).toBe(serverTools.length);

                const missingSchemas = serverTools.filter(
                    (tool) => !definedSchemas.includes(tool)
                );

                if (missingSchemas.length > 0) {
                    console.error('\n Missing schemas for tools:');
                    missingSchemas.forEach((tool) => console.error(`   - ${tool}`));
                }

                expect(
                    missingSchemas,
                    `Missing schemas in ${serverConfig.schemaFile} for tools: ${missingSchemas.join(', ')}`
                ).toHaveLength(0);
            });
        });
    });
});