#!/usr/bin/env node

/**
 * Test script for the message ordering fix in the Cline Chat Reader MCP server
 * 
 * This script tests the get_last_n_messages tool to verify that it returns
 * the most recent messages (newest first) after the fix is applied.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');
const path = require('path');

// Path to the MCP server
const mcpServerPath = path.resolve('/Users/ant/Cline-Chat-Reader/build/index.js');

// Function to send a request to the MCP server
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

async function testMessageOrderingFix() {
  try {
    console.log("Testing message ordering fix...");
    
    // First, get the list of tasks
    const listTasksRequest = {
      jsonrpc: "2.0",
      id: "1",
      method: "tools/call",
      params: {
        name: "list_recent_tasks",
        arguments: { limit: 5 }
      }
    };
    
    console.log("Getting list of tasks...");
    const tasksResponse = await sendMcpRequest(listTasksRequest);
    
    console.log("Response from list_recent_tasks:", JSON.stringify(tasksResponse, null, 2));
    
    if (!tasksResponse || !tasksResponse.result || !tasksResponse.result.content) {
      console.error("Error: Invalid response from list_recent_tasks");
      return;
    }
    
    const tasks = JSON.parse(tasksResponse.result.content[0].text).tasks;
    
    if (tasks.length === 0) {
      console.error("No tasks found!");
      return;
    }
    
    // Use the first task for testing
    const taskId = tasks[0].id;
    console.log(`Using task ID: ${taskId}`);
    
    // Call get_last_n_messages
    const getMessagesRequest = {
      jsonrpc: "2.0",
      id: "2",
      method: "tools/call",
      params: {
        name: "get_last_n_messages",
        arguments: {
          task_id: taskId,
          limit: 10
        }
      }
    };
    
    console.log("Getting last 10 messages...");
    const messagesResponse = await sendMcpRequest(getMessagesRequest);
    const messages = JSON.parse(messagesResponse.result.content[0].text);
    
    console.log(`Retrieved ${messages.length} messages`);
    
    if (messages.length > 0) {
      console.log("\nMessage order verification:");
      
      // Print the structure of the first message to understand its properties
      console.log("\nFirst message structure:");
      console.log(JSON.stringify(messages[0], null, 2));
      
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        console.log(`[${i}] Role: ${msg.role}, Timestamp: ${msg.timestamp}`);
      }
      
      // Check if messages are in descending order by timestamp
      let isDescending = true;
      for (let i = 1; i < messages.length; i++) {
        if (messages[i-1].timestamp < messages[i].timestamp) {
          isDescending = false;
          console.log(`Order issue detected: Message ${i-1} (${messages[i-1].timestamp}) is older than message ${i} (${messages[i].timestamp})`);
        }
      }
      
      console.log(`\nMessages are in ${isDescending ? "descending" : "ascending"} order by timestamp.`);
      console.log(`Expected order: descending (newest first)`);
      
      if (isDescending) {
        console.log("\nFIX VERIFICATION: PASSED ✅");
        console.log("The message ordering fix is working correctly!");
      } else {
        console.log("\nFIX VERIFICATION: FAILED ❌");
        console.log("The message ordering fix is not working correctly.");
      }
    }
  } catch (error) {
    console.error("Error testing message ordering fix:", error);
  }
}

testMessageOrderingFix();
