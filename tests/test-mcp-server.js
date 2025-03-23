#!/usr/bin/env node

/**
 * Comprehensive test script for the Claude Task Reader MCP server
 * Tests all features including the new context search functionality
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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
const CONFIG_FILE_PATH = '/Users/ant/Library/Application Support/Claude/claude_desktop_config.json';

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
 * Import the MCP server module
 */
async function importMcpServer() {
  try {
    printInfo('Importing MCP server module...');
    const serverModule = await import(MCP_SERVER_PATH);
    
    if (typeof serverModule.startMcpServer !== 'function') {
      throw new Error('startMcpServer function not found in the module');
    }
    
    printSuccess('MCP server module imported successfully');
    return serverModule;
  } catch (error) {
    printError(`Failed to import MCP server module: ${error.message}`);
    throw error;
  }
}

/**
 * Mock the MCP server transport for testing
 */
class MockTransport {
  constructor() {
    this.messages = [];
    this.onMessage = null;
    this.closed = false;
  }
  
  send(message) {
    this.messages.push(message);
    return Promise.resolve();
  }
  
  setOnMessage(callback) {
    this.onMessage = callback;
    return Promise.resolve();
  }
  
  close() {
    this.closed = true;
    return Promise.resolve();
  }
  
  // Simulate receiving a message from the client
  simulateMessage(message) {
    if (this.onMessage) {
      this.onMessage(message);
    }
  }
}

/**
 * Create a mock server for testing
 */
async function createMockServer(serverModule) {
  try {
    // Override the StdioServerTransport with our mock
    const originalTransport = (await import('@modelcontextprotocol/sdk/server/stdio.js')).StdioServerTransport;
    
    // Replace the transport with our mock
    const mockTransport = new MockTransport();
    
    // Start the server with the mock transport
    const server = await serverModule.startMcpServer();
    
    // Return the server and mock transport
    return { server, transport: mockTransport };
  } catch (error) {
    printError(`Failed to create mock server: ${error.message}`);
    throw error;
  }
}

/**
 * Test the list_recent_tasks tool
 */
