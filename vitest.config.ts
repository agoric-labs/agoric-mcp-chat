import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s for MCP server connections over internet
    hookTimeout: 60000,
    setupFiles: ['./test/setup.ts'], // Setup file for mocking AI SDK
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
