/**
 * Test script for the get_active_task MCP tool
 * 
 * This script tests the new get_active_task tool that retrieves active conversations
 * marked by the user in VS Code.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// Path to the MCP server
const SERVER_PATH = path.join(__dirname, 'build', 'index.js');

// Create test active_tasks.json file for testing
async function setupTestFiles() {
  const homedir = os.homedir();
  const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  // Create test data
  const testData = {
    activeTasks: [
      {
        id: "1711369200000", // Example timestamp
        label: "A",
        lastActivated: Date.now() - 60000 // 1 minute ago
      },
      {
        id: "1711369300000", // Example timestamp
        label: "B",
        lastActivated: Date.now() - 120000 // 2 minutes ago
      }
    ]
  };
  
  // Ensure directories exist
  await fs.ensureDir(path.dirname(standardPath));
  
  // Write test data to standard path
  await fs.writeJson(standardPath, testData, { spaces: 2 });
  console.log(`Created test active_tasks.json at ${standardPath}`);
  
  return { standardPath };
}

// Clean up test files
async function cleanupTestFiles(paths) {
  try {
    await fs.remove(paths.standardPath);
    console.log(`Removed test file: ${paths.standardPath}`);
  } catch (err) {
    console.error(`Error removing test file: ${err.message}`);
  }
}

// Test the get_active_task tool
async function testGetActiveTask() {
  // Set up test files
  const testPaths = await setupTestFiles();
  
  try {
    // Start the MCP server
    const server = spawn('node', [SERVER_PATH]);
    
    // Prepare the request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'callTool',
      params: {
        name: 'get_active_task',
        arguments: {}
      }
    };
    
    // Send the request to the server
    server.stdin.write(JSON.stringify(request) + '\n');
    
    // Collect the response
    let responseData = '';
    server.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    // Handle server exit
    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
      
      // Parse the response
      try {
        const response = JSON.parse(responseData);
        console.log('Response from get_active_task:');
        console.log(JSON.stringify(response, null, 2));
        
        // Check if the response contains active tasks
        if (response.result && response.result.content && response.result.content[0].text) {
          const content = JSON.parse(response.result.content[0].text);
          if (content.active_tasks && content.active_tasks.length > 0) {
            console.log('✅ Test passed: Found active tasks');
          } else {
            console.log('❌ Test failed: No active tasks found');
          }
        } else {
          console.log('❌ Test failed: Invalid response format');
        }
      } catch (err) {
        console.error('Error parsing response:', err);
        console.log('Raw response:', responseData);
      }
      
      // Clean up test files
      cleanupTestFiles(testPaths);
    });
    
    // Handle errors
    server.on('error', (err) => {
      console.error('Error running server:', err);
      cleanupTestFiles(testPaths);
    });
    
    // Kill the server after a timeout
    setTimeout(() => {
      server.kill();
    }, 5000);
  } catch (err) {
    console.error('Error running test:', err);
    cleanupTestFiles(testPaths);
  }
}

// Test the get_active_task tool with label filter
async function testGetActiveTaskWithLabel() {
  // Set up test files
  const testPaths = await setupTestFiles();
  
  try {
    // Start the MCP server
    const server = spawn('node', [SERVER_PATH]);
    
    // Prepare the request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'callTool',
      params: {
        name: 'get_active_task',
        arguments: {
          label: 'A'
        }
      }
    };
    
    // Send the request to the server
    server.stdin.write(JSON.stringify(request) + '\n');
    
    // Collect the response
    let responseData = '';
    server.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    // Handle server exit
    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
      
      // Parse the response
      try {
        const response = JSON.parse(responseData);
        console.log('Response from get_active_task with label filter:');
        console.log(JSON.stringify(response, null, 2));
        
        // Check if the response contains active tasks with label A
        if (response.result && response.result.content && response.result.content[0].text) {
          const content = JSON.parse(response.result.content[0].text);
          if (content.active_tasks && 
              content.active_tasks.length > 0 && 
              content.active_tasks.every(task => task.active_label === 'A')) {
            console.log('✅ Test passed: Found active tasks with label A');
          } else {
            console.log('❌ Test failed: No active tasks with label A found');
          }
        } else {
          console.log('❌ Test failed: Invalid response format');
        }
      } catch (err) {
        console.error('Error parsing response:', err);
        console.log('Raw response:', responseData);
      }
      
      // Clean up test files
      cleanupTestFiles(testPaths);
    });
    
    // Handle errors
    server.on('error', (err) => {
      console.error('Error running server:', err);
      cleanupTestFiles(testPaths);
    });
    
    // Kill the server after a timeout
    setTimeout(() => {
      server.kill();
    }, 5000);
  } catch (err) {
    console.error('Error running test:', err);
    cleanupTestFiles(testPaths);
  }
}

// Run the tests
console.log('Testing get_active_task tool...');
testGetActiveTask();

// Wait a bit before running the second test
setTimeout(() => {
  console.log('\nTesting get_active_task tool with label filter...');
  testGetActiveTaskWithLabel();
}, 6000);