async function testListRecentTasks(server, transport) {
  printInfo('Testing list_recent_tasks tool...');
  
  try {
    // Simulate a request to list tools
    transport.simulateMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    
    // Check if the list_recent_tasks tool is included in the response
    const toolsResponse = transport.messages.find(msg => 
      msg.id === 1 && msg.result && msg.result.tools
    );
    
    if (!toolsResponse) {
      throw new Error('No tools response received');
    }
    
    const hasListRecentTasksTool = toolsResponse.result.tools.some(tool => 
      tool.name === 'list_recent_tasks'
    );
    
    if (!hasListRecentTasksTool) {
      throw new Error('list_recent_tasks tool not found in tools list');
    }
    
    // Simulate a request to call the list_recent_tasks tool
    transport.simulateMessage({
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
    
    // Check if we got a response
    const callResponse = transport.messages.find(msg => 
      msg.id === 2 && msg.result && msg.result.content
    );
    
    if (!callResponse) {
      throw new Error('No response received for list_recent_tasks call');
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const tasks = JSON.parse(content);
    
    // Validate the response structure
    if (!tasks.tasks || !Array.isArray(tasks.tasks)) {
      throw new Error('Invalid response structure: missing tasks array');
    }
    
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
async function testGetLastNMessages(server, transport, taskId) {
  printInfo('Testing get_last_n_messages tool...');
  
  if (!taskId) {
    skipTest('get_last_n_messages', 'No task ID available');
    return null;
  }
  
  try {
    // Simulate a request to call the get_last_n_messages tool
    transport.simulateMessage({
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
    
    // Check if we got a response
    const callResponse = transport.messages.find(msg => 
      msg.id === 3 && msg.result && msg.result.content
    );
    
    if (!callResponse) {
      throw new Error('No response received for get_last_n_messages call');
    }
    
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
async function testSearchConversations(server, transport, searchTerm = 'test') {
  printInfo('Testing search_conversations tool...');
  
  try {
    // Simulate a request to call the search_conversations tool
    transport.simulateMessage({
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
    
    // Check if we got a response
    const callResponse = transport.messages.find(msg => 
      msg.id === 4 && msg.result && msg.result.content
    );
    
    if (!callResponse) {
      throw new Error('No response received for search_conversations call');
    }
    
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
 * Test the new search_by_context tool
 */
async function testSearchByContext(server, transport, contextTerm = 'project') {
  printInfo('Testing search_by_context tool...');
  
  try {
    // Simulate a request to call the search_by_context tool
    transport.simulateMessage({
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
    
    // Check if we got a response
    const callResponse = transport.messages.find(msg => 
      msg.id === 5 && msg.result && msg.result.content
    );
    
    if (!callResponse) {
      throw new Error('No response received for search_by_context call');
    }
    
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
    
    // Check if each result has context_messages
    const hasContextMessages = results.results.every(result => 
      result.context_messages && Array.isArray(result.context_messages)
    );
    
    if (!hasContextMessages) {
      throw new Error('Invalid response structure: missing context_messages in some results');
    }
    
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
async function testGetTaskById(server, transport, taskId) {
  printInfo('Testing get_task_by_id tool...');
  
  if (!taskId) {
    skipTest('get_task_by_id', 'No task ID available');
    return null;
  }
  
  try {
    // Simulate a request to call the get_task_by_id tool
    transport.simulateMessage({
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
    
    // Check if we got a response
    const callResponse = transport.messages.find(msg => 
      msg.id === 6 && msg.result && msg.result.content
    );
    
    if (!callResponse) {
      throw new Error('No response received for get_task_by_id call');
    }
    
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
async function testGetConversationSummary(server, transport, taskId) {
  printInfo('Testing get_conversation_summary tool...');
  
  if (!taskId) {
    skipTest('get_conversation_summary', 'No task ID available');
    return null;
  }
  
  try {
    // Simulate a request to call the get_conversation_summary tool
    transport.simulateMessage({
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
    
    // Check if we got a response
    const callResponse = transport.messages.find(msg => 
      msg.id === 7 && msg.result && msg.result.content
    );
    
    if (!callResponse) {
      throw new Error('No response received for get_conversation_summary call');
    }
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const summary = JSON.parse(content);
    
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
async function testFindCodeDiscussions(server, transport, taskId) {
  printInfo('Testing find_code_discussions tool...');
  
  if (!taskId) {
    skipTest('find_code_discussions', 'No task ID available');
    return null;
  }
  
  try {
    // Simulate a request to call the find_code_discussions tool
    transport.simulateMessage({
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
    
    // Check if we got a response
    const callResponse = transport.messages.find(msg => 
      msg.id === 8 && msg.result && msg.result.content
    );
    
    if (!callResponse) {
      throw new Error('No response received for find_code_discussions call');
    }
    
    // Check if there's an error
    if (callResponse.result.isError) {
      throw new Error(callResponse.result.content[0].text);
    }
    
    // Parse the response content
    const content = callResponse.result.content[0].text;
    const discussions = JSON.parse(content);
    
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
  console.log(`${colors.bright}${colors.magenta}Claude Task Reader MCP Server Test Suite${colors.reset}\n`);
  console.log(`${colors.dim}Running tests at: ${new Date().toLocaleString()}${colors.reset}\n`);
  
  try {
    // Import the MCP server module
    const serverModule = await importMcpServer();
    
    // Create a mock server for testing
    const { server, transport } = await createMockServer(serverModule);
    
    // Test the list_recent_tasks tool
    const tasksResult = await testListRecentTasks(server, transport);
    
    // Get a task ID for further tests
    let taskId = null;
    if (tasksResult && tasksResult.tasks && tasksResult.tasks.length > 0) {
      taskId = tasksResult.tasks[0].id;
    }
    
    // Test the get_last_n_messages tool
    await testGetLastNMessages(server, transport, taskId);
    
    // Test the search_conversations tool
    await testSearchConversations(server, transport);
    
    // Test the new search_by_context tool
    await testSearchByContext(server, transport);
    
    // Test the get_task_by_id tool
    await testGetTaskById(server, transport, taskId);
    
    // Test the get_conversation_summary tool
    await testGetConversationSummary(server, transport, taskId);
    
    // Test the find_code_discussions tool
    await testFindCodeDiscussions(server, transport, taskId);
    
    // Print the test summary
    printTestSummary();
    
    // Close the server
    await server.close();
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
