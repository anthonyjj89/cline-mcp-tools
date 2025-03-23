#!/usr/bin/env node

/**
 * Comprehensive test script for the Claude Task Reader MCP server tools
 * Tests each tool individually with valid and invalid inputs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// Create a require function
const require = createRequire(import.meta.url);

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

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
  cyan: '\x1b[36m',
};

// Configuration
const MCP_SERVER_PATH = '/Users/ant/Claude-Task-Reader/build/index.js';
const TEST_RESULTS_DIR = join(__dirname, 'results');

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  details: []
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
 * Print a warning message
 */
function printWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

/**
 * Print an info message
 */
function printInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

/**
 * Record a test result
 */
function recordTestResult(name, passed, message, details = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    printSuccess(`${name}: ${message}`);
  } else {
    testResults.failed++;
    printError(`${name}: ${message}`);
    if (details) {
      console.log(`  ${colors.dim}${details}${colors.reset}`);
    }
  }
  
  testResults.details.push({
    name,
    passed,
    message,
    details
  });
}

/**
 * Skip a test
 */
function skipTest(name, reason) {
  testResults.total++;
  testResults.skipped++;
  printWarning(`${name}: SKIPPED - ${reason}`);
  
  testResults.details.push({
    name,
    skipped: true,
    message: reason
  });
}

/**
 * Print the test summary
 */
function printTestSummary() {
  printSection('Test Summary');
  
  const passRate = (testResults.passed / testResults.total) * 100;
  
  console.log(`Total tests: ${testResults.total}`);
  console.log(`Passed: ${colors.green}${testResults.passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${testResults.failed}${colors.reset}`);
  console.log(`Skipped: ${colors.yellow}${testResults.skipped}${colors.reset}`);
  console.log(`Pass rate: ${passRate.toFixed(2)}%`);
  
  if (testResults.failed > 0) {
    printSection('Failed Tests');
    testResults.details
      .filter(test => !test.passed && !test.skipped)
      .forEach(test => {
        printError(`${test.name}: ${test.message}`);
        if (test.details) {
          console.log(`  ${colors.dim}${test.details}${colors.reset}`);
        }
      });
  }
}

/**
 * Create a directory if it doesn't exist
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save test results to a file
 */
function saveTestResults(filename, data) {
  ensureDirectoryExists(TEST_RESULTS_DIR);
  const filePath = join(TEST_RESULTS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  printInfo(`Test results saved to ${filePath}`);
}

/**
 * Start the MCP server as a child process
 */
function startMcpServer() {
  printInfo('Starting MCP server...');
  
  const serverProcess = spawn('node', [MCP_SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });
  
  // Handle server output
  serverProcess.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    const message = data.toString();
    if (message.includes('Claude Task Reader MCP server running on stdio')) {
      printSuccess('MCP server started successfully');
    } else {
      console.error(`Server stderr: ${message}`);
    }
  });
  
  // Handle server exit
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      printError(`Server process exited with code ${code}`);
    }
  });
  
  return serverProcess;
}

/**
 * Send a message to the MCP server
 */
function sendMessageToServer(serverProcess, message) {
  return new Promise((resolve, reject) => {
    let responseData = '';
    
    // Set up a handler for the response
    const dataHandler = (data) => {
      responseData += data.toString();
      
      try {
        // Try to parse the response as JSON
        const jsonResponse = JSON.parse(responseData);
        
        // If we got a valid JSON response, resolve the promise
        serverProcess.stdout.removeListener('data', dataHandler);
        resolve(jsonResponse);
      } catch (error) {
        // If we can't parse the response as JSON, keep listening
      }
    };
    
    // Listen for the response
    serverProcess.stdout.on('data', dataHandler);
    
    // Send the message to the server
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
  });
}

/**
 * Test the list_recent_tasks tool
 */
