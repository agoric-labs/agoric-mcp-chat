import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

interface ToolSchema {
    inputSchema: unknown;
}

interface MCPClient {
    tools: () => Promise<Record<string, unknown>>;
    close?: () => Promise<void>;
}

export interface ServerConfig {
    name: string;
    url: string;
    schemas: Record<string, ToolSchema>;
    schemaFile: string;
}

export interface CachedClient {
    client: MCPClient;
    tools: string[];
}

export async function fetchMcpServerTools(
    serverKey: string,
    serverConfig: ServerConfig,
    cache: Record<string, CachedClient>
): Promise<string[]> {
    if (cache[serverKey]) {
        return cache[serverKey].tools;
    }

    try {
        const mcpClient = await createMCPClient({
            transport: {
                type: 'sse',
                url: serverConfig.url,
            },
        });

        const mcpTools = await mcpClient.tools();
        const toolNames = Object.keys(mcpTools);

        cache[serverKey] = {
            client: mcpClient,
            tools: toolNames,
        };

        return toolNames;
    } catch (error) {
        throw new Error(
            `Failed to fetch tools from ${serverConfig.name}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export async function cleanupMcpClients(
    cache: Record<string, CachedClient>,
    mcpServers: Record<string, ServerConfig>
): Promise<void> {
    for (const [key, cached] of Object.entries(cache)) {
        try {
            if (cached.client?.close) {
                await cached.client.close();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Error closing ${key} client: ${errorMessage}`);
        }
    }
}
