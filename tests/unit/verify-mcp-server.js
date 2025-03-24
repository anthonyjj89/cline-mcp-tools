#!/usr/bin/env node

/**
 * Verification script for the Claude Task Reader MCP server
 * This script tests if the MCP server can be imported and started correctly
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const MCP_SERVER_PATH = '/Users/ant/Claude-Task-Reader/build/index.js';
const CONFIG_FILE_PATH = '/Users/ant/Library/Application Support/Claude/claude_desktop_config.json';

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
 * Main verification function
 */
async function verifyMcpServer() {
  console.log(`${colors.bright}${colors.magenta}Claude Task Reader MCP Server Verification${colors.reset}\n`);
  console.log(`${colors.dim}Running verification at: ${new Date().toLocaleString()}${colors.reset}\n`);
  
  const configResult = await verifyConfig();
  const moduleResult = await verifyModule();
  
  if (configResult && moduleResult) {
    const startupResult = await testStartServer();
    
    if (startupResult) {
      printSection('Verification Summary');
      printSuccess('All verification steps passed!');
      printInfo('The Claude Task Reader MCP server should work correctly with Claude Desktop.');
      printInfo('Please restart Claude Desktop to apply the changes.');
    } else {
      printSection('Verification Summary');
      printError('Server startup test failed');
      printInfo('Please check the error messages above for more information.');
    }
  } else {
    printSection('Verification Summary');
    if (!configResult) printError('Configuration verification failed');
    if (!moduleResult) printError('Module verification failed');
    printInfo('Please fix the issues above before continuing.');
  }
  
  // Force exit after verification
  process.exit(0);
}

// Run the verification
verifyMcpServer().catch(error => {
  console.error('Verification error:', error);
  process.exit(1);
});
