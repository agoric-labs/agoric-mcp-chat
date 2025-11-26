/**
 * MCP Tool Schema Validation Test
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
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { agoricMcpToolSchemas } from '@/lib/mcp/agoric-tool-schemas';
import { agoricMcpDevopsToolSchemas } from '@/lib/mcp/agoric-devops-tool-schemas';
import { ymaxMcptoolSchemas } from '@/lib/mcp/ymax-tool-schemas';

// MCP Server configurations
const MCP_SERVERS = {
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

// Cache for MCP client connections and tool lists
const mcpClientCache: Record<string, { client: any; tools: string[] }> = {};

/**
 * Fetch tools from MCP server
 */
async function fetchMcpServerTools(serverKey: string): Promise<string[]> {
    // Return cached result if available
    if (mcpClientCache[serverKey]) {
        return mcpClientCache[serverKey].tools;
    }

    const serverConfig = MCP_SERVERS[serverKey as keyof typeof MCP_SERVERS];

    try {
        console.log(`\n🔌 Connecting to ${serverConfig.name}...`);
        console.log(`   URL: ${serverConfig.url}`);

        const mcpClient = await createMCPClient({
            transport: {
                type: 'sse',
                url: serverConfig.url,
            },
        });

        console.log(`✅ Connected to ${serverConfig.name}`);

        // Get complete tool list from server WITHOUT schema filtering
        // This ensures we catch missing schemas for all server tools
        const mcpTools = await mcpClient.tools();

        const toolNames = Object.keys(mcpTools);

        console.log(`📋 Found ${toolNames.length} tools from ${serverConfig.name}`);

        // Cache the client and tools
        mcpClientCache[serverKey] = {
            client: mcpClient,
            tools: toolNames,
        };

        return toolNames;
    } catch (error) {
        console.error(`Failed to connect to ${serverConfig.name}:`, error);
        throw new Error(
            `Failed to fetch tools from ${serverConfig.name}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Cleanup all MCP clients after tests
 */
async function cleanupMcpClients() {
    console.log('\n Cleaning up MCP client connections...');
    for (const [key, cached] of Object.entries(mcpClientCache)) {
        try {
            if (cached.client && typeof cached.client.close === 'function') {
                await cached.client.close();
                console.log(`Closed connection to ${MCP_SERVERS[key as keyof typeof MCP_SERVERS].name}`);
            }
        } catch (error) {
            console.warn(`Error closing ${key} client:`, error);
        }
    }
}

describe('MCP Tool Schema Validation', () => {
    // Cleanup after all tests complete
    afterAll(async () => {
        await cleanupMcpClients();
    });

    // Set timeout for all tests in this suite (60 seconds for network calls)
    const TEST_TIMEOUT = 60000;

    // Parameterized test suite for all servers
    const serverTestCases = [
        {
            serverKey: 'agoric' as const,
            serverName: 'Agoric MCP Server',
            schemas: agoricMcpToolSchemas,
            schemaFile: 'lib/mcp/agoric-tool-schemas.ts'
        },
        {
            serverKey: 'ymax' as const,
            serverName: 'Ymax MCP Server',
            schemas: ymaxMcptoolSchemas,
            schemaFile: 'lib/mcp/ymax-tool-schemas.ts'
        },
        {
            serverKey: 'devops' as const,
            serverName: 'Agoric DevOps MCP Server',
            schemas: agoricMcpDevopsToolSchemas,
            schemaFile: 'lib/mcp/agoric-devops-tool-schemas.ts'
        }
    ];

    serverTestCases.forEach(({ serverKey, serverName, schemas, schemaFile }) => {
        describe(serverName, () => {
            // Shared data computed once per server
            let serverTools: string[];
            let definedSchemas: string[];

            // Fetch server tools once before all tests in this describe block
            it('should have schemas for all tools from server', { timeout: TEST_TIMEOUT }, async () => {
                serverTools = await fetchMcpServerTools(serverKey);
                definedSchemas = Object.keys(schemas);

                console.log(`\n🔍 ${serverName} Validation:`);
                console.log(`   Server tools: ${serverTools.length}`);
                console.log(`   Defined schemas: ${definedSchemas.length}`);

                // Check for missing schemas
                const missingSchemas = serverTools.filter(
                    (tool) => !definedSchemas.includes(tool)
                );

                if (missingSchemas.length > 0) {
                    console.error('\n❌ Missing schemas for tools:');
                    missingSchemas.forEach((tool) => console.error(`   - ${tool}`));
                }

                expect(
                    missingSchemas,
                    `Missing schemas in ${schemaFile} for tools: ${missingSchemas.join(', ')}`
                ).toHaveLength(0);
            });

            it('should not have orphaned schemas (schemas without corresponding tools)', { timeout: TEST_TIMEOUT }, async () => {
                // Reuse serverTools and definedSchemas from previous test
                const orphanedSchemas = definedSchemas.filter(
                    (schema) => !serverTools.includes(schema)
                );

                if (orphanedSchemas.length > 0) {
                    console.warn('\n⚠️  Orphaned schemas (no matching server tool):');
                    orphanedSchemas.forEach((schema) => console.warn(`   - ${schema}`));
                }

                expect(
                    orphanedSchemas,
                    `Orphaned schemas in ${schemaFile}: ${orphanedSchemas.join(', ')}`
                ).toHaveLength(0);
            });

            it('should have valid schema structure for all defined tools', () => {
                const schemaEntries = Object.entries(schemas);

                schemaEntries.forEach(([toolName, schema]) => {
                    expect(
                        schema,
                        `Schema for ${toolName} should be an object`
                    ).toBeTypeOf('object');

                    expect(
                        schema.inputSchema,
                        `Schema for ${toolName} must have inputSchema property`
                    ).toBeDefined();
                });
            });
        });
    });

    describe('Overall Schema Coverage', () => {
        it('should have complete coverage across all MCP servers', { timeout: TEST_TIMEOUT }, async () => {
            const results = await Promise.all([
                fetchMcpServerTools('agoric'),
                fetchMcpServerTools('ymax'),
                fetchMcpServerTools('devops'),
            ]);

            const [agoricTools, ymaxTools, devopsTools] = results;
            const totalServerTools = agoricTools.length + ymaxTools.length + devopsTools.length;
            const totalDefinedSchemas =
                Object.keys(agoricMcpToolSchemas).length +
                Object.keys(ymaxMcptoolSchemas).length +
                Object.keys(agoricMcpDevopsToolSchemas).length;

            console.log('\n📊 Overall Coverage Summary:');
            console.log(`   Total server tools: ${totalServerTools}`);
            console.log(`   Total defined schemas: ${totalDefinedSchemas}`);
            console.log(`   Agoric: ${agoricTools.length} tools, ${Object.keys(agoricMcpToolSchemas).length} schemas`);
            console.log(`   Ymax: ${ymaxTools.length} tools, ${Object.keys(ymaxMcptoolSchemas).length} schemas`);
            console.log(`   DevOps: ${devopsTools.length} tools, ${Object.keys(agoricMcpDevopsToolSchemas).length} schemas`);

            expect(totalDefinedSchemas).toBeGreaterThan(0);
            expect(totalServerTools).toBeGreaterThan(0);
        });
    });
});