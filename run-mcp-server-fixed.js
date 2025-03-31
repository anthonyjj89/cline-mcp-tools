#!/usr/bin/env node
/**
 * Run MCP Server with Fixed Active Task Implementation
 * 
 * This script runs the MCP server with the fixed active task implementation.
 * It sets the log level based on the --log-level argument.
 */

import { spawn } from 'child_process';
import { startMcpServer } from './build/mcp-server.js';

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

// Start the MCP server
startMcpServer().catch(error => {
  log(`Error starting MCP server: ${error.message}`);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  log('Shutting down MCP server...');
  process.exit(0);
});

log('MCP server started. Press Ctrl+C to stop.');
