/**
 * Test script for Active Conversations feature
 * 
 * This script tests the new get_active_task MCP tool and the active conversation
 * functionality in other tools.
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

// Paths to active_tasks.json files
const homedir = os.homedir();
const ultraActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
const standardActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');

// Sample active tasks data
const sampleActiveTasks = {
  activeTasks: [
    {
      id: "1711375200000", // Example timestamp ID
      label: "A",
      lastActivated: Date.now() - 3600000 // 1 hour ago
    },
    {
      id: "1711375300000", // Example timestamp ID
      label: "B",
      lastActivated: Date.now() - 7200000 // 2 hours ago
    }
  ]
};

// Function to create test active_tasks.json file
async function createTestActiveTasks() {
  try {
    // Create Ultra path if it doesn't exist
    await fs.ensureDir(path.dirname(ultraActivePath));
    
    // Write sample active tasks data
    await fs.writeJson(ultraActivePath, sampleActiveTasks, { spaces: 2 });
    
    console.log('Created test active_tasks.json file at:', ultraActivePath);
    return true;
  } catch (error) {
    console.error('Error creating test active_tasks.json file:', error);
    return false;
  }
}

// Function to clean up test files
async function cleanupTestFiles() {
  try {
    if (await fs.pathExists(ultraActivePath)) {
      await fs.remove(ultraActivePath);
      console.log('Removed test active_tasks.json file');
    }
    return true;
  } catch (error) {
    console.error('Error cleaning up test files:', error);
    return false;
  }
}

// Function to run MCP server and test the get_active_task tool
async function testGetActiveTask() {
  console.log('\n--- Testing get_active_task MCP tool ---');
  
  // Start MCP server
  const mcpServer = spawn('node', ['build/mcp-server.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Prepare test request
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'callTool',
    params: {
      name: 'get_active_task',
      arguments: {}
    }
  };
  
  // Send request to MCP server
  mcpServer.stdin.write(JSON.stringify(request) + '\n');
  
  // Collect response
  let responseData = '';
  
  mcpServer.stdout.on('data', (data) => {
    responseData += data.toString();
    
    // Check if we have a complete JSON response
    try {
      const response = JSON.parse(responseData);
      console.log('Response from get_active_task:');
      
      // Parse the content text to get the actual result
      const content = JSON.parse(response.result.content[0].text);
      console.log(JSON.stringify(content, null, 2));
      
      // Kill the MCP server
      mcpServer.kill();
    } catch (error) {
      // Not a complete JSON response yet, continue collecting
    }
  });
  
  // Handle errors
  mcpServer.stderr.on('data', (data) => {
    console.error(`MCP server stderr: ${data}`);
  });
  
  // Wait for server to exit
  await new Promise(resolve => {
    mcpServer.on('close', (code) => {
      console.log(`MCP server exited with code ${code}`);
      resolve();
    });
  });
}

// Function to test get_last_n_messages with active conversation
async function testGetLastNMessagesWithActive() {
  console.log('\n--- Testing get_last_n_messages with active conversation ---');
  
  // Start MCP server
  const mcpServer = spawn('node', ['build/mcp-server.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Prepare test request with ACTIVE_A placeholder
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'callTool',
    params: {
      name: 'get_last_n_messages',
      arguments: {
        task_id: 'ACTIVE_A',
        limit: 5
      }
    }
  };
  
  // Send request to MCP server
  mcpServer.stdin.write(JSON.stringify(request) + '\n');
  
  // Collect response
  let responseData = '';
  
  mcpServer.stdout.on('data', (data) => {
    responseData += data.toString();
    
    // Check if we have a complete JSON response
    try {
      const response = JSON.parse(responseData);
      console.log('Response from get_last_n_messages with ACTIVE_A:');
      
      // Parse the content text to get the actual result
      try {
        const content = JSON.parse(response.result.content[0].text);
        console.log(JSON.stringify(content, null, 2));
      } catch (error) {
        console.log('Raw response:', response.result.content[0].text);
      }
      
      // Kill the MCP server
      mcpServer.kill();
    } catch (error) {
      // Not a complete JSON response yet, continue collecting
    }
  });
  
  // Handle errors
  mcpServer.stderr.on('data', (data) => {
    console.error(`MCP server stderr: ${data}`);
  });
  
  // Wait for server to exit
  await new Promise(resolve => {
    mcpServer.on('close', (code) => {
      console.log(`MCP server exited with code ${code}`);
      resolve();
    });
  });
}

// Function to test send_external_advice with active_label
async function testSendExternalAdviceWithActiveLabel() {
  console.log('\n--- Testing send_external_advice with active_label ---');
  
  // Start MCP server
  const mcpServer = spawn('node', ['build/mcp-server.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Prepare test request with active_label
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
  
  // Send request to MCP server
  mcpServer.stdin.write(JSON.stringify(request) + '\n');
  
  // Collect response
  let responseData = '';
  
  mcpServer.stdout.on('data', (data) => {
    responseData += data.toString();
    
    // Check if we have a complete JSON response
    try {
      const response = JSON.parse(responseData);
      console.log('Response from send_external_advice with active_label:');
      
      // Parse the content text to get the actual result
      try {
        const content = JSON.parse(response.result.content[0].text);
        console.log(JSON.stringify(content, null, 2));
      } catch (error) {
        console.log('Raw response:', response.result.content[0].text);
      }
      
      // Kill the MCP server
      mcpServer.kill();
    } catch (error) {
      // Not a complete JSON response yet, continue collecting
    }
  });
  
  // Handle errors
  mcpServer.stderr.on('data', (data) => {
    console.error(`MCP server stderr: ${data}`);
  });
  
  // Wait for server to exit
  await new Promise(resolve => {
    mcpServer.on('close', (code) => {
      console.log(`MCP server exited with code ${code}`);
      resolve();
    });
  });
}

// Main function to run all tests
async function runTests() {
  console.log('Starting Active Conversations feature tests...');
  
  // Create test active_tasks.json file
  const setupSuccess = await createTestActiveTasks();
  if (!setupSuccess) {
    console.error('Failed to set up test environment. Exiting...');
    return;
  }
  
  try {
    // Run tests
    await testGetActiveTask();
    await testGetLastNMessagesWithActive();
    await testSendExternalAdviceWithActiveLabel();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Clean up test files
    await cleanupTestFiles();
  }
}

// Run the tests
runTests();
