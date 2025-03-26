/**
 * Fixed test script for the recover_crashed_chat MCP tool
 * This script uses the correct method names according to the MCP server implementation
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// Path to the MCP server
const mcpServerPath = path.resolve('./build/index.js');

// Test configuration
const TEST_TASK_ID = '1742912459362'; // Replace with a valid task ID from your system
const SAVE_TO_CRASHREPORTS = true;
const INCLUDE_CODE_SNIPPETS = true;
const MAX_LENGTH = 1000;

// Function to send a message to the MCP server with detailed logging
function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    console.log('\n=== Sending MCP Request ===');
    console.log('Request:', JSON.stringify(request, null, 2));
    
    // Spawn a new process for the MCP server
    console.log(`Spawning MCP server process: node ${mcpServerPath}`);
    const mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    // Handle stdout data
    mcpProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(`[MCP STDOUT]: ${chunk.trim()}`);
    });
    
    // Handle stderr data
    mcpProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.log(`[MCP STDERR]: ${chunk.trim()}`);
    });
    
    // Handle process close
    mcpProcess.on('close', (code) => {
      console.log(`MCP process exited with code ${code}`);
      
      if (code !== 0) {
        console.error('MCP process error:', stderr);
        reject(new Error(`MCP process exited with code ${code}: ${stderr}`));
      } else {
        try {
          console.log('Parsing MCP response...');
          console.log('Raw response:', stdout);
          
          const response = JSON.parse(stdout);
          console.log('Parsed response:', JSON.stringify(response, null, 2));
          
          resolve(response);
        } catch (error) {
          console.error('Failed to parse MCP response:', error);
          console.error('Raw response:', stdout);
          reject(new Error(`Failed to parse MCP response: ${error.message}`));
        }
      }
    });
    
    // Handle process error
    mcpProcess.on('error', (error) => {
      console.error('MCP process error:', error);
      reject(error);
    });
    
    // Send the message to the MCP server
    console.log('Writing request to MCP server stdin...');
    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    mcpProcess.stdin.end();
  });
}

// Function to test the recover_crashed_chat tool
async function testRecoverCrashedChat() {
  try {
    console.log('=== Testing recover_crashed_chat MCP tool ===');
    console.log('Test configuration:');
    console.log(`- Task ID: ${TEST_TASK_ID}`);
    console.log(`- Save to crash reports: ${SAVE_TO_CRASHREPORTS}`);
    console.log(`- Include code snippets: ${INCLUDE_CODE_SNIPPETS}`);
    console.log(`- Max length: ${MAX_LENGTH}`);
    
    // First, initialize the MCP server
    console.log('\nStep 1: Initializing MCP server...');
    const initRequest = {
      jsonrpc: '2.0',
      id: '1',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };
    
    const initResponse = await sendMcpRequest(initRequest);
    console.log('Server initialized:', initResponse.result?.serverInfo);
    
    // Skip the listTools step and directly call the recover_crashed_chat tool
    console.log('\nStep 2: Skipping tool list request and directly calling recover_crashed_chat tool...');
    
    // Call the recover_crashed_chat tool
    console.log('\nStep 3: Calling recover_crashed_chat tool...');
    const recoverRequest = {
      jsonrpc: '2.0',
      id: '3',
      method: 'callTool', // Use callTool instead of call_tool
      params: {
        name: 'recover_crashed_chat',
        arguments: {
          task_id: TEST_TASK_ID,
          max_length: MAX_LENGTH,
          include_code_snippets: INCLUDE_CODE_SNIPPETS,
          save_to_crashreports: SAVE_TO_CRASHREPORTS
        }
      }
    };
    
    const recoverResponse = await sendMcpRequest(recoverRequest);
    
    if (!recoverResponse.result || !recoverResponse.result.content || recoverResponse.result.content.length === 0) {
      throw new Error('Invalid response format: recovery result not found in response');
    }
    
    // Parse and display the result
    console.log('\nStep 4: Processing recovery result...');
    const result = JSON.parse(recoverResponse.result.content[0].text);
    
    console.log('\n=== Recovery Result ===');
    console.log(`Task ID: ${result.task_id || 'N/A'}`);
    console.log(`Main Topic: ${result.main_topic || 'N/A'}`);
    console.log(`Subtopics: ${result.subtopics ? result.subtopics.join(', ') : 'N/A'}`);
    console.log(`Message Count: ${result.message_count ? `${result.message_count.recovered}/${result.message_count.total}` : 'N/A'}`);
    
    // Check if the crash report was saved
    console.log('\nStep 5: Checking if crash report was saved...');
    if (result.crash_report_saved) {
      console.log(`Crash report saved successfully!`);
      console.log(`Crash Report ID: ${result.crash_report_id}`);
      console.log(`Crash Report Path: ${result.crash_report_path}`);
      
      // Verify the crash report file exists
      if (fs.existsSync(result.crash_report_path)) {
        console.log('Verified: Crash report file exists on disk');
        
        // Read the crash report to verify its contents
        const crashReport = JSON.parse(fs.readFileSync(result.crash_report_path, 'utf8'));
        console.log(`Verified: Crash report contains task_id=${crashReport.task_id}`);
        console.log(`Verified: Crash report contains main_topic=${crashReport.main_topic}`);
      } else {
        console.warn('Warning: Crash report file does not exist on disk');
        
        // Check if the crash reports directory exists
        const homedir = os.homedir();
        const crashReportsDir = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'crashReports');
        
        if (fs.existsSync(crashReportsDir)) {
          console.log('Crash reports directory exists:', crashReportsDir);
          
          // List files in the crash reports directory
          const files = fs.readdirSync(crashReportsDir);
          console.log('Files in crash reports directory:', files);
        } else {
          console.warn('Crash reports directory does not exist:', crashReportsDir);
        }
      }
    } else {
      console.log('Crash report was not saved.');
      console.log('This may be expected if:');
      console.log('1. save_to_crashreports was set to false');
      console.log('2. The conversation is from standard Cline, not Cline Ultra');
      console.log('3. There was an error creating the crash report');
      
      // Check if the crash reports directory exists
      const homedir = os.homedir();
      const crashReportsDir = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'crashReports');
      
      if (fs.existsSync(crashReportsDir)) {
        console.log('Crash reports directory exists:', crashReportsDir);
        
        // List files in the crash reports directory
        const files = fs.readdirSync(crashReportsDir);
        console.log('Files in crash reports directory:', files);
      } else {
        console.warn('Crash reports directory does not exist:', crashReportsDir);
      }
      
      // Check if the conversation is from Cline Ultra or standard Cline
      const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks', TEST_TASK_ID);
      const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks', TEST_TASK_ID);
      
      if (fs.existsSync(ultraPath)) {
        console.log('Conversation is from Cline Ultra:', ultraPath);
      } else if (fs.existsSync(standardPath)) {
        console.log('Conversation is from standard Cline:', standardPath);
      } else {
        console.warn('Conversation not found in either Cline Ultra or standard Cline');
      }
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testRecoverCrashedChat();
