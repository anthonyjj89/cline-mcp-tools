/**
 * Test script for the analyze_conversation MCP tool
 * This script demonstrates how to use the analyze_conversation tool from Claude
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getVSCodeTasksDirectory } from '../../../build/utils/paths.js';
import { listTasks } from '../../../build/services/index.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Helper function to print colored output
function print(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to print section headers
function printHeader(message) {
  console.log('\n');
  print('='.repeat(80), colors.cyan);
  print(` ${message} `, colors.cyan + colors.bright);
  print('='.repeat(80), colors.cyan);
}

// Function to run the MCP server and send a request
async function testMcpAnalyzeConversation() {
  printHeader('MCP Analyze Conversation Tool Test');
  
  try {
    // Get the VS Code tasks directory
    const tasksDir = getVSCodeTasksDirectory();
    print(`Using VS Code tasks directory: ${tasksDir}`, colors.blue);
    
    // List recent tasks
    print('\nListing recent tasks...', colors.blue);
    const tasks = await listTasks(tasksDir);
    
    if (tasks.length === 0) {
      print('No tasks found. Please run Claude Desktop and create a task first.', colors.red);
      return;
    }
    
    // Get the most recent task
    const latestTask = tasks[0];
    print(`\nFound ${tasks.length} tasks. Using the most recent task:`, colors.green);
    print(`Task ID: ${latestTask.id}`, colors.yellow);
    print(`Timestamp: ${new Date(latestTask.timestamp).toISOString()}`, colors.yellow);
    
    // Create MCP request for analyze_conversation
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'callTool',
      params: {
        name: 'analyze_conversation',
        arguments: {
          task_id: latestTask.id
        }
      }
    };
    
    // Create MCP request with time window
    const mcpRequestWithTimeWindow = {
      jsonrpc: '2.0',
      id: 2,
      method: 'callTool',
      params: {
        name: 'analyze_conversation',
        arguments: {
          task_id: latestTask.id,
          minutes_back: 30
        }
      }
    };
    
    // Start the MCP server process
    print('\nStarting MCP server...', colors.blue);
    const mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Handle MCP server output
    let serverOutput = '';
    mcpProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
      
      // Check if we have a complete JSON-RPC response
      if (serverOutput.includes('\n\n')) {
        const responses = serverOutput.split('\n\n');
        serverOutput = responses.pop(); // Keep any incomplete response
        
        // Process complete responses
        for (const response of responses) {
          try {
            const jsonResponse = JSON.parse(response);
            
            if (jsonResponse.id === 1) {
              // Handle analyze_conversation response
              printHeader('Analyze Conversation Result');
              print(JSON.stringify(jsonResponse.result, null, 2), colors.green);
              
              // Send the second request with time window
              mcpProcess.stdin.write(JSON.stringify(mcpRequestWithTimeWindow) + '\n\n');
            } else if (jsonResponse.id === 2) {
              // Handle analyze_conversation with time window response
              printHeader('Analyze Conversation with Time Window Result');
              print(JSON.stringify(jsonResponse.result, null, 2), colors.green);
              
              // Close the MCP server
              mcpProcess.stdin.end();
            }
          } catch (error) {
            print(`Error parsing JSON response: ${error.message}`, colors.red);
            print(`Response: ${response}`, colors.red);
          }
        }
      }
    });
    
    // Handle MCP server errors
    mcpProcess.stderr.on('data', (data) => {
      // Only print actual errors, not startup messages
      const message = data.toString();
      if (!message.includes('MCP server running') && !message.includes('Using VS Code tasks directory')) {
        print(`MCP server error: ${message}`, colors.red);
      }
    });
    
    // Handle MCP server exit
    mcpProcess.on('close', (code) => {
      printHeader('Test Complete');
      print(`MCP server exited with code ${code}`, colors.blue);
    });
    
    // Send the first request after a short delay to allow the server to start
    setTimeout(() => {
      print('\nSending analyze_conversation request...', colors.blue);
      mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n\n');
    }, 1000);
  } catch (error) {
    print(`Error: ${error.message}`, colors.red);
  }
}

// Run the test
testMcpAnalyzeConversation().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
