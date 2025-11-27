import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

interface ServerConfig {
    name: string;
    url: string;
    schemas: Record<string, any>;
}

export async function fetchMcpServerTools(
    serverKey: string,
    serverConfig: ServerConfig,
    cache: Record<string, { client: any; tools: string[] }>
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
    cache: Record<string, { client: any; tools: string[] }>,
    mcpServers: Record<string, ServerConfig>
) {
    for (const [key, cached] of Object.entries(cache)) {
        try {
            if (cached.client && typeof cached.client.close === 'function') {
                await cached.client.close();
            }
        } catch (error) {
            console.warn(`Error closing ${key} client:`, error);
        }
    }
}
