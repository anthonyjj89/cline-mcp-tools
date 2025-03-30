#!/usr/bin/env node

/**
 * Cleanup script for the Cline Chat Reader MCP Server
 * Removes old MCP server files that are no longer needed
 */

import * as fs from 'fs';
import * as path from 'path';

// Files to be removed
const filesToRemove = [
  // Old MCP server implementations
  'src/mcp-server-integrated.ts',
  'src/mcp-server-fixed-content.ts',
  'src/mcp-server-fixed.ts',
  'src/mcp-server-combined.ts',
  'src/mcp-server-new.ts',
  'build/mcp-server-integrated.js',
  'build/mcp-server-fixed-content.js',
  'build/mcp-server-fixed.js',
  'build/mcp-server-combined.js',
  'build/mcp-server-new.js',
  
  // Old launcher scripts
  'run-fixed-mcp-server.js',
  'run-integrated-mcp-server.js',
  'run-combined-mcp-server.js',
  
  // Old configuration files
  'tsconfig.integrated.json',
  
  // Old documentation files
  'README-FIXED-MCP.md',
  'README-INTEGRATED-MCP.md',
  'JSON-PARSING-FIX.md',
  'MANAGEMENT-REPORT.md',
  
  // Old test files
  'test-message-content-transform.js',
  'test-message-reader.js'
];

// Log removed files
const removedFiles = [];
const notFoundFiles = [];

// Remove files
for (const file of filesToRemove) {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      removedFiles.push(file);
      console.log(`Removed: ${file}`);
    } else {
      notFoundFiles.push(file);
      console.log(`Not found: ${file}`);
    }
  } catch (error) {
    console.error(`Error removing ${file}:`, error.message);
  }
}

// Print summary
console.log('\nCleanup Summary:');
console.log(`- Removed ${removedFiles.length} files`);
console.log(`- Not found ${notFoundFiles.length} files`);

console.log('\nRemoved files:');
removedFiles.forEach(file => console.log(`- ${file}`));

console.log('\nNot found files:');
notFoundFiles.forEach(file => console.log(`- ${file}`));

console.log('\nCleanup completed successfully!');
