/**
 * Test script for Active Task integration with other tools
 * 
 * This script tests how the active task feature integrates with other tools
 * in the MCP server, verifying that tools properly prioritize active tasks.
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Path to the MCP server script
const MCP_SERVER_PATH = path.join(__dirname, 'build', 'mcp-server.js');

// Active tasks file paths
const homedir = os.homedir();
const ULTRA_ACTIVE_TASKS_PATH = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
const STANDARD_ACTIVE_TASKS_PATH = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');

// Test task IDs (replace with actual task IDs from your system)
const TEST_TASK_ID = '1711369200000'; // Replace with a real task ID
const ACTIVE_TASK_ID = '1711369300000'; // Replace with a different real task ID

/**
 * Create a mock active_tasks.json file for testing
 */
async function setupActiveTasks() {
  const activeTasks = {
    activeTasks: [
      {
        id: ACTIVE_TASK_ID,
        label: 'A',
        lastActivated: Date.now()
      }
    ]
  };

  // Write to Ultra path (create directory if it doesn't exist)
  await fs.mkdirp(path.dirname(ULTRA_ACTIVE_TASKS_PATH));
  await fs.writeFile(ULTRA_ACTIVE_TASKS_PATH, JSON.stringify(activeTasks, null, 2));
  
  console.log(`Created mock active tasks file at ${ULTRA_ACTIVE_TASKS_PATH}`);
  console.log(`Active task ID: ${ACTIVE_TASK_ID} (Label: A)`);
}

/**
 * Clean up the mock active_tasks.json file
 */
async function cleanupActiveTasks() {
  if (await fs.pathExists(ULTRA_ACTIVE_TASKS_PATH)) {
    await fs.remove(ULTRA_ACTIVE_TASKS_PATH);
    console.log(`Removed mock active tasks file from ${ULTRA_ACTIVE_TASKS_PATH}`);
  }
}

/**
 * Send a request to the MCP server and get the response
 */
async function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    const mcpServer = spawn('node', [MCP_SERVER_PATH]);
    
    let responseData = '';
    let errorData = '';
    
    mcpServer.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    mcpServer.stderr.on('data', (data) => {
      errorData += data.toString();
      // Don't treat stderr as an error, as the MCP server logs to stderr
    });
    
    mcpServer.on('close', (code) => {
      if (code !== 0) {
        console.error(`MCP server exited with code ${code}`);
        console.error(`Error output: ${errorData}`);
        reject(new Error(`MCP server exited with code ${code}`));
        return;
      }
      
      try {
        // Parse the response
        const response = JSON.parse(responseData);
        resolve(response);
      } catch (error) {
        console.error('Failed to parse MCP response:', error);
        console.error('Raw response:', responseData);
        reject(error);
      }
    });
    
    // Send the request to the MCP server
    mcpServer.stdin.write(JSON.stringify(request) + '\n');
    mcpServer.stdin.end();
  });
}

/**
 * Test the get_active_task tool
 */
async function testGetActiveTask() {
  console.log('\n=== Testing get_active_task tool ===');
  
  const request = {
    jsonrpc: '2.0',
    id: '1',
    method: 'callTool',
    params: {
      name: 'get_active_task',
      arguments: {}
    }
  };
  
  try {
    const response = await sendMcpRequest(request);
    console.log('Response from get_active_task:');
    console.log(JSON.stringify(response, null, 2));
    
    // Verify the response contains the active task
    const content = JSON.parse(response.result.content[0].text);
    if (content.active_tasks && content.active_tasks.length > 0) {
      console.log('✅ get_active_task returned active tasks');
      
      // Verify the active task ID matches what we set up
      const activeTask = content.active_tasks[0];
      if (activeTask.id === ACTIVE_TASK_ID) {
        console.log('✅ Active task ID matches expected value');
      } else {
        console.log('❌ Active task ID does not match expected value');
        console.log(`Expected: ${ACTIVE_TASK_ID}, Got: ${activeTask.id}`);
      }
    } else {
      console.log('❌ get_active_task did not return any active tasks');
    }
  } catch (error) {
    console.error('Error testing get_active_task:', error);
  }
}

