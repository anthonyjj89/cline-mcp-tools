#!/usr/bin/env node

/**
 * Enhanced MCP debugging script
 * 
 * This script provides a robust way to test MCP server communication with proper
 * JSON-RPC protocol handling and debugging capabilities.
 * 
 * Inspired by Pierre Carion's debugging technique for MCP servers.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the MCP server - using index.js which is the correct entry point
const SERVER_PATH = path.join(__dirname, 'build', 'index.js');

// Create a unique ID for this debugging session
const DEBUG_SESSION_ID = Date.now().toString();

// Create a debug log directory
const DEBUG_DIR = path.join(__dirname, 'debug-logs');
fs.mkdirpSync(DEBUG_DIR);

// Create a debug log file
const DEBUG_LOG = path.join(DEBUG_DIR, `mcp-debug-${DEBUG_SESSION_ID}.log`);
const debugStream = fs.createWriteStream(DEBUG_LOG, { flags: 'a' });

// Log function that writes to both console and file
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(formattedMessage);
  debugStream.write(formattedMessage + '\n');
}

// Function to log JSON objects in a pretty format
function logJson(obj, label) {
  log(`${label}:\n${JSON.stringify(obj, null, 2)}`, 'JSON');
}

/**
 * MCP Server Tester class
 * Handles the communication with the MCP server with proper protocol handling
 */
class McpServerTester {
  constructor(serverPath) {
    this.serverPath = serverPath;
    this.server = null;
    this.responseBuffer = '';
    this.responseCallbacks = new Map();
    this.initialized = false;
    this.nextRequestId = 1;
  }

  /**
   * Start the MCP server process
   */
  start() {
    log(`Starting MCP server: ${this.serverPath}`, 'START');
    
    this.server = spawn('node', [this.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Set up readline interface for line-by-line processing
    this.rl = createInterface({
      input: this.server.stdout,
      crlfDelay: Infinity
    });
    
    // Handle stdout line by line
    this.rl.on('line', (line) => {
      if (line.trim()) {
        log(`[SERVER OUT] ${line}`, 'RECV');
        this.processResponse(line);
      }
    });
    
    // Handle stderr
    this.server.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        log(`[SERVER ERR] ${message}`, 'ERR');
      }
    });
    
    // Handle server exit
    this.server.on('close', (code) => {
      log(`Server exited with code ${code}`, 'EXIT');
      this.cleanup();
    });
    
    // Handle errors
    this.server.on('error', (err) => {
      log(`Server error: ${err.message}`, 'ERROR');
      this.cleanup();
    });
    
