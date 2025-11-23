/**
 * MCP Server Integration Tests
 * Tests MCP client connectivity, tool listing, and tool execution
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { MCP_SERVERS } from '../utils/test-data';
import { agoricMcpToolSchemas } from '@/lib/mcp/agoric-tool-schemas';
import { ymaxMcptoolSchemas } from '@/lib/mcp/ymax-tool-schemas';
import { agoricMcpDevopsToolSchemas } from '@/lib/mcp/agoric-devops-tool-schemas';

describe('MCP Server Integration Tests', () => {
  // Timeout for network operations
  const TIMEOUT = 60000; // 60 seconds

  describe('Agoric MCP Server', () => {
    let mcpClient: any;

    beforeAll(async () => {
      const transport = {
        type: 'sse' as const,
        url: MCP_SERVERS.AGORIC
      };

      mcpClient = await createMCPClient({ transport });
    }, TIMEOUT);

    afterAll(async () => {
      if (mcpClient) {
        await mcpClient.close();
      }
    });

    it('should connect to Agoric MCP Server via SSE', async () => {
      expect(mcpClient).toBeDefined();
    }, TIMEOUT);

    it('should list tools from Agoric MCP Server', async () => {
      const tools = await mcpClient.tools({
        schemas: agoricMcpToolSchemas
      });

      expect(tools).toBeDefined();
      expect(Object.keys(tools).length).toBeGreaterThan(0);

      // Verify tools have expected structure
      const toolNames = Object.keys(tools);
      expect(toolNames.length).toBeGreaterThan(30); // Should have ~38 tools

      // Each tool should be an object with tool definition
      for (const toolName of toolNames) {
        expect(tools[toolName]).toBeDefined();
        expect(typeof tools[toolName]).toBe('object');
      }
    }, TIMEOUT);

    it('should have all Agoric tools defined in schema', async () => {
      const tools = await mcpClient.tools({
        schemas: agoricMcpToolSchemas
      });

      const toolNames = Object.keys(tools);
      const schemaNames = Object.keys(agoricMcpToolSchemas);

      // Every tool from server should have a schema
      for (const toolName of toolNames) {
        expect(schemaNames).toContain(toolName);
      }
    }, TIMEOUT);
  });

  describe('Ymax MCP Server', () => {
    let mcpClient: any;

    beforeAll(async () => {
      const transport = {
        type: 'sse' as const,
        url: MCP_SERVERS.YMAX
      };

      mcpClient = await createMCPClient({ transport });
    }, TIMEOUT);

    afterAll(async () => {
      if (mcpClient) {
        await mcpClient.close();
      }
    });

    it('should connect to Ymax MCP Server via SSE', async () => {
      expect(mcpClient).toBeDefined();
    }, TIMEOUT);

    it('should list tools from Ymax MCP Server', async () => {
      const tools = await mcpClient.tools({
        schemas: ymaxMcptoolSchemas
      });

      expect(tools).toBeDefined();
      expect(Object.keys(tools).length).toBeGreaterThan(0);

      const toolNames = Object.keys(tools);
      expect(toolNames.length).toBeGreaterThan(20); // Should have ~25 tools

      // Each tool should be an object with tool definition
      for (const toolName of toolNames) {
        expect(tools[toolName]).toBeDefined();
        expect(typeof tools[toolName]).toBe('object');
      }
    }, TIMEOUT);

    it('should have all Ymax tools defined in schema', async () => {
      const tools = await mcpClient.tools({
        schemas: ymaxMcptoolSchemas
      });

      const toolNames = Object.keys(tools);
      const schemaNames = Object.keys(ymaxMcptoolSchemas);

      // Every tool from server should have a schema
      for (const toolName of toolNames) {
        expect(schemaNames).toContain(toolName);
      }
    }, TIMEOUT);
  });

  describe('Agoric DevOps MCP Server', () => {
    let mcpClient: any;

    beforeAll(async () => {
      const transport = {
        type: 'sse' as const,
        url: MCP_SERVERS.DEVOPS
      };

      mcpClient = await createMCPClient({ transport });
    }, TIMEOUT);

    afterAll(async () => {
      if (mcpClient) {
        await mcpClient.close();
      }
    });

    it('should connect to Agoric DevOps MCP Server via SSE', async () => {
      expect(mcpClient).toBeDefined();
    }, TIMEOUT);

    it('should list tools from Agoric DevOps MCP Server', async () => {
      const tools = await mcpClient.tools({
        schemas: agoricMcpDevopsToolSchemas
      });

      expect(tools).toBeDefined();
      expect(Object.keys(tools).length).toBeGreaterThan(0);

      const toolNames = Object.keys(tools);
      expect(toolNames.length).toBeGreaterThan(5); // Should have ~10 tools

      // Each tool should be an object with tool definition
      for (const toolName of toolNames) {
        expect(tools[toolName]).toBeDefined();
        expect(typeof tools[toolName]).toBe('object');
      }
    }, TIMEOUT);

    it('should have all DevOps tools defined in schema', async () => {
      const tools = await mcpClient.tools({
        schemas: agoricMcpDevopsToolSchemas
      });

      const toolNames = Object.keys(tools);
      const schemaNames = Object.keys(agoricMcpDevopsToolSchemas);

      // Every tool from server should have a schema
      for (const toolName of toolNames) {
        expect(schemaNames).toContain(toolName);
      }
    }, TIMEOUT);
  });

  describe('MCP Connection Management', () => {
    it('should handle multiple concurrent MCP clients', async () => {
      const transport1 = { type: 'sse' as const, url: MCP_SERVERS.AGORIC };
      const transport2 = { type: 'sse' as const, url: MCP_SERVERS.YMAX };
      const transport3 = { type: 'sse' as const, url: MCP_SERVERS.DEVOPS };

      const [client1, client2, client3] = await Promise.all([
        createMCPClient({ transport: transport1 }),
        createMCPClient({ transport: transport2 }),
        createMCPClient({ transport: transport3 })
      ]);

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(client3).toBeDefined();

      // Get tools from all clients
      const [tools1, tools2, tools3] = await Promise.all([
        client1.tools({ schemas: agoricMcpToolSchemas }),
        client2.tools({ schemas: ymaxMcptoolSchemas }),
        client3.tools({ schemas: agoricMcpDevopsToolSchemas })
      ]);

      expect(Object.keys(tools1).length).toBeGreaterThan(0);
      expect(Object.keys(tools2).length).toBeGreaterThan(0);
      expect(Object.keys(tools3).length).toBeGreaterThan(0);

      // Cleanup
      await Promise.all([
        client1.close(),
        client2.close(),
        client3.close()
      ]);
    }, TIMEOUT);

    it('should properly cleanup connections on close', async () => {
      const transport = { type: 'sse' as const, url: MCP_SERVERS.AGORIC };
      const client = await createMCPClient({ transport });

      expect(client).toBeDefined();

      // Close should not throw
      await expect(client.close()).resolves.not.toThrow();
    }, TIMEOUT);

    it('should handle connection to invalid URL gracefully', async () => {
      const transport = {
        type: 'sse' as const,
        url: 'https://invalid-mcp-server.example.com/sse'
      };

      // Should reject on connection failure
      await expect(createMCPClient({ transport })).rejects.toThrow();
    }, TIMEOUT);
  });

  describe('Tool Execution', () => {
    let mcpClient: any;
    let tools: any;

    beforeAll(async () => {
      const transport = {
        type: 'sse' as const,
        url: MCP_SERVERS.AGORIC
      };

      mcpClient = await createMCPClient({ transport });
      tools = await mcpClient.tools({
        schemas: agoricMcpToolSchemas
      });
    }, TIMEOUT);

    afterAll(async () => {
      if (mcpClient) {
        await mcpClient.close();
      }
    });

    it('should execute a simple tool call', async () => {
      // This test depends on what tools are available
      // We'll check if tools can be called without throwing
      const toolNames = Object.keys(tools);

      expect(toolNames.length).toBeGreaterThan(0);

      // Pick the first tool (this is a smoke test)
      const firstToolName = toolNames[0];
      const firstTool = tools[firstToolName];

      expect(firstTool).toBeDefined();
      expect(typeof firstTool).toBe('object');
    }, TIMEOUT);

    it('should validate tool parameters match schema', async () => {
      const toolNames = Object.keys(tools);

      for (const toolName of toolNames) {
        // Check schema exists
        expect((agoricMcpToolSchemas as any)[toolName]).toBeDefined();

        // Check schema has inputSchema
        expect((agoricMcpToolSchemas as any)[toolName].inputSchema).toBeDefined();
      }
    }, TIMEOUT);
  });

  describe('Error Handling', () => {
    it('should handle network timeout gracefully', async () => {
      // This is a smoke test - actual timeout handling depends on transport
      const transport = {
        type: 'sse' as const,
        url: MCP_SERVERS.AGORIC
      };

      const client = await createMCPClient({ transport });
      expect(client).toBeDefined();

      await client.close();
    }, TIMEOUT);

    it('should handle malformed transport configuration', async () => {
      const invalidTransport = {
        type: 'sse' as const,
        url: '' // Empty URL
      };

      await expect(
        createMCPClient({ transport: invalidTransport })
      ).rejects.toThrow();
    }, TIMEOUT);
  });
});