/**
 * Test the get_last_n_messages tool with a non-active task ID
 * to verify it prioritizes the active task
 */
async function testGetLastNMessagesWithActiveTask() {
  console.log('\n=== Testing get_last_n_messages with active task prioritization ===');
  
  const request = {
    jsonrpc: '2.0',
    id: '2',
    method: 'callTool',
    params: {
      name: 'get_last_n_messages',
      arguments: {
        task_id: TEST_TASK_ID,
        limit: 5
      }
    }
  };
  
  try {
    const response = await sendMcpRequest(request);
    console.log('Response from get_last_n_messages:');
    console.log(JSON.stringify(response, null, 2));
    
    // Verify the response contains the active task ID instead of the requested task ID
    const content = JSON.parse(response.result.content[0].text);
    if (content.task_id === ACTIVE_TASK_ID) {
      console.log('✅ get_last_n_messages prioritized the active task');
      
      // Verify the original task ID is included in the response
      if (content.original_task_id === TEST_TASK_ID) {
        console.log('✅ Original task ID is included in the response');
      } else {
        console.log('❌ Original task ID is not included in the response');
        console.log(`Expected: ${TEST_TASK_ID}, Got: ${content.original_task_id}`);
      }
      
      // Verify the active task flag is set
      if (content.is_active_task === true) {
        console.log('✅ is_active_task flag is set to true');
      } else {
        console.log('❌ is_active_task flag is not set to true');
      }
      
      // Verify the active label is included
      if (content.active_label === 'A') {
        console.log('✅ active_label is set to "A"');
      } else {
        console.log('❌ active_label is not set to "A"');
        console.log(`Expected: "A", Got: ${content.active_label}`);
      }
    } else {
      console.log('❌ get_last_n_messages did not prioritize the active task');
      console.log(`Expected task_id: ${ACTIVE_TASK_ID}, Got: ${content.task_id}`);
    }
  } catch (error) {
    console.error('Error testing get_last_n_messages with active task:', error);
  }
}

/**
 * Test the send_external_advice tool with active_label parameter
 */
async function testSendExternalAdviceWithActiveLabel() {
  console.log('\n=== Testing send_external_advice with active_label parameter ===');
  
  const request = {
    jsonrpc: '2.0',
    id: '3',
    method: 'callTool',
    params: {
      name: 'send_external_advice',
      arguments: {
        content: 'This is a test advice sent to the active task',
        title: 'Test Advice',
        type: 'info',
        priority: 'medium',
        task_id: TEST_TASK_ID, // This should be ignored in favor of the active task
        active_label: 'A'
      }
    }
  };
  
  try {
    const response = await sendMcpRequest(request);
    console.log('Response from send_external_advice:');
    console.log(JSON.stringify(response, null, 2));
    
    // Verify the response indicates success
    const content = JSON.parse(response.result.content[0].text);
    if (content.success === true) {
      console.log('✅ send_external_advice succeeded');
      
      // Verify the target task ID is the active task ID
      if (content.targetTask === ACTIVE_TASK_ID) {
        console.log('✅ Advice was sent to the active task');
      } else {
        console.log('❌ Advice was not sent to the active task');
        console.log(`Expected target: ${ACTIVE_TASK_ID}, Got: ${content.targetTask}`);
      }
      
      // Verify the active label is included
      if (content.activeLabel === 'A') {
        console.log('✅ activeLabel is set to "A"');
      } else {
        console.log('❌ activeLabel is not set to "A"');
        console.log(`Expected: "A", Got: ${content.activeLabel}`);
      }
    } else {
      console.log('❌ send_external_advice failed');
      console.log(`Error: ${content.error}`);
    }
  } catch (error) {
    console.error('Error testing send_external_advice with active label:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('Setting up mock active tasks...');
    await setupActiveTasks();
    
    // Run the tests
    await testGetActiveTask();
    await testGetLastNMessagesWithActiveTask();
    await testSendExternalAdviceWithActiveLabel();
    
    console.log('\nAll tests completed.');
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    console.log('\nCleaning up...');
    await cleanupActiveTasks();
  }
}

// Run the tests
runTests();
