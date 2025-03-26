/**
 * Test script for the recover_crashed_chat MCP tool
 * This script demonstrates how to use the tool to recover context from a crashed conversation
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

// Function to test the recover_crashed_chat tool
async function testRecoverCrashedChat() {
  try {
    console.log('Testing recover_crashed_chat MCP tool...');
    
    // First, get the list of available tools
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: '1',
      method: 'listTools',
      params: {}
    };
    
    console.log('Requesting tool list...');
    const toolsResponse = await sendMcpRequest(listToolsRequest);
    
    if (!toolsResponse.result || !toolsResponse.result.tools) {
      throw new Error('Invalid response format: tools not found in response');
    }
    
    console.log('Available tools:', toolsResponse.result.tools.map(t => t.name));
    
    // Check if the recover_crashed_chat tool is available
    const recoverTool = toolsResponse.result.tools.find(tool => tool.name === 'recover_crashed_chat');
    
    if (!recoverTool) {
      throw new Error('recover_crashed_chat tool not found in MCP server');
    }
    
    console.log('Found recover_crashed_chat tool in MCP server');
    
    // Use the specific task ID for testing
    const testTaskId = '1742912459362';
    console.log(`Using task ${testTaskId} for testing...`);
    
    // Call the recover_crashed_chat tool
    const recoverRequest = {
      jsonrpc: '2.0',
      id: '3',
      method: 'callTool',
      params: {
        name: 'recover_crashed_chat',
        arguments: {
          task_id: testTaskId,
          max_length: 1000,
          include_code_snippets: true
        }
      }
    };
    
    console.log('Calling recover_crashed_chat tool...');
    const recoverResponse = await sendMcpRequest(recoverRequest);
    
    if (!recoverResponse.result || !recoverResponse.result.content || recoverResponse.result.content.length === 0) {
      throw new Error('Invalid response format: recovery result not found in response');
    }
    
    // Parse and display the result
    const result = JSON.parse(recoverResponse.result.content[0].text);
    
    console.log('\n=== Recovery Result ===');
    console.log(`Original Task: ${result.original_task ? result.original_task.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`Summary: ${result.summary ? result.summary.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`Main Topic: ${result.main_topic || 'N/A'}`);
    console.log(`Subtopics: ${result.subtopics ? result.subtopics.join(', ') : 'N/A'}`);
    console.log(`Key Topics: ${result.key_topics ? result.key_topics.join(', ') : 'N/A'}`);
    console.log(`Modified Files: ${result.modified_files ? result.modified_files.length + ' files' : 'N/A'}`);
    console.log(`Active Files: ${result.active_files ? result.active_files.join(', ') : 'N/A'}`);
    console.log(`Open Questions: ${result.open_questions ? result.open_questions.join('; ') : 'N/A'}`);
    console.log(`Current Status: ${result.current_status ? result.current_status.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`Recent Messages: ${result.recent_messages ? result.recent_messages.length + ' messages' : 'N/A'}`);
    console.log(`Decision Points: ${result.decision_points ? result.decision_points.length + ' points' : 'N/A'}`);
    console.log(`Recovery Confidence: ${result.recovery_confidence || 'N/A'}`);
    console.log(`Message Count: ${result.message_count ? `${result.message_count.recovered}/${result.message_count.total}` : 'N/A'}`);
    console.log(`Code Snippets: ${result.code_snippets ? result.code_snippets.length : 'N/A'}`);
    console.log(`Code Evolution: ${result.code_evolution ? result.code_evolution.length + ' items' : 'N/A'}`);
    
    // Display the formatted message
    console.log('\n=== Formatted Message ===');
    console.log(result.formatted_message ? result.formatted_message : 'No formatted message available');
    
    // Test saving to crash reports directory
    console.log('\nTesting saving to crash reports directory...');
    
    const saveRequest = {
      jsonrpc: '2.0',
      id: '4',
      method: 'callTool',
      params: {
        name: 'recover_crashed_chat',
        arguments: {
          task_id: testTaskId,
          max_length: 1000,
          include_code_snippets: true,
          save_to_crashreports: true
        }
      }
    };
    
    console.log('Saving recovered context to crash reports directory...');
    const saveResponse = await sendMcpRequest(saveRequest);
    
    if (!saveResponse.result || !saveResponse.result.content || saveResponse.result.content.length === 0) {
      throw new Error('Invalid response format: save result not found in response');
    }
    
    const saveResult = JSON.parse(saveResponse.result.content[0].text);
    
    if (saveResult.crash_report_saved) {
      console.log(`Crash report saved successfully!`);
      console.log(`Crash Report ID: ${saveResult.crash_report_id}`);
      console.log(`Crash Report Path: ${saveResult.crash_report_path}`);
      
      // Verify the crash report file exists
      if (fs.existsSync(saveResult.crash_report_path)) {
        console.log('Verified: Crash report file exists on disk');
        
        // Read the crash report to verify its contents
        const crashReport = JSON.parse(fs.readFileSync(saveResult.crash_report_path, 'utf8'));
        console.log(`Verified: Crash report contains task_id=${crashReport.task_id}`);
        console.log(`Verified: Crash report contains main_topic=${crashReport.main_topic}`);
      } else {
        console.warn('Warning: Crash report file does not exist on disk');
      }
    } else {
      console.log('Crash report was not saved. This may be expected if not using Cline Ultra.');
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testRecoverCrashedChat();
