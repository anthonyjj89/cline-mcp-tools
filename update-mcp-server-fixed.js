#!/usr/bin/env node
/**
 * Update MCP Server Script
 * 
 * This script updates the MCP server to use the fixed active task implementation.
 * It modifies the import statement in mcp-server.ts to use active-task-fixed.js instead of active-task.js.
 */

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
    log('Updating MCP server to use fixed active task implementation...');
    
    // Path to MCP server file
    const mcpServerPath = path.join('src', 'mcp-server.ts');
    
    // Read the MCP server file
    log(`Reading MCP server file: ${mcpServerPath}`);
    const mcpServerContent = fs.readFileSync(mcpServerPath, 'utf8');
    
    // Create a backup of the original file
    const backupPath = `${mcpServerPath}.backup`;
    log(`Creating backup of original file: ${backupPath}`);
    fs.writeFileSync(backupPath, mcpServerContent, 'utf8');
    
    // Create a new version of the MCP server file with direct active task handling
    log('Creating new version of MCP server file with direct active task handling...');
    
    // Replace the active-task.js import with active-task-fixed.js
    const updatedContent = mcpServerContent.replace(
      /import \{[^}]*\} from ['"]\.\/utils\/active-task\.js['"];/,
      `import {
  getActiveTaskWithCache, 
  getAllActiveTasksWithCache,
  getApiConversationFilePath,
  validateTaskExists,
  writeAdviceToTask,
  logError,
  logWarning,
  logInfo,
  setLogLevel,
  LogLevel,
  ActiveTaskErrorCode
} from './utils/active-task-fixed.js';`
    );
    
    // Write the updated content
    log(`Writing updated content to: ${mcpServerPath}`);
    fs.writeFileSync(mcpServerPath, updatedContent, 'utf8');
    
    log('MCP server updated successfully.');
    log('To apply the changes, rebuild the project and restart the MCP server:');
    log('  1. npm run build');
    log('  2. node run-mcp-server.js --log-level=3');
  } catch (error) {
    logError('Update failed', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logError('Unhandled error', error);
  process.exit(1);
});
