#!/usr/bin/env node

/**
 * Simple MCP test script
 * 
 * This script tests basic MCP server communication with proper
 * JSON-RPC protocol handling.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the MCP server - using index.js which is the correct entry point
const SERVER_PATH = path.join(__dirname, 'build', 'index.js');

// Global variables
let server = null;
let rl = null;

// Start the MCP server
function startServer() {
  console.log(`Starting MCP server: ${SERVER_PATH}`);
  
  server = spawn('node', [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Set up readline interface for line-by-line processing
  rl = createInterface({
    input: server.stdout,
    crlfDelay: Infinity
  });
  
  // Handle stdout line by line
  rl.on('line', (line) => {
    if (line.trim()) {
      console.log(`[SERVER OUT] ${line}`);
      processResponse(line);
    }
  });
  
  // Handle stderr
  server.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log(`[SERVER ERR] ${message}`);
    }
  });
  
  // Handle server exit
  server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
    cleanup();
  });
  
  // Handle errors
  server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
    cleanup();
  });
}

// Process a response from the server
function processResponse(line) {
  try {
    const response = JSON.parse(line);
    console.log('Parsed response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error(`Error parsing response: ${err.message}`);
    console.error(`Problematic line: ${line}`);
  }
}

// Send a request to the server
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  };
  
  console.log(`Sending request (${method}):`);
  console.log(JSON.stringify(request, null, 2));
  
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Clean up resources
function cleanup() {
  if (rl) {
    rl.close();
    rl = null;
  }
  
  if (server) {
    server.kill();
    server = null;
  }
  
  console.log('Cleanup complete');
}

// Main function
async function main() {
  try {
    // Start the server
    startServer();
    
    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Initialize the server
    console.log('Initializing server...');
    sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'mcp-simple-client',
        version: '1.0.0'
      }
    });
    
    // Wait for the server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to list tools
    console.log('Requesting tool list...');
    sendRequest('list_tools');
    
    // Wait for the response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to call a tool
    console.log('Calling get_active_task tool...');
    sendRequest('call_tool', {
      name: 'get_active_task',
      arguments: {}
    });
    
    // Wait for the response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Keep the script running for a bit to collect responses
    console.log('Waiting for responses...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clean up
    console.log('Test complete, cleaning up...');
    cleanup();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    cleanup();
  }
}

// Run the main function
main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  cleanup();
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up...');
  cleanup();
  process.exit(0);
});
