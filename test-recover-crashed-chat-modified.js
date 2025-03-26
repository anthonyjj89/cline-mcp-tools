/**
 * Modified test script for the recover_crashed_chat MCP tool
 * This script uses a similar approach to test-mcp-connection.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the MCP server
const serverPath = path.join(__dirname, 'build', 'index.js');

console.log('Testing recover_crashed_chat MCP tool...');
console.log(`Server path: ${serverPath}`);

// Spawn the MCP server process
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
let serverOutput = '';
serverProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  serverOutput += output;
  console.log(`[SERVER STDOUT]: ${output}`);
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

// Function to send a request to the server and wait for a response
function sendRequest(request) {
  return new Promise((resolve, reject) => {
    // Clear previous output
    serverOutput = '';
    
    // Set up a timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error('Request timed out'));
    }, 10000);
    
    // Set up a listener for the response
    const responseListener = (data) => {
      const output = data.toString().trim();
      
      try {
        // Try to parse the response as JSON
        const response = JSON.parse(output);
        
        // Check if this is the response to our request
        if (response.id === request.id) {
          // Remove the listener and clear the timeout
          serverProcess.stdout.removeListener('data', responseListener);
          clearTimeout(timeout);
          
          // Resolve with the response
          resolve(response);
        }
      } catch (error) {
        // Not a valid JSON response, continue listening
      }
    };
    
    // Add the listener
    serverProcess.stdout.on('data', responseListener);
    
    // Send the request
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

// Main test function
async function testRecoverCrashedChat() {
  try {
    // First, initialize the server
    console.log('Initializing server...');
    const initRequest = {
      jsonrpc: '2.0',
      id: '1',
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
    
    const initResponse = await sendRequest(initRequest);
    console.log('Server initialized:', initResponse.result.serverInfo);
    
    // Skip the listTools step and directly call the recover_crashed_chat tool
    console.log('Directly calling recover_crashed_chat tool...');
    
    // Use the specific task ID for testing
    const testTaskId = '1742912459362';
    console.log(`Using task ${testTaskId} for testing...`);
    
    // Call the recover_crashed_chat tool
    console.log('Calling recover_crashed_chat tool...');
    const recoverRequest = {
      jsonrpc: '2.0',
      id: '3',
      method: 'callTool',
      params: {
        name: 'recover_crashed_chat',
        arguments: {
          task_id: testTaskId,
          max_length: 1000,
          include_code_snippets: true,
          save_to_crashreports: true
        }
      }
    };
    
    const recoverResponse = await sendRequest(recoverRequest);
    
    if (!recoverResponse.result || !recoverResponse.result.content || recoverResponse.result.content.length === 0) {
      throw new Error('Invalid response format: recovery result not found in response');
    }
    
    // Parse and display the result
    const result = JSON.parse(recoverResponse.result.content[0].text);
    
    console.log('\n=== Recovery Result ===');
    console.log(`Task ID: ${result.task_id || 'N/A'}`);
    console.log(`Main Topic: ${result.main_topic || 'N/A'}`);
    console.log(`Summary: ${result.summary ? result.summary.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`Crash Report Saved: ${result.crash_report_saved || false}`);
    console.log(`Crash Report ID: ${result.crash_report_id || 'N/A'}`);
    console.log(`Crash Report Path: ${result.crash_report_path || 'N/A'}`);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    // Terminate the server
    console.log('Terminating server...');
    serverProcess.kill();
  }
}

// Run the test
testRecoverCrashedChat();
