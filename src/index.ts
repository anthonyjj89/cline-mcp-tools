#!/usr/bin/env node

/**
 * Main entry point for the Claude Task Reader MCP Server
 */

import { startMcpServer } from './mcp-server.js';

// Start the server
startMcpServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
