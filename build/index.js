#!/usr/bin/env node

/**
 * Main entry point for the Claude Task Reader MCP Server
 */
import { startMcpServer } from './mcp-server.js';

// Re-export the startMcpServer function
export { startMcpServer };

// Start the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
