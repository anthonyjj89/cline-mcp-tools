/**
 * Active Conversations Example
 * 
 * This example demonstrates how to use the Active Conversations feature
 * in the Claude Task Reader MCP server.
 */

// Import required libraries
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to send MCP request and get response
async function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    // Start MCP server
    const mcpServer = spawn('node', ['build/mcp-server.js']);
    
    // Collect response
    let responseData = '';
    
    // Handle stdout data
    mcpServer.stdout.on('data', (data) => {
      responseData += data.toString();
      
      // Check if we have a complete JSON response
      try {
        const response = JSON.parse(responseData);
        
        // Parse the content text to get the actual result
        try {
          const content = JSON.parse(response.result.content[0].text);
          resolve({ response, content });
        } catch (error) {
          resolve({ response, content: response.result.content[0].text });
        }
        
        // Kill the MCP server
        mcpServer.kill();
      } catch (error) {
        // Not a complete JSON response yet, continue collecting
      }
    });
    
    // Handle stderr data
    mcpServer.stderr.on('data', (data) => {
      console.error(`MCP server stderr: ${data}`);
    });
    
    // Handle error
    mcpServer.on('error', (error) => {
      reject(error);
    });
    
    // Handle close
    mcpServer.on('close', (code) => {
      if (code !== 0 && responseData === '') {
        reject(new Error(`MCP server exited with code ${code}`));
      }
    });
    
    // Send request to MCP server
    mcpServer.stdin.write(JSON.stringify(request) + '\n');
  });
}

// Example 1: Get active tasks
async function getActiveTasks() {
  console.log('\n=== Example 1: Get Active Tasks ===');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'callTool',
    params: {
      name: 'get_active_task',
      arguments: {}
    }
  };
  
  try {
    const { content } = await sendMcpRequest(request);
    console.log('Active Tasks:');
    console.log(JSON.stringify(content, null, 2));
  } catch (error) {
    console.error('Error getting active tasks:', error);
  }
}

// Example 2: Get active tasks filtered by label
async function getActiveTasksByLabel(label) {
  console.log(`\n=== Example 2: Get Active Tasks with Label ${label} ===`);
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'callTool',
    params: {
      name: 'get_active_task',
      arguments: {
        label: label
      }
    }
  };
  
  try {
    const { content } = await sendMcpRequest(request);
    console.log(`Active Tasks with Label ${label}:`);
    console.log(JSON.stringify(content, null, 2));
  } catch (error) {
    console.error(`Error getting active tasks with label ${label}:`, error);
  }
}

// Example 3: Get last messages from Active A conversation
async function getLastMessagesFromActiveA() {
  console.log('\n=== Example 3: Get Last Messages from Active A Conversation ===');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'callTool',
    params: {
      name: 'get_last_n_messages',
      arguments: {
        task_id: 'ACTIVE_A',
        limit: 3
      }
    }
  };
  
  try {
    const { content } = await sendMcpRequest(request);
    console.log('Last Messages from Active A:');
    console.log(JSON.stringify(content, null, 2));
  } catch (error) {
    console.error('Error getting last messages from Active A:', error);
  }
}

// Example 4: Send advice to Active B conversation
async function sendAdviceToActiveB() {
  console.log('\n=== Example 4: Send Advice to Active B Conversation ===');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'callTool',
    params: {
      name: 'send_external_advice',
      arguments: {
        content: 'This is a test advice sent to Active B conversation',
        title: 'Test Advice',
        type: 'info',
        priority: 'medium',
        task_id: '1234567890123', // This will be overridden by active_label
        active_label: 'B'
      }
    }
  };
  
  try {
    const { content } = await sendMcpRequest(request);
    console.log('Send Advice Response:');
    console.log(JSON.stringify(content, null, 2));
  } catch (error) {
    console.error('Error sending advice to Active B:', error);
  }
}

// Example 5: Analyze conversation of default active task
async function analyzeActiveConversation() {
  console.log('\n=== Example 5: Analyze Default Active Conversation ===');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'callTool',
    params: {
      name: 'analyze_conversation',
      arguments: {
        // No task_id provided, will use default active conversation
        minutes_back: 60
      }
    }
  };
  
  try {
    const { content } = await sendMcpRequest(request);
    console.log('Conversation Analysis:');
    console.log(JSON.stringify(content, null, 2));
  } catch (error) {
    console.error('Error analyzing active conversation:', error);
  }
}

// Main function to run examples
async function runExamples() {
  console.log('Active Conversations Feature Examples');
  console.log('====================================');
  console.log('This script demonstrates how to use the Active Conversations feature.');
  console.log('Note: You need to have active conversations marked in VS Code for these examples to work properly.');
  
  // Ask user which example to run
  rl.question('\nWhich example would you like to run? (1-5, or "all"): ', async (answer) => {
    try {
      if (answer === '1' || answer === 'all') {
        await getActiveTasks();
      }
      
      if (answer === '2' || answer === 'all') {
        await getActiveTasksByLabel('A');
      }
      
      if (answer === '3' || answer === 'all') {
        await getLastMessagesFromActiveA();
      }
      
      if (answer === '4' || answer === 'all') {
        await sendAdviceToActiveB();
      }
      
      if (answer === '5' || answer === 'all') {
        await analyzeActiveConversation();
      }
      
      console.log('\nExamples completed!');
    } catch (error) {
      console.error('Error running examples:', error);
    } finally {
      rl.close();
    }
  });
}

// Run the examples
runExamples();
