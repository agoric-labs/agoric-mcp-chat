import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s for MCP server connections over internet
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
