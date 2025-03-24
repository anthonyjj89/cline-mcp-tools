#!/usr/bin/env node

/**
 * Test script to verify the MCP server connection
 * This script tests if the MCP server can connect properly after the CommonJS import fix
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the MCP server
const serverPath = path.join(__dirname, 'build', 'index.js');

console.log('Testing MCP server connection...');
console.log(`Server path: ${serverPath}`);

// Spawn the MCP server process
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
serverProcess.stdout.on('data', (data) => {
  console.log(`[SERVER STDOUT]: ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.log(`[SERVER STDERR]: ${data.toString().trim()}`);
});

// Handle server exit
serverProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('MCP server exited successfully');
  } else {
    console.error(`MCP server exited with code ${code}`);
  }
});

// Send a test message to the server
setTimeout(() => {
  console.log('Sending test message to server...');
  
  const testMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  });
  
  serverProcess.stdin.write(testMessage + '\n');
  
  // Wait for response and then terminate
  setTimeout(() => {
    console.log('Test completed, terminating server...');
    serverProcess.kill();
  }, 2000);
}, 1000);
