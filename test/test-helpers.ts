import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

interface ToolSchema {
    inputSchema: unknown;
}

export interface ServerConfig {
    name: string;
    url: string;
    schemas: Record<string, ToolSchema>;
}

export async function fetchMcpServerTools(
    serverKey: string,
    serverConfig: ServerConfig
): Promise<string[]> {
    let mcpClient;
    try {
        mcpClient = await createMCPClient({
            transport: {
                type: 'sse',
                url: serverConfig.url,
            },
        });

        const mcpTools = await mcpClient.tools();
        const toolNames = Object.keys(mcpTools);

        return toolNames;
    } catch (error) {
        throw new Error(
            `Failed to fetch tools from ${serverConfig.name}: ${error instanceof Error ? error.message : String(error)}`
        );
    } finally {
        // Clean up the client connection
        if (mcpClient?.close) {
            try {
                await mcpClient.close();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`Error closing ${serverKey} client: ${errorMessage}`);
            }
        }
    }
}
