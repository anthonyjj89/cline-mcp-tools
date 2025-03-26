/**
 * Test script for recovering a crashed chat and sending it as external advice to an active conversation
 * 
 * This script demonstrates how to:
 * 1. Recover content from a crashed chat
 * 2. Send the recovered content as external advice to an active conversation (A or B)
 * 
 * Usage:
 * node test-recover-crashed-chat-as-advice.js <crashed_task_id> <active_label>
 * 
 * Where:
 * - crashed_task_id: The ID of the crashed conversation to recover
 * - active_label: The active label (A or B) of the conversation to send advice to
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);
const crashedTaskId = args[0];
const activeLabel = args[1] || 'A'; // Default to Active A if not specified

if (!crashedTaskId) {
  console.error('Error: You must provide a crashed task ID');
  console.log('Usage: node test-recover-crashed-chat-as-advice.js <crashed_task_id> <active_label>');
  process.exit(1);
}

// Validate active label
if (activeLabel !== 'A' && activeLabel !== 'B') {
  console.error('Error: Active label must be either "A" or "B"');
  process.exit(1);
}

console.log(`Starting test to recover crashed chat ${crashedTaskId} and send as advice to Active ${activeLabel}...`);

// Function to run the MCP server and send a request
async function runMcpTest() {
  return new Promise((resolve, reject) => {
    // Path to the MCP server script
    const mcpServerPath = path.join(__dirname, 'build', 'mcp-server.js');
    
    // Spawn the MCP server process
    const mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdoutData = '';
    let stderrData = '';
    
    // Collect stdout data
    mcpProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      stdoutData += dataStr;
      
      // Log MCP server output for debugging
      console.log(`MCP Server output: ${dataStr}`);
    });
    
    // Collect stderr data
    mcpProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      stderrData += dataStr;
      
      // Only log errors, not the startup messages
      if (!dataStr.includes('MCP server running') && !dataStr.includes('Supporting both')) {
        console.error(`MCP Server error: ${dataStr}`);
      }
    });
    
    // Handle process exit
    mcpProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`MCP Server process exited with code ${code}`);
        reject(new Error(`MCP Server process exited with code ${code}`));
      } else {
        resolve(stdoutData);
      }
    });
    
    // Create the MCP request to recover the crashed chat
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'callTool',
      params: {
        name: 'recover_crashed_chat',
        arguments: {
          task_id: crashedTaskId,
          max_length: 2000,
          include_code_snippets: true,
          save_to_crashreports: true,
          send_as_advice: true,
          active_label: activeLabel
        }
      }
    };
    
    // Send the request to the MCP server
    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
    
    // Set a timeout to kill the process if it doesn't respond
    setTimeout(() => {
      mcpProcess.kill();
      reject(new Error('MCP Server request timed out'));
    }, 30000); // 30 seconds timeout
  });
}

// Run the test
runMcpTest()
  .then((result) => {
    console.log('Test completed successfully!');
    
    // Try to parse the result to extract relevant information
    try {
      // Find the JSON response in the output
      const jsonMatch = result.match(/\{.*\}/s);
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        
        if (jsonResponse.result && jsonResponse.result.content) {
          const content = jsonResponse.result.content[0].text;
          const parsedContent = JSON.parse(content);
          
          console.log('\nRecovered Chat Summary:');
          console.log(`Main Topic: ${parsedContent.main_topic}`);
          console.log(`Message Count: ${parsedContent.message_count}`);
          
          if (parsedContent.advice_sent) {
            console.log('\nAdvice successfully sent:');
            console.log(`Advice ID: ${parsedContent.advice_id}`);
            console.log(`Advice Path: ${parsedContent.advice_path}`);
            console.log(`\nInstructions: ${parsedContent.instructions}`);
          } else {
            console.log('\nAdvice was not sent. Check the error message in the response.');
          }
        }
      }
    } catch (error) {
      console.error('Error parsing result:', error);
      console.log('Raw result:', result);
    }
  })
  .catch((error) => {
    console.error('Test failed:', error);
  });
