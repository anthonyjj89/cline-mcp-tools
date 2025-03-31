#!/usr/bin/env node
/**
 * Run MCP Server with Fixes
 * 
 * This script runs the MCP server with the fixed implementations:
 * - Diagnostic logging
 * - Absolute path resolution
 * - Fallback logic for active tasks
 * - Improved error handling
 */

import { startMcpServer } from './build/mcp-server.js';
import { disableConsoleLogging } from './build/utils/diagnostic-logger.js';

// Parse command line arguments
const args = process.argv.slice(2);
let logLevel = 2; // Default to INFO

// Parse log level argument
const logLevelArg = args.find(arg => arg.startsWith('--log-level='));
if (logLevelArg) {
  const level = parseInt(logLevelArg.split('=')[1], 10);
  if (!isNaN(level) && level >= 0 && level <= 3) {
    logLevel = level;
  }
}

// Log with timestamps
function log(message) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${message}`);
}

// Log levels
const LOG_LEVEL_NAMES = ['ERROR', 'WARNING', 'INFO', 'DEBUG'];

// Start the MCP server
log(`Starting MCP server with log level ${logLevel} (${LOG_LEVEL_NAMES[logLevel]})...`);

// Set the LOG_LEVEL environment variable
process.env.LOG_LEVEL = logLevel.toString();

// Disable console logging for MCP server mode
disableConsoleLogging();

// Start the MCP server
startMcpServer().catch(error => {
  // Log errors to stderr even if console logging is disabled for the server itself
  console.error(`[${new Date().toISOString()}] ERROR starting MCP server: ${error.message}`);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  log('Shutting down MCP server...');
  process.exit(0);
});

log('MCP server started. Press Ctrl+C to stop.');
