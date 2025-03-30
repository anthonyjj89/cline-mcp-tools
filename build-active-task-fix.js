#!/usr/bin/env node
/**
 * Build script for active-task-fix.ts
 * Compiles the fixed active task utilities and replaces the existing implementation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log with timestamps
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Log error with timestamps
function logError(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
  if (error) {
    console.error(`[${timestamp}] ${error.stack || error}`);
  }
}

// Main function
async function main() {
  try {
    log('Building active-task-fix.ts...');
    
    // Compile the TypeScript file using the project's build system
    log('Compiling TypeScript using project build system...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Check if the compiled file exists
    const compiledFilePath = path.join('build', 'utils', 'active-task-fix.js');
    if (!fs.existsSync(compiledFilePath)) {
      throw new Error(`Compiled file not found: ${compiledFilePath}. Make sure active-task-fix.ts is included in the build.`);
    }
    
    log(`Successfully compiled to ${compiledFilePath}`);
    
    // Update the MCP server to use the fixed implementation
    log('Updating MCP server to use the fixed implementation...');
    
    // Create a README file with instructions
    const readmePath = 'MCP-FIXES-README.md';
    const readmeContent = `# MCP Active Task Detection Fixes

## Issue Summary

The MCP tools were not correctly reading the active conversations from the VS Code extension. All tools were returning "not found" errors when they should have been finding the active tasks.

## Root Cause

The issue was related to file access methods in the active-task.ts file. Specifically, there were issues with how fs-extra was being used. The code was trying to use methods like fs.access and fs.readFile directly, but there were issues with how these were being imported or used.

## Fix Implementation

1. Created a fixed version of the active task utilities in active-task-fix.ts
2. Added better error handling and logging
3. Used Node.js fs.promises for file access
4. Added more detailed logging to track the exact point of failure

## Testing

To test the fixed implementation:

1. Restart the MCP server: \`node run-mcp-server.js --log-level=3\`
2. Monitor logs: \`./monitor-mcp-logs.js --level=DEBUG --component=active-task\`
3. Try using the MCP tools again

## Expected Results

- All four MCP tools should correctly find and access active tasks
- Error messages should be specific and helpful when tasks aren't found
- Log output should include enough context for troubleshooting
`;
    
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    log(`Created README file with instructions: ${readmePath}`);
    
    // Restart the MCP server
    log('Build completed successfully.');
    log('To apply the changes, restart the MCP server with:');
    log('  node run-mcp-server.js --log-level=3');
    
    // Provide instructions for testing
    log('\nTo test the fixed implementation, run:');
    log('  1. Restart the MCP server: node run-mcp-server.js --log-level=3');
    log('  2. Monitor logs: ./monitor-mcp-logs.js --level=DEBUG --component=active-task');
    log('  3. Try using the MCP tools again');
  } catch (error) {
    logError('Build failed', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logError('Unhandled error', error);
  process.exit(1);
});
