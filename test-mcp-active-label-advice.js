/**
 * Test script for the MCP server's send_external_advice tool with active_label parameter
 * This tests the ability to send advice using only the active_label parameter without task_id
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { spawn } from 'child_process';

// Start the MCP server
function startMcpServer() {
  console.log('Starting MCP server...');
  const server = spawn('node', ['build/mcp-server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Log server output
  server.stdout.on('data', (data) => {
    console.log(`MCP Server stdout: ${data}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`MCP Server stderr: ${data}`);
  });
  
  server.on('close', (code) => {
    console.log(`MCP Server process exited with code ${code}`);
  });
  
  return server;
}

// Send a request to the MCP server
function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    try {
      // Write the request to a temporary file
      const requestFile = path.join(os.tmpdir(), 'mcp-request.json');
      fs.writeFileSync(requestFile, JSON.stringify(request), 'utf8');
      
      // Execute the command to send the request to the MCP server
      const command = `cat ${requestFile} | node build/mcp-server.js`;
      const output = execSync(command, { encoding: 'utf8' });
      
      // Parse the response
      const response = JSON.parse(output);
      resolve(response);
    } catch (error) {
      reject(error);
    }
  });
}

// Test sending advice with active_label
async function testSendAdviceWithActiveLabel() {
  try {
    console.log('Testing send_external_advice with active_label parameter...');
    
    // Create the request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'callTool',
      params: {
        name: 'send_external_advice',
        arguments: {
          content: "This is a test message sent using only the active_label parameter without task_id via the MCP server. If you're seeing this, the fix for the send_external_advice tool is working correctly!",
          title: "MCP Active Label Test",
          type: "info",
          priority: "high",
          active_label: "A" // Only using active_label, not task_id
        }
      }
    };
    
    // Send the request
    const response = await sendMcpRequest(request);
    
    // Check the response
    if (response.result && response.result.content && response.result.content[0].text) {
      const resultObj = JSON.parse(response.result.content[0].text);
      
      if (resultObj.success) {
        console.log('Test passed! MCP server successfully processed the request with only active_label.');
        console.log(`Advice ID: ${resultObj.adviceId}`);
        console.log(`Target task: ${resultObj.targetTask}`);
        console.log(`Active label: ${resultObj.activeLabel}`);
        console.log('Check your Cline Ultra interface for the notification.');
      } else {
        console.error('Test failed! MCP server returned an error:');
        console.error(resultObj.error || 'Unknown error');
      }
    } else if (response.error) {
      console.error('Test failed! MCP server returned an error:');
      console.error(response.error);
    } else {
      console.error('Test failed! Unexpected response format:');
      console.error(JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error('Test failed with exception:', error);
  }
}

// Run the test
testSendAdviceWithActiveLabel().catch(console.error);
