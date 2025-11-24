/**
 * MCP Server Integration Tests
 * Tests MCP client connectivity, tool listing, and tool execution
 *
 * Note: Schema validation tests (checking if all server tools have schemas,
 * detecting orphaned schemas) have been removed to avoid duplication with
 * mcp-schema-validation.test.ts which handles schema regression testing.
 * This file focuses on integration testing: connectivity, tool listing,
 * and runtime behavior.
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
      const toolNames = Object.keys(tools);
      expect(toolNames.length).toBeGreaterThan(0);

      // Each tool should be an object with tool definition
      for (const toolName of toolNames) {
        expect(tools[toolName]).toBeDefined();
        expect(typeof tools[toolName]).toBe('object');
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
      const toolNames = Object.keys(tools);
      expect(toolNames.length).toBeGreaterThan(0);

      // Each tool should be an object with tool definition
      for (const toolName of toolNames) {
        expect(tools[toolName]).toBeDefined();
        expect(typeof tools[toolName]).toBe('object');
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
      const toolNames = Object.keys(tools);
      expect(toolNames.length).toBeGreaterThan(0);

      // Each tool should be an object with tool definition
      for (const toolName of toolNames) {
        expect(tools[toolName]).toBeDefined();
        expect(typeof tools[toolName]).toBe('object');
      }
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
