/**
 * Test script for the External Advice feature using the MCP server
 * This script sends a test advice to the VS Code extension using the MCP tool
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Path to the MCP server
const mcpServerPath = path.resolve('./build/index.js');

// Function to send a message to the MCP server
function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    // Spawn a new process for the MCP server
    const mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    // Handle stdout data
    mcpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Handle stderr data
    mcpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`MCP stderr: ${data}`);
    });
    
    // Handle process close
    mcpProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP process exited with code ${code}: ${stderr}`));
      } else {
        try {
          const response = JSON.parse(stdout);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse MCP response: ${error.message}`));
        }
      }
    });
    
    // Send the message to the MCP server
    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    mcpProcess.stdin.end();
  });
}

// Function to test the send_external_advice tool
async function testSendExternalAdvice() {
  try {
    console.log('Testing send_external_advice MCP tool...');
    
    // First, get the list of available tools
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: '1',
      method: 'listTools',
      params: {}
    };
    
    console.log('Requesting tool list...');
    const toolsResponse = await sendMcpRequest(listToolsRequest);
    
    console.log('Tools response:', JSON.stringify(toolsResponse, null, 2));
    
    if (!toolsResponse.result || !toolsResponse.result.tools) {
      throw new Error('Invalid response format: tools not found in response');
    }
    
    console.log('Available tools:', toolsResponse.result.tools.map(t => t.name));
    
    // Check if the send_external_advice tool is available
    const externalAdviceTool = toolsResponse.result.tools.find(tool => tool.name === 'send_external_advice');
    
    if (!externalAdviceTool) {
      throw new Error('send_external_advice tool not found in MCP server');
    }
    
    console.log('Found send_external_advice tool in MCP server');
    
    // Now call the send_external_advice tool
    const callToolRequest = {
      jsonrpc: '2.0',
      id: '2',
      method: 'callTool',
      params: {
        name: 'send_external_advice',
        arguments: {
          content: 'This is a test advice sent through the MCP server. It demonstrates how Claude can send recommendations directly to VS Code.',
          title: 'MCP Test External Advice',
          type: 'tip',
          priority: 'high',
          expiresAfter: 120, // Expires in 2 hours
          relatedFiles: ['src/mcp-server.ts', 'test-mcp-external-advice.js']
        }
      }
    };
    
    console.log('Calling send_external_advice tool...');
    const adviceResponse = await sendMcpRequest(callToolRequest);
    
    console.log('MCP Response:', JSON.stringify(adviceResponse, null, 2));
    
    // Parse the response content
    if (adviceResponse.result && adviceResponse.result.content && adviceResponse.result.content.length > 0) {
      const contentText = adviceResponse.result.content[0].text;
      try {
        const parsedContent = JSON.parse(contentText);
        console.log('Advice sent successfully!');
        console.log('Advice ID:', parsedContent.adviceId);
        console.log('Success:', parsedContent.success);
        console.log('Message:', parsedContent.message);
      } catch (error) {
        console.error('Failed to parse content text:', error);
        console.log('Raw content text:', contentText);
      }
    } else {
      console.error('Invalid response format:', adviceResponse);
    }
  } catch (error) {
    console.error('Error testing send_external_advice:', error);
  }
}

// Run the test
testSendExternalAdvice();