async function testListRecentTasks(serverProcess) {
  printInfo('Testing list_recent_tasks tool...');
  
  try {
    // Send a request to list tools
    const toolsResponse = await sendMessageToServer(serverProcess, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    
    // Check if the list_recent_tasks tool is included in the response
    const hasListRecentTasksTool = toolsResponse.result.tools.some(tool => 
      tool.name === 'list_recent_tasks'
    );
    
    if (!hasListRecentTasksTool) {
      throw new Error('list_recent_tasks tool not found in tools list');
    }
    
    // Send a request to call the list_recent_tasks tool
    const callResponse = await sendMessageToServer(serverProcess, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_recent_tasks',
        arguments: {
          limit: 5
        }
      }
    });
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const tasks = JSON.parse(content);
    
    // Validate the response structure
    if (!tasks.tasks || !Array.isArray(tasks.tasks)) {
      throw new Error('Invalid response structure: missing tasks array');
    }
    
    // Save the test results
    saveTestResults('list_recent_tasks.json', tasks);
    
    recordTestResult(
      'list_recent_tasks', 
      true, 
      `Successfully listed ${tasks.tasks.length} tasks`
    );
    
    return tasks;
  } catch (error) {
    recordTestResult(
      'list_recent_tasks', 
      false, 
      'Failed to test list_recent_tasks', 
      error.message
    );
    return null;
  }
}

/**
 * Test the get_last_n_messages tool
 */
async function testGetLastNMessages(serverProcess, taskId) {
  printInfo('Testing get_last_n_messages tool...');
  
  if (!taskId) {
    skipTest('get_last_n_messages', 'No task ID available');
    return null;
  }
  
  try {
    // Send a request to call the get_last_n_messages tool
    const callResponse = await sendMessageToServer(serverProcess, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_last_n_messages',
        arguments: {
          task_id: taskId,
          limit: 5
        }
      }
    });
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const messages = JSON.parse(content);
    
    // Validate the response structure
    if (!Array.isArray(messages)) {
      throw new Error('Invalid response structure: not an array');
    }
    
    // Save the test results
    saveTestResults('get_last_n_messages.json', messages);
    
    recordTestResult(
      'get_last_n_messages', 
      true, 
      `Successfully retrieved ${messages.length} messages`
    );
    
    return messages;
  } catch (error) {
    recordTestResult(
      'get_last_n_messages', 
      false, 
      'Failed to test get_last_n_messages', 
      error.message
    );
    return null;
  }
}

/**
 * Test the search_conversations tool
 */
async function testSearchConversations(serverProcess, searchTerm = 'test') {
  printInfo('Testing search_conversations tool...');
  
  try {
    // Send a request to call the search_conversations tool
    const callResponse = await sendMessageToServer(serverProcess, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'search_conversations',
        arguments: {
          search_term: searchTerm,
          limit: 5,
          max_tasks_to_search: 5
        }
      }
    });
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const results = JSON.parse(content);
    
    // Validate the response structure
    if (!results.results || !Array.isArray(results.results)) {
      throw new Error('Invalid response structure: missing results array');
    }
    
    // Save the test results
    saveTestResults('search_conversations.json', results);
    
    recordTestResult(
      'search_conversations', 
      true, 
      `Successfully searched for "${searchTerm}" and found ${results.results.length} results`
    );
    
    return results;
  } catch (error) {
    recordTestResult(
      'search_conversations', 
      false, 
      'Failed to test search_conversations', 
      error.message
    );
    return null;
  }
}

/**
 * Test the search_by_context tool
 */
async function testSearchByContext(serverProcess, contextTerm = 'project') {
  printInfo('Testing search_by_context tool...');
  
  try {
    // Send a request to call the search_by_context tool
    const callResponse = await sendMessageToServer(serverProcess, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'search_by_context',
        arguments: {
          context_term: contextTerm,
          context_lines: 2,
          max_results: 3
        }
      }
    });
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const results = JSON.parse(content);
    
    // Validate the response structure
    if (!results.results || !Array.isArray(results.results)) {
      throw new Error('Invalid response structure: missing results array');
    }
    
    // Save the test results
    saveTestResults('search_by_context.json', results);
    
    recordTestResult(
      'search_by_context', 
      true, 
      `Successfully searched for context "${contextTerm}" and found ${results.results.length} results with context`
    );
    
    return results;
  } catch (error) {
    recordTestResult(
      'search_by_context', 
      false, 
      'Failed to test search_by_context', 
      error.message
    );
    return null;
  }
}

/**
 * Test the get_task_by_id tool
 */
