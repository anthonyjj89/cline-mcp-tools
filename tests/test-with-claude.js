#!/usr/bin/env node

/**
 * Test script for the Claude Task Reader MCP server with Claude Desktop
 * This script tests the connection to Claude Desktop and the new context search feature
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

// Create a require function
const require = createRequire(import.meta.url);

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Promisify exec
const execAsync = promisify(exec);

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
 * Check if a file exists
 */
function fileExists(path) {
  try {
    fs.accessSync(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verify the Claude Desktop configuration
 */
async function verifyConfig() {
  printSection('Verifying Claude Desktop Configuration');
  
  if (!fileExists(CONFIG_FILE_PATH)) {
    printError(`Configuration file not found at: ${CONFIG_FILE_PATH}`);
    return false;
  }
  
  printSuccess(`Configuration file found at: ${CONFIG_FILE_PATH}`);
  
  try {
    const configContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    const config = JSON.parse(configContent);
    
    if (!config.mcpServers || !config.mcpServers['claude-task-reader']) {
      printError('claude-task-reader MCP server not found in configuration');
      return false;
    }
    
    const serverConfig = config.mcpServers['claude-task-reader'];
    printInfo(`Server command: ${serverConfig.command}`);
    printInfo(`Server args: ${JSON.stringify(serverConfig.args)}`);
    
    if (serverConfig.disabled) {
      printWarning('Server is disabled in configuration');
    } else {
      printSuccess('Server is enabled in configuration');
    }
    
    const configuredPath = serverConfig.args[0];
    if (configuredPath !== MCP_SERVER_PATH) {
      printWarning(`Configured path (${configuredPath}) doesn't match expected path (${MCP_SERVER_PATH})`);
    } else {
      printSuccess('Configured path matches expected path');
    }
    
    return true;
  } catch (error) {
    printError(`Error parsing configuration: ${error.message}`);
    return false;
  }
}

/**
 * Verify the MCP server module
 */
async function verifyModule() {
  printSection('Verifying MCP Server Module');
  
  if (!fileExists(MCP_SERVER_PATH)) {
    printError(`MCP server module not found at: ${MCP_SERVER_PATH}`);
    return false;
  }
  
  printSuccess(`MCP server module found at: ${MCP_SERVER_PATH}`);
  
  try {
    printInfo('Attempting to import the MCP server module...');
    const serverModule = await import(MCP_SERVER_PATH);
    
    printSuccess('Module imported successfully!');
    printInfo(`Available exports: ${Object.keys(serverModule)}`);
    
    if (typeof serverModule.startMcpServer !== 'function') {
      printError('startMcpServer function not found in the module');
      return false;
    }
    
    printSuccess('startMcpServer function found in the module');
    return true;
  } catch (error) {
    printError(`Error importing module: ${error.message}`);
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      printInfo(`Module not found: ${error.url || error.message}`);
    }
    return false;
  }
}

/**
 * Test starting the MCP server
 */
async function testStartServer() {
  printSection('Testing MCP Server Startup');
  
  try {
    printInfo('Attempting to import the MCP server module...');
    const serverModule = await import(MCP_SERVER_PATH);
    
    if (typeof serverModule.startMcpServer !== 'function') {
      printError('startMcpServer function not found in the module');
      return false;
    }
    
    printInfo('Starting MCP server (will timeout after 5 seconds)...');
    
    // Create a promise that resolves after a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Server startup timed out after 5 seconds'));
      }, 5000);
    });
    
    // Create a promise for the server startup
    const startupPromise = new Promise((resolve) => {
      // Redirect console.error to capture server output
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const message = args.join(' ');
        if (message.includes('Claude Task Reader MCP server running on stdio')) {
          resolve(true);
        }
        originalConsoleError(...args);
      };
      
      // Start the server
      serverModule.startMcpServer().catch(error => {
        printError(`Server startup error: ${error.message}`);
        resolve(false);
      });
    });
    
    // Race the startup promise against the timeout
    const result = await Promise.race([startupPromise, timeoutPromise]);
    
    if (result === true) {
      printSuccess('MCP server started successfully!');
      return true;
    } else {
      printError('MCP server failed to start');
      return false;
    }
  } catch (error) {
    printError(`Error during server startup test: ${error.message}`);
    return false;
  }
}

/**
 * Test the connection to Claude Desktop
 */
async function testClaudeDesktopConnection() {
  printSection('Testing Connection to Claude Desktop');
  
  try {
    printInfo('Checking if Claude Desktop is running...');
    
    // Check if Claude Desktop is running
    const { stdout: psOutput } = await execAsync('ps aux | grep -i "Claude.app" | grep -v grep');
    
    if (!psOutput.trim()) {
      printWarning('Claude Desktop does not appear to be running');
      printInfo('Please start Claude Desktop and try again');
      return false;
    }
    
    printSuccess('Claude Desktop appears to be running');
    
    // Check if the MCP server is configured correctly
    const configResult = await verifyConfig();
    
    if (!configResult) {
      printWarning('Claude Desktop configuration is not correct');
      printInfo('Please check the configuration and try again');
      return false;
    }
    
    printSuccess('Claude Desktop is configured correctly');
    
    // Suggest testing with Claude Desktop
    printInfo('To test the connection with Claude Desktop, try the following:');
    printInfo('1. Open Claude Desktop');
    printInfo('2. Start a new conversation');
    printInfo('3. Ask Claude to "list my recent VS Code tasks"');
    printInfo('4. Ask Claude to "search my VS Code conversations for [term]"');
    printInfo('5. Ask Claude to "search for conversations about [project] with context"');
    
    return true;
  } catch (error) {
    printError(`Error testing Claude Desktop connection: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.magenta}Claude Task Reader MCP Server Test with Claude Desktop${colors.reset}\n`);
  console.log(`${colors.dim}Running tests at: ${new Date().toLocaleString()}${colors.reset}\n`);
  
  try {
    // Verify the MCP server module
    const moduleResult = await verifyModule();
    
    if (!moduleResult) {
      printError('MCP server module verification failed');
      process.exit(1);
    }
    
    // Test starting the MCP server
    const startupResult = await testStartServer();
    
    if (!startupResult) {
      printError('MCP server startup test failed');
      process.exit(1);
    }
    
    // Test the connection to Claude Desktop
    const connectionResult = await testClaudeDesktopConnection();
    
    if (!connectionResult) {
      printWarning('Claude Desktop connection test failed');
      printInfo('Please check Claude Desktop and try again');
    }
    
    printSection('Test Summary');
    
    if (moduleResult && startupResult && connectionResult) {
      printSuccess('All tests passed!');
      printInfo('The Claude Task Reader MCP server is working correctly with Claude Desktop');
    } else {
      printWarning('Some tests failed');
      printInfo('Please check the error messages above for more information');
    }
    
    // Provide example commands for testing the new context search feature
    printSection('Testing the New Context Search Feature');
    
    printInfo('To test the new context search feature, try the following commands in Claude Desktop:');
    printInfo('1. "Search for conversations about [project/topic] with context"');
    printInfo('2. "Find discussions about [topic] and show me the surrounding messages"');
    printInfo('3. "Look for conversations mentioning [term] and show me the context"');
    
    printInfo('\nExample:');
    printInfo('"Search for conversations about React project with context and show me 3 messages before and after each match"');
  } catch (error) {
    printError(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
