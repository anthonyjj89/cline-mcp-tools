/**
 * Test script for the MCP server's send_external_advice tool with active_label parameter
 * This tests the ability to send advice using only the active_label parameter without task_id
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// Path to the MCP server
const SERVER_PATH = path.join(__dirname, 'build', 'mcp-server.js');

// Test sending advice with active_label
async function testSendAdviceWithActiveLabel() {
  try {
    console.log('Testing send_external_advice with active_label parameter...');
    
    // Start the MCP server
    const server = spawn('node', [SERVER_PATH]);
    
    // Prepare the request
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
        console.log('Response from send_external_advice:');
        console.log(JSON.stringify(response, null, 2));
        
        // Check if the response indicates success
        if (response.result && response.result.content && response.result.content[0].text) {
          const content = JSON.parse(response.result.content[0].text);
          if (content.success) {
            console.log('✅ Test passed: Successfully sent advice using only active_label');
            console.log(`Advice ID: ${content.adviceId}`);
            console.log(`Target task: ${content.targetTask}`);
            console.log(`Active label: ${content.activeLabel}`);
            console.log('Check your Cline Ultra interface for the notification.');
          } else {
            console.log('❌ Test failed: Failed to send advice');
            console.log(`Error: ${content.message || 'Unknown error'}`);
          }
        } else if (response.error) {
          console.log('❌ Test failed: MCP server returned an error');
          console.log(`Error: ${response.error.message || 'Unknown error'}`);
        } else {
          console.log('❌ Test failed: Invalid response format');
        }
      } catch (err) {
        console.error('Error parsing response:', err);
        console.log('Raw response:', responseData);
      }
    });
    
    // Handle errors
    server.on('error', (err) => {
      console.error('Error running server:', err);
    });
    
    // Kill the server after a timeout
    setTimeout(() => {
      server.kill();
    }, 5000);
  } catch (err) {
    console.error('Error running test:', err);
  }
}

// Run the test
console.log('Testing send_external_advice tool with active_label parameter...');
testSendAdviceWithActiveLabel();