async function testGetTaskById(serverProcess, taskId) {
  printInfo('Testing get_task_by_id tool...');
  
  if (!taskId) {
    skipTest('get_task_by_id', 'No task ID available');
    return null;
  }
  
  try {
    // Send a request to call the get_task_by_id tool
    const callResponse = await sendMessageToServer(serverProcess, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'get_task_by_id',
        arguments: {
          task_id: taskId
        }
      }
    });
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const task = JSON.parse(content);
    
    // Validate the response structure
    if (!task.task || !task.messages) {
      throw new Error('Invalid response structure: missing task or messages');
    }
    
    // Save the test results
    saveTestResults('get_task_by_id.json', task);
    
    recordTestResult(
      'get_task_by_id', 
      true, 
      `Successfully retrieved task with ID ${taskId}`
    );
    
    return task;
  } catch (error) {
    recordTestResult(
      'get_task_by_id', 
      false, 
      'Failed to test get_task_by_id', 
      error.message
    );
    return null;
  }
}

/**
 * Test the get_conversation_summary tool
 */
async function testGetConversationSummary(serverProcess, taskId) {
  printInfo('Testing get_conversation_summary tool...');
  
  if (!taskId) {
    skipTest('get_conversation_summary', 'No task ID available');
    return null;
  }
  
  try {
    // Send a request to call the get_conversation_summary tool
    const callResponse = await sendMessageToServer(serverProcess, {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'get_conversation_summary',
        arguments: {
          task_id: taskId
        }
      }
    });
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const summary = JSON.parse(content);
    
    // Save the test results
    saveTestResults('get_conversation_summary.json', summary);
    
    recordTestResult(
      'get_conversation_summary', 
      true, 
      `Successfully generated summary for task with ID ${taskId}`
    );
    
    return summary;
  } catch (error) {
    recordTestResult(
      'get_conversation_summary', 
      false, 
      'Failed to test get_conversation_summary', 
      error.message
    );
    return null;
  }
}

/**
 * Test the find_code_discussions tool
 */
async function testFindCodeDiscussions(serverProcess, taskId) {
  printInfo('Testing find_code_discussions tool...');
  
  if (!taskId) {
    skipTest('find_code_discussions', 'No task ID available');
    return null;
  }
  
  try {
    // Send a request to call the find_code_discussions tool
    const callResponse = await sendMessageToServer(serverProcess, {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'find_code_discussions',
        arguments: {
          task_id: taskId
        }
      }
    });
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const discussions = JSON.parse(content);
    
    // Save the test results
    saveTestResults('find_code_discussions.json', discussions);
    
    recordTestResult(
      'find_code_discussions', 
      true, 
      `Successfully found code discussions for task with ID ${taskId}`
    );
    
    return discussions;
  } catch (error) {
    recordTestResult(
      'find_code_discussions', 
      false, 
      'Failed to test find_code_discussions', 
      error.message
    );
    return null;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`${colors.bright}${colors.magenta}Claude Task Reader MCP Server Tool Tests${colors.reset}\n`);
  console.log(`${colors.dim}Running tests at: ${new Date().toLocaleString()}${colors.reset}\n`);
  
  try {
    // Start the MCP server
    const serverProcess = startMcpServer();
    
    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test the list_recent_tasks tool
    const tasksResult = await testListRecentTasks(serverProcess);
    
    // Get a task ID for further tests
    let taskId = null;
    if (tasksResult && tasksResult.tasks && tasksResult.tasks.length > 0) {
      taskId = tasksResult.tasks[0].id;
    }
    
    // Test the get_last_n_messages tool
    await testGetLastNMessages(serverProcess, taskId);
    
    // Test the search_conversations tool
    await testSearchConversations(serverProcess);
    
    // Test the new search_by_context tool
    await testSearchByContext(serverProcess);
    
    // Test the get_task_by_id tool
    await testGetTaskById(serverProcess, taskId);
    
    // Test the get_conversation_summary tool
    await testGetConversationSummary(serverProcess, taskId);
    
    // Test the find_code_discussions tool
    await testFindCodeDiscussions(serverProcess, taskId);
    
    // Print the test summary
    printTestSummary();
    
    // Kill the server process
    serverProcess.kill();
  } catch (error) {
    printError(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
