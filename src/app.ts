/**
 * Main application entry point
 * Starts the MCP server
 */

import { startMcpServer } from './mcp-server.js';

/**
 * Main function
 */
async function main() {
  try {
    // Start the MCP server
    await startMcpServer();
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
