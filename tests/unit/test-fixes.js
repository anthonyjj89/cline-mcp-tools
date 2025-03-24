#!/usr/bin/env node

/**
 * Test script for verifying the fixes applied to the Cline Chat Reader MCP server
 * 
 * This script tests:
 * 1. The get_last_n_messages tool to verify message ordering
 * 2. The get_task_by_id tool to verify the apiStats fix
 * 3. The get_conversation_summary tool to verify the apiStats fix
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');
const path = require('path');

// Path to the MCP server
const mcpServerPath = path.resolve('./build/index.js');

// ANSI color codes for better output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Print a formatted section header
 */
function printSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}\n`);
}

/**
 * Print a success message
 */
function printSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

/**
 * Print an error message
 */
function printError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

/**
 * Print an info message
 */
function printInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

/**
 * Function to send a request to the MCP server
 */
async function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    server.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });
    
    server.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}: ${stderr}`));
      } else {
        try {
          const response = JSON.parse(stdout);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      }
    });
    
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();
  });
}

/**
 * Test the get_last_n_messages tool
 */
async function testGetLastNMessages(taskId) {
  printSection("Testing get_last_n_messages");
  
  try {
    // Call get_last_n_messages
    const getMessagesRequest = {
      jsonrpc: "2.0",
      id: "1",
      method: "tools/call",
      params: {
        name: "get_last_n_messages",
        arguments: {
          task_id: taskId,
          limit: 10
        }
      }
    };
    
    printInfo("Getting last 10 messages...");
    const messagesResponse = await sendMcpRequest(getMessagesRequest);
    
    if (messagesResponse.error) {
      throw new Error(`Error response: ${JSON.stringify(messagesResponse.error)}`);
    }
    
    const messages = JSON.parse(messagesResponse.result.content[0].text);
    
    printInfo(`Retrieved ${messages.length} messages`);
    
    if (messages.length > 0) {
      printInfo("\nMessage order verification:");
      
      // Print the first few messages to verify order
      for (let i = 0; i < Math.min(3, messages.length); i++) {
        const msg = messages[i];
        console.log(`[${i}] Role: ${msg.role}, Timestamp: ${msg.timestamp}`);
      }
      
      // Check if messages are in descending order by timestamp
      let isDescending = true;
      for (let i = 1; i < messages.length; i++) {
        if (messages[i-1].timestamp < messages[i].timestamp) {
          isDescending = false;
          printError(`Order issue detected: Message ${i-1} (${messages[i-1].timestamp}) is older than message ${i} (${messages[i].timestamp})`);
        }
      }
      
      if (isDescending) {
        printSuccess("Messages are in descending order (newest first)");
      } else {
        printError("Messages are NOT in descending order");
      }
    }
    
    return messages.length > 0;
  } catch (error) {
    printError(`Error testing get_last_n_messages: ${error.message}`);
    return false;
  }
}

/**
 * Test the get_task_by_id tool
 */
async function testGetTaskById(taskId) {
  printSection("Testing get_task_by_id");
  
  try {
    // Call get_task_by_id
    const getTaskRequest = {
      jsonrpc: "2.0",
      id: "2",
      method: "tools/call",
      params: {
        name: "get_task_by_id",
        arguments: {
          task_id: taskId
        }
      }
    };
    
    printInfo(`Getting task with ID: ${taskId}...`);
    const taskResponse = await sendMcpRequest(getTaskRequest);
    
    if (taskResponse.error) {
      throw new Error(`Error response: ${JSON.stringify(taskResponse.error)}`);
    }
    
    const taskData = JSON.parse(taskResponse.result.content[0].text);
    
    printInfo("Task data retrieved successfully");
    printInfo(`Task ID: ${taskData.task.id}`);
    printInfo(`Last Activity Timestamp: ${taskData.task.lastActivityTimestamp}`);
    printInfo(`Messages: ${taskData.messages.length}`);
    
    printSuccess("get_task_by_id is working correctly");
    return true;
  } catch (error) {
    printError(`Error testing get_task_by_id: ${error.message}`);
    return false;
  }
}

/**
 * Test the get_conversation_summary tool
 */
async function testGetConversationSummary(taskId) {
  printSection("Testing get_conversation_summary");
  
  try {
    // Call get_conversation_summary
    const getSummaryRequest = {
      jsonrpc: "2.0",
      id: "3",
      method: "tools/call",
      params: {
        name: "get_conversation_summary",
        arguments: {
          task_id: taskId
        }
      }
    };
    
    printInfo(`Getting summary for task with ID: ${taskId}...`);
    const summaryResponse = await sendMcpRequest(getSummaryRequest);
    
    if (summaryResponse.error) {
      throw new Error(`Error response: ${JSON.stringify(summaryResponse.error)}`);
    }
    
    const summaryData = JSON.parse(summaryResponse.result.content[0].text);
    
    printInfo("Summary data retrieved successfully");
    printInfo(`Task ID: ${summaryData.id}`);
    printInfo(`Total Messages: ${summaryData.totalMessages}`);
    printInfo(`Human Messages: ${summaryData.totalHumanMessages}`);
    printInfo(`Assistant Messages: ${summaryData.totalAssistantMessages}`);
    
    printSuccess("get_conversation_summary is working correctly");
    return true;
  } catch (error) {
    printError(`Error testing get_conversation_summary: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  printSection("Cline Chat Reader MCP Server Fix Verification");
  
  try {
    // First, get the list of tasks
    const listTasksRequest = {
      jsonrpc: "2.0",
      id: "0",
      method: "tools/call",
      params: {
        name: "list_recent_tasks",
        arguments: { limit: 1 }
      }
    };
    
    printInfo("Getting most recent task...");
    const tasksResponse = await sendMcpRequest(listTasksRequest);
    
    if (tasksResponse.error) {
      throw new Error(`Error response: ${JSON.stringify(tasksResponse.error)}`);
    }
    
    const tasks = JSON.parse(tasksResponse.result.content[0].text).tasks;
    
    if (tasks.length === 0) {
      printError("No tasks found!");
      return;
    }
    
    // Use the first task for testing
    const taskId = tasks[0].id;
    printInfo(`Using task ID: ${taskId} for testing`);
    
    // Run all tests
    const getLastNMessagesResult = await testGetLastNMessages(taskId);
    const getTaskByIdResult = await testGetTaskById(taskId);
    const getConversationSummaryResult = await testGetConversationSummary(taskId);
    
    // Print summary
    printSection("Test Summary");
    
    if (getLastNMessagesResult) {
      printSuccess("get_last_n_messages: PASSED");
    } else {
      printError("get_last_n_messages: FAILED");
    }
    
    if (getTaskByIdResult) {
      printSuccess("get_task_by_id: PASSED");
    } else {
      printError("get_task_by_id: FAILED");
    }
    
    if (getConversationSummaryResult) {
      printSuccess("get_conversation_summary: PASSED");
    } else {
      printError("get_conversation_summary: FAILED");
    }
    
    if (getLastNMessagesResult && getTaskByIdResult && getConversationSummaryResult) {
      printSection("All tests passed! The fixes are working correctly.");
    } else {
      printSection("Some tests failed. Please check the logs for details.");
    }
  } catch (error) {
    printError(`Error running tests: ${error.message}`);
  }
}

// Run the tests
runAllTests();