    return this;
  }
  
  /**
   * Process a response line from the server
   */
  processResponse(line) {
    try {
      const response = JSON.parse(line);
      
      // Check if this is a response to a request
      if (response.id && this.responseCallbacks.has(response.id)) {
        const callback = this.responseCallbacks.get(response.id);
        this.responseCallbacks.delete(response.id);
        callback(response);
      } else {
        log(`Received response with no matching callback, id: ${response.id}`, 'WARN');
      }
    } catch (err) {
      log(`Error parsing response: ${err.message}`, 'ERROR');
      log(`Problematic line: ${line}`, 'ERROR');
    }
  }
  
  /**
   * Send a request to the server
   */
  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      try {
        const id = this.nextRequestId++;
        
        const request = {
          jsonrpc: '2.0',
          id,
          method,
          params
        };
        
        // Register callback for this request ID
        this.responseCallbacks.set(id, (response) => {
          if (response.error) {
            reject(new Error(`Server error: ${response.error.message} (code: ${response.error.code})`));
          } else {
            resolve(response);
          }
        });
        
        // Log the request
        logJson(request, `Sending request (ID: ${id})`);
        
        // Add timeout to prevent hanging if server doesn't respond
        const timeoutId = setTimeout(() => {
          if (this.responseCallbacks.has(id)) {
            this.responseCallbacks.delete(id);
            reject(new Error(`Request timed out after 10 seconds: ${method}`));
          }
        }, 10000);
        
        // Send the request
        if (!this.server || !this.server.stdin.writable) {
          clearTimeout(timeoutId);
          reject(new Error('Server not running or stdin not writable'));
          return;
        }
        
        this.server.stdin.write(JSON.stringify(request) + '\n');
      } catch (err) {
        reject(new Error(`Failed to send request: ${err.message}`));
      }
    });
  }
  
  /**
   * Initialize the server (required before calling tools)
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    log('Initializing server...', 'INIT');
    
    try {
      const response = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'mcp-debug-client',
          version: '1.0.0'
        }
      });
      
      logJson(response, 'Initialize response');
      
      this.initialized = true;
      log('Server initialized successfully', 'INIT');
      return true;
    } catch (err) {
      log(`Initialization failed: ${err.message}`, 'ERROR');
      return false;
    }
  }
  
  /**
   * List available tools
   */
  async listTools() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    log('Requesting tool list...', 'TOOLS');
    
    try {
      const response = await this.sendRequest('listTools');
      
      if (response.result && response.result.tools) {
        const tools = response.result.tools;
        log(`Found ${tools.length} tools:`, 'TOOLS');
        tools.forEach((tool, index) => {
          log(`  ${index + 1}. ${tool.name}: ${tool.description}`, 'TOOLS');
        });
        return tools;
      } else {
        log('No tools found in response', 'WARN');
        return [];
      }
    } catch (err) {
      log(`List tools failed: ${err.message}`, 'ERROR');
      return [];
    }
  }
  
  /**
   * Call a tool
   */
  async callTool(name, args = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    log(`Calling tool: ${name}`, 'CALL');
    logJson(args, 'Tool arguments');
    
    try {
      const response = await this.sendRequest('callTool', {
        name,
        arguments: args
      });
      
      logJson(response, 'Tool response');
      
      if (response.result && response.result.content) {
        return response.result;
      } else {
        log('No content found in tool response', 'WARN');
        return null;
      }
    } catch (err) {
      log(`Tool call failed: ${err.message}`, 'ERROR');
      return null;
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.rl) {
      this.rl.close();
    }
    
    if (this.server) {
      this.server.kill();
    }
    
    // Only log the debug file location if the stream is still writable
    if (debugStream.writable) {
      log(`Debug log written to: ${DEBUG_LOG}`, 'END');
      debugStream.end();
    }
  }
  
  /**
   * Stop the server
   */
  stop() {
    log('Stopping server...', 'STOP');
    this.cleanup();
  }
}

/**
 * Create test active_tasks.json files for testing
 */
async function setupTestFiles() {
  const homedir = os.homedir();
  const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  
  // Create test data
  const testData = {
    activeTasks: [
      {
        id: "1711369200000", // Example timestamp
        label: "A",
        lastActivated: Date.now() - 60000 // 1 minute ago
      },
      {
        id: "1711369300000", // Example timestamp
        label: "B",
        lastActivated: Date.now() - 120000 // 2 minutes ago
      }
    ]
  };
  
  // Ensure directories exist
  await fs.ensureDir(path.dirname(ultraPath));
  
  // Write test data to Ultra path
  await fs.writeJson(ultraPath, testData, { spaces: 2 });
  log(`Created test active_tasks.json at ${ultraPath}`);
  
  return { ultraPath };
}

/**
 * Clean up test files
 */
async function cleanupTestFiles(paths) {
  try {
    await fs.remove(paths.ultraPath);
    log(`Removed test file: ${paths.ultraPath}`);
  } catch (err) {
    log(`Error removing test file: ${err.message}`, 'ERROR');
  }
}

/**
 * Run tests for the get_active_task tool
 */
async function testGetActiveTask() {
  // Set up test files
  const testPaths = await setupTestFiles();
  
  // Create and start the tester
  const tester = new McpServerTester(SERVER_PATH).start();
  
  try {
    // Initialize the server
    await tester.initialize();
    
    // Call the get_active_task tool
    const result = await tester.callTool('get_active_task');
    
    if (result && result.content && result.content[0].text) {
      const content = JSON.parse(result.content[0].text);
      if (content.active_tasks && content.active_tasks.length > 0) {
        log('✅ Test passed: Found active tasks', 'SUCCESS');
      } else {
        log('❌ Test failed: No active tasks found', 'FAIL');
      }
    } else {
      log('❌ Test failed: Invalid response format', 'FAIL');
    }
  } catch (err) {
    log(`Test error: ${err.message}`, 'ERROR');
  } finally {
    // Stop the tester
    tester.stop();
    
    // Clean up test files
    await cleanupTestFiles(testPaths);
  }
}

