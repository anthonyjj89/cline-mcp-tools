/**
 * Simple test script for the recover_crashed_chat MCP tool
 * This script uses a similar approach to test-get-active-task.js
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the MCP server
const SERVER_PATH = path.join(__dirname, 'build', 'mcp-server.js');

// Test the recover_crashed_chat tool
async function testRecoverCrashedChat() {
  try {
    console.log('Testing recover_crashed_chat tool...');
    console.log(`Server path: ${SERVER_PATH}`);
    
    // Start the MCP server
    const server = spawn('node', [SERVER_PATH]);
    
    // First, initialize the server
    console.log('Initializing server...');
    const initRequest = {
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
    };
    
    console.log('Sending initialize request to server...');
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    
    // Wait a bit for the server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Prepare the tool request
    const toolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'callTool',
      params: {
        name: 'recover_crashed_chat',
        arguments: {
          task_id: '1742912459362',
          max_length: 1000,
          include_code_snippets: true,
          save_to_crashreports: true
        }
      }
    };
    
    console.log('Sending tool request to server...');
    server.stdin.write(JSON.stringify(toolRequest) + '\n');
    
    // Collect the response
    let responseData = '';
    server.stdout.on('data', (data) => {
      responseData += data.toString();
      console.log(`[SERVER STDOUT]: ${data.toString().trim()}`);
    });
    
    // Log server errors
    server.stderr.on('data', (data) => {
      console.log(`[SERVER STDERR]: ${data.toString().trim()}`);
    });
    
    // Handle server exit
    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
      
      // Parse the response
      try {
        const response = JSON.parse(responseData);
        console.log('Response from recover_crashed_chat:');
        console.log(JSON.stringify(response, null, 2));
        
        // Check if the response contains recovery result
        if (response.result && response.result.content && response.result.content[0].text) {
          const content = JSON.parse(response.result.content[0].text);
          console.log('\n=== Recovery Result ===');
          console.log(`Task ID: ${content.task_id || 'N/A'}`);
          console.log(`Main Topic: ${content.main_topic || 'N/A'}`);
          console.log(`Summary: ${content.summary ? content.summary.substring(0, 100) + '...' : 'N/A'}`);
          console.log(`Crash Report Saved: ${content.crash_report_saved || false}`);
          console.log(`Crash Report ID: ${content.crash_report_id || 'N/A'}`);
          console.log(`Crash Report Path: ${content.crash_report_path || 'N/A'}`);
          console.log('✅ Test passed: Successfully recovered crashed chat');
        } else {
          console.log('❌ Test failed: Invalid response format');
        }
      } catch (err) {
        console.error('Error parsing response:', err);
        console.log('Raw response:', responseData);
      }
    });
    
    // Handle errors
    server.on('error', (err) => {
      console.error('Error running server:', err);
    });
    
    // Kill the server after a timeout
    setTimeout(() => {
      server.kill();
    }, 10000);
  } catch (err) {
    console.error('Error running test:', err);
  }
}

// Run the test
testRecoverCrashedChat();
