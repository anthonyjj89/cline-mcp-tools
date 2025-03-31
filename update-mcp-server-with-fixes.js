#!/usr/bin/env node
/**
 * Update MCP Server With Fixes
 * 
 * This script updates the MCP server to use the fixed implementations:
 * 1. Replaces paths.ts with paths-fixed.ts
 * 2. Adds diagnostic-logger.ts
 * 3. Updates the MCP server to use the fixed implementations
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
    log('Updating MCP server with fixes...');
    
    // Step 1: Update the MCP server to use the diagnostic logger
    log('Step 1: Updating MCP server to use diagnostic logger...');
    
    // Path to MCP server file
    const mcpServerPath = path.join('src', 'mcp-server.ts');
    
    // Read the MCP server file
    log(`Reading MCP server file: ${mcpServerPath}`);
    const mcpServerContent = fs.readFileSync(mcpServerPath, 'utf8');
    
    // Create a backup of the original file
    const backupPath = `${mcpServerPath}.backup`;
    log(`Creating backup of original file: ${backupPath}`);
    fs.writeFileSync(backupPath, mcpServerContent, 'utf8');
    
    // Update the MCP server to use the diagnostic logger
    log('Updating MCP server to use diagnostic logger...');
    
    // Add import for diagnostic logger
    let updatedContent = mcpServerContent.replace(
      "import { Server } from '@modelcontextprotocol/sdk/server/index.js';",
      `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  initDiagnosticLogger, 
  setLogLevel, 
  LogLevel, 
  logError, 
  logWarning, 
  logInfo, 
  logDebug 
} from './utils/diagnostic-logger.js';`
    );
    
    // Replace paths import with paths-fixed import
    updatedContent = updatedContent.replace(
      "import { \n" +
      "  getVSCodeTasksDirectory, \n" +
      "  getApiConversationFilePath, \n" +
      "  getTasksDirectoryForTask, \n" +
      "  findTaskAcrossPaths,\n" +
      "  ensureCrashReportsDirectories,\n" +
      "  isStandardClineExtensionPath\n" +
      "} from './utils/paths.js';",
      
      "import { \n" +
      "  getVSCodeTasksDirectory, \n" +
      "  getApiConversationFilePath, \n" +
      "  getTasksDirectoryForTask, \n" +
      "  findTaskAcrossPaths,\n" +
      "  ensureCrashReportsDirectories,\n" +
      "  isStandardClineExtensionPath\n" +
      "} from './utils/paths-fixed.js';"
    );
    
    // Add diagnostic logger initialization to startMcpServer function
    updatedContent = updatedContent.replace(
      "export async function startMcpServer() {",
      `export async function startMcpServer() {
  try {
    // Initialize diagnostic logger
    const logLevel = process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : LogLevel.INFO;
    initDiagnosticLogger(logLevel);
    logInfo(\`Starting MCP server with log level \${LogLevel[logLevel]} (\${logLevel})\`);`
    );
    
    // Update error handling in startMcpServer function
    updatedContent = updatedContent.replace(
      "  } catch (error) {\n" +
      "    console.error('Error starting MCP server:', error);\n" +
      "    process.exit(1);\n" +
      "  }",
      
      "  } catch (error) {\n" +
      "    logError('Error starting MCP server', error);\n" +
      "    process.exit(1);\n" +
      "  }"
    );
    
    // Write the updated content
    log(`Writing updated content to: ${mcpServerPath}`);
    fs.writeFileSync(mcpServerPath, updatedContent, 'utf8');
    
    // Step 2: Copy paths-fixed.ts to paths.ts
    log('Step 2: Copying paths-fixed.ts to paths.ts...');
    
    const pathsFixedPath = path.join('src', 'utils', 'paths-fixed.ts');
    const pathsPath = path.join('src', 'utils', 'paths.ts');
    
    // Create a backup of the original paths.ts file
    const pathsBackupPath = `${pathsPath}.backup`;
    log(`Creating backup of original paths.ts file: ${pathsBackupPath}`);
    fs.copyFileSync(pathsPath, pathsBackupPath);
    
    // Copy paths-fixed.ts to paths.ts
    log(`Copying ${pathsFixedPath} to ${pathsPath}`);
    fs.copyFileSync(pathsFixedPath, pathsPath);
    
    log('MCP server updated successfully with fixes.');
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
