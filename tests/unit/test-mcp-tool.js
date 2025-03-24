#!/usr/bin/env node

// test-mcp-tool.js
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

async function testGetLastNMessages() {
  try {
    console.log("Testing get_last_n_messages MCP tool...");
    
    // First, get the list of tools
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: "1",
      method: "list_tools",
      params: {}
    };
    
    const toolsResponse = await sendMcpRequest(listToolsRequest);
    console.log("Available tools:", toolsResponse.result.tools.map(t => t.name));
    
    // Get the list of tasks
    const listTasksRequest = {
      jsonrpc: "2.0",
      id: "2",
      method: "call_tool",
      params: {
        name: "list_recent_tasks",
        arguments: { limit: 5 }
      }
    };
    
    const tasksResponse = await sendMcpRequest(listTasksRequest);
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
      id: "3",
      method: "call_tool",
      params: {
        name: "get_last_n_messages",
        arguments: {
          task_id: taskId,
          limit: 10
        }
      }
    };
    
    const messagesResponse = await sendMcpRequest(getMessagesRequest);
    const messages = JSON.parse(messagesResponse.result.content[0].text);
    
    console.log(`Retrieved ${messages.length} messages`);
    
    if (messages.length > 0) {
      console.log("\nMessage order verification:");
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        console.log(`[${i}] Role: ${msg.role}, Timestamp: ${new Date(msg.timestamp).toISOString()}`);
      }
      
      // Check if messages are in descending order by timestamp
      let isDescending = true;
      for (let i = 1; i < messages.length; i++) {
        if (messages[i-1].timestamp < messages[i].timestamp) {
          isDescending = false;
          console.log(`Order issue detected: Message ${i-1} (${new Date(messages[i-1].timestamp).toISOString()}) is older than message ${i} (${new Date(messages[i].timestamp).toISOString()})`);
        }
      }
      
      console.log(`\nMessages are in ${isDescending ? "descending" : "ascending"} order by timestamp.`);
      console.log(`Expected order: descending (newest first)`);
    }
  } catch (error) {
    console.error("Error testing get_last_n_messages:", error);
  }
}

testGetLastNMessages();
