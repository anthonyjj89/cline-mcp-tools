#!/usr/bin/env node

/**
 * Launcher script for the Cline Chat Reader MCP Server
 * Starts the MCP server with proper error handling and log level control
 */

// Process command line arguments
const args = process.argv.slice(2);
let logLevel = 1; // Default to WARNING level

// Parse log level from command line arguments
const logLevelArg = args.find(arg => arg.startsWith('--log-level='));
if (logLevelArg) {
  const level = parseInt(logLevelArg.split('=')[1], 10);
  if (!isNaN(level) && level >= 0 && level <= 3) {
    logLevel = level;
  }
}

// Import the active-task module to set log level
import('./build/utils/active-task.js')
  .then(activeTaskModule => {
    // Set log level before starting the server
    activeTaskModule.setLogLevel(logLevel);
    console.error(`Log level set to: ${Object.keys(activeTaskModule.LogLevel)[logLevel]}`);
    
    // Import and start the MCP server
    return import('./build/mcp-server.js')
      .then(module => {
        // Start the MCP server
        module.startMcpServer()
          .catch(error => {
            console.error('Failed to start MCP server:', error);
            process.exit(1);
          });
      });
  })
  .catch(error => {
    console.error('Failed to import modules:', error);
    process.exit(1);
  });

// Print usage information
console.error(`
Cline Chat Reader MCP Server
---------------------------
Usage: node run-mcp-server.js [options]

Options:
  --log-level=N    Set logging level (0=ERROR, 1=WARNING, 2=INFO, 3=DEBUG)
                   Default: 1 (WARNING)
`);