/**
 * Run tests for the get_active_task tool with label filter
 */
async function testGetActiveTaskWithLabel() {
  // Set up test files
  const testPaths = await setupTestFiles();
  
  // Create and start the tester
  const tester = new McpServerTester(SERVER_PATH).start();
  
  try {
    // Initialize the server
    await tester.initialize();
    
    // Call the get_active_task tool with label filter
    const result = await tester.callTool('get_active_task', { label: 'A' });
    
    if (result && result.content && result.content[0].text) {
      const content = JSON.parse(result.content[0].text);
      if (content.active_tasks && 
          content.active_tasks.length > 0 && 
          content.active_tasks.every(task => task.active_label === 'A')) {
        log('✅ Test passed: Found active tasks with label A', 'SUCCESS');
      } else {
        log('❌ Test failed: No active tasks with label A found', 'FAIL');
      }
    } else {
      log('❌ Test failed: Invalid response format', 'FAIL');
    }
  } catch (err) {
    log(`Test error: ${err.message}`, 'ERROR');
  } finally {
    // Stop the tester
    tester.stop();
    
    // Clean up test files
    await cleanupTestFiles(testPaths);
  }
}

/**
 * Run tests for the recover_crashed_chat tool
 */
async function testRecoverCrashedChat() {
  // Create and start the tester
  const tester = new McpServerTester(SERVER_PATH).start();
  
  try {
    // Initialize the server
    await tester.initialize();
    
    // Use a specific task ID for testing
    const testTaskId = '1742912459362';
    log(`Using task ${testTaskId} for testing...`);
    
    // Call the recover_crashed_chat tool
    const result = await tester.callTool('recover_crashed_chat', {
      task_id: testTaskId,
      max_length: 1000,
      include_code_snippets: true,
      save_to_crashreports: true
    });
    
    if (result && result.content && result.content[0].text) {
      const content = JSON.parse(result.content[0].text);
      
      log('\n=== Recovery Result ===');
      log(`Task ID: ${content.task_id || 'N/A'}`);
      log(`Main Topic: ${content.main_topic || 'N/A'}`);
      log(`Summary: ${content.summary ? content.summary.substring(0, 100) + '...' : 'N/A'}`);
      log(`Crash Report Saved: ${content.crash_report_saved || false}`);
      log(`Crash Report ID: ${content.crash_report_id || 'N/A'}`);
      log(`Crash Report Path: ${content.crash_report_path || 'N/A'}`);
      
      log('✅ Test passed: Successfully recovered crashed chat', 'SUCCESS');
    } else {
      log('❌ Test failed: Invalid response format', 'FAIL');
    }
  } catch (err) {
    log(`Test error: ${err.message}`, 'ERROR');
  } finally {
    // Stop the tester
    tester.stop();
  }
}

/**
 * Test listing available tools
 */
async function testListTools() {
  // Create and start the tester
  const tester = new McpServerTester(SERVER_PATH).start();
  
  try {
    // Initialize the server
    await tester.initialize();
    
    // List available tools
    const tools = await tester.listTools();
    
    if (tools && tools.length > 0) {
      log(`Found ${tools.length} tools:`, 'SUCCESS');
      tools.forEach((tool, index) => {
        log(`  ${index + 1}. ${tool.name}: ${tool.description}`, 'SUCCESS');
      });
    } else {
      log('No tools found', 'WARN');
    }
  } catch (err) {
    log(`Test error: ${err.message}`, 'ERROR');
  } finally {
    // Stop the tester
    tester.stop();
  }
}

/**
 * Main function
 */
async function main() {
  log('Starting MCP debug tests...', 'START');
  
  // First, list available tools
  log('\n=== Listing available tools ===');
  await testListTools();
  
  // Run the tests
  log('\n=== Testing get_active_task tool ===');
  await testGetActiveTask();
  
  log('\n=== Testing get_active_task tool with label filter ===');
  await testGetActiveTaskWithLabel();
  
  log('\n=== Testing recover_crashed_chat tool ===');
  await testRecoverCrashedChat();
  
  log('\nAll tests completed', 'END');
}

// Run the main function
main().catch(err => {
  log(`Fatal error: ${err.message}`, 'FATAL');
  process.exit(1);
});
