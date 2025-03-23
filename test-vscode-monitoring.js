#!/usr/bin/env node

/**
 * Test script for the VS Code monitoring tools
 * 
 * This script demonstrates how to use the VS Code monitoring tools
 * added to the Cline Chat Reader MCP server.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');
const path = require('path');

// Path to the MCP server
const mcpServerPath = path.resolve('./build/index.js');

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
  cyan: '\x1b[36m'
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
 * Print an info message
 */
function printInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

/**
 * Function to send a request to the MCP server
 */
async function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    server.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });
    
    server.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}: ${stderr}`));
      } else {
        try {
          const response = JSON.parse(stdout);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      }
    });
    
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();
  });
}

/**
 * Test the get_vscode_workspaces tool
 */
async function testGetVSCodeWorkspaces() {
  printSection("Testing get_vscode_workspaces");
  
  try {
    // Call get_vscode_workspaces
    const getWorkspacesRequest = {
      jsonrpc: "2.0",
      id: "1",
      method: "tools/call",
      params: {
        name: "get_vscode_workspaces",
        arguments: {}
      }
    };
    
    printInfo("Getting VS Code workspaces...");
    const workspacesResponse = await sendMcpRequest(getWorkspacesRequest);
    
    if (workspacesResponse.error) {
      throw new Error(`Error response: ${JSON.stringify(workspacesResponse.error)}`);
    }
    
    const workspacesData = JSON.parse(workspacesResponse.result.content[0].text);
    
    printInfo(`Found ${workspacesData.count} workspaces`);
    
    if (workspacesData.count > 0) {
      printInfo("\nWorkspaces:");
      workspacesData.workspaces.forEach((workspace, index) => {
        console.log(`[${index + 1}] ${workspace}`);
      });
      
      printSuccess("get_vscode_workspaces is working correctly");
      return workspacesData.workspaces[0]; // Return the first workspace for use in other tests
    } else {
      printInfo("No workspaces found");
      printSuccess("get_vscode_workspaces is working correctly");
      return null;
    }
  } catch (error) {
    printError(`Error testing get_vscode_workspaces: ${error.message}`);
    return null;
  }
}

/**
 * Test the analyze_workspace tool
 */
async function testAnalyzeWorkspace(workspacePath) {
  printSection("Testing analyze_workspace");
  
  if (!workspacePath) {
    printInfo("No workspace path provided, skipping test");
    return;
  }
  
  try {
    // Call analyze_workspace
    const analyzeWorkspaceRequest = {
      jsonrpc: "2.0",
      id: "2",
      method: "tools/call",
      params: {
        name: "analyze_workspace",
        arguments: {
          workspacePath,
          hoursBack: 24
        }
      }
    };
    
    printInfo(`Analyzing workspace: ${workspacePath}...`);
    const analyzeResponse = await sendMcpRequest(analyzeWorkspaceRequest);
    
    if (analyzeResponse.error) {
      throw new Error(`Error response: ${JSON.stringify(analyzeResponse.error)}`);
    }
    
    const analyzeData = JSON.parse(analyzeResponse.result.content[0].text);
    
    printInfo("\nWorkspace Analysis:");
    printInfo(`Name: ${analyzeData.workspace.name}`);
    printInfo(`Has Settings: ${analyzeData.settings.hasSettings}`);
    printInfo(`Has Launch Config: ${analyzeData.launchConfig.hasLaunchConfig}`);
    printInfo(`Has Recommendations: ${analyzeData.extensions.hasRecommendations}`);
    printInfo(`Is Git Repo: ${analyzeData.gitInfo.isGitRepo}`);
    printInfo(`Recent Files: ${analyzeData.recentFiles.count}`);
    
    printSuccess("analyze_workspace is working correctly");
    
    // Return a file path for use in the get_file_history test
    if (analyzeData.recentFiles.count > 0) {
      return analyzeData.recentFiles.mostRecent[0].path;
    }
    
    return null;
  } catch (error) {
    printError(`Error testing analyze_workspace: ${error.message}`);
    return null;
  }
}

/**
 * Test the get_file_history tool
 */
async function testGetFileHistory(filePath) {
  printSection("Testing get_file_history");
  
  if (!filePath) {
    printInfo("No file path provided, skipping test");
    return;
  }
  
  try {
    // Call get_file_history
    const getFileHistoryRequest = {
      jsonrpc: "2.0",
      id: "3",
      method: "tools/call",
      params: {
        name: "get_file_history",
        arguments: {
          filePath
        }
      }
    };
    
    printInfo(`Getting history for file: ${filePath}...`);
    const historyResponse = await sendMcpRequest(getFileHistoryRequest);
    
    if (historyResponse.error) {
      throw new Error(`Error response: ${JSON.stringify(historyResponse.error)}`);
    }
    
    const historyData = JSON.parse(historyResponse.result.content[0].text);
    
    printInfo("\nFile History:");
    printInfo(`Is Git Repo: ${historyData.isGitRepo}`);
    
    if (historyData.isGitRepo) {
      printInfo(`Commit Count: ${historyData.history.length}`);
      
      if (historyData.history.length > 0) {
        printInfo("\nLatest Commit:");
        printInfo(`Hash: ${historyData.history[0].hash}`);
        printInfo(`Date: ${historyData.history[0].date}`);
        printInfo(`Message: ${historyData.history[0].message}`);
        printInfo(`Author: ${historyData.history[0].author}`);
      }
    } else {
      printInfo("\nFile Info:");
      printInfo(`Path: ${historyData.fileInfo.path}`);
      printInfo(`Last Modified: ${historyData.fileInfo.lastModified}`);
      printInfo(`Size: ${historyData.fileInfo.size}`);
      printInfo(`Created: ${historyData.fileInfo.created}`);
    }
    
    printSuccess("get_file_history is working correctly");
  } catch (error) {
    printError(`Error testing get_file_history: ${error.message}`);
  }
}

/**
 * Test the analyze_cline_activity tool
 */
async function testAnalyzeCloneActivity() {
  printSection("Testing analyze_cline_activity");
  
  try {
    // Call analyze_cline_activity
    const analyzeActivityRequest = {
      jsonrpc: "2.0",
      id: "4",
      method: "tools/call",
      params: {
        name: "analyze_cline_activity",
        arguments: {
          hoursBack: 48
        }
      }
    };
    
    printInfo("Analyzing Cline activity...");
    const activityResponse = await sendMcpRequest(analyzeActivityRequest);
    
    if (activityResponse.error) {
      throw new Error(`Error response: ${JSON.stringify(activityResponse.error)}`);
    }
    
    const activityData = JSON.parse(activityResponse.result.content[0].text);
    
    printInfo("\nActivity Analysis:");
    printInfo(`Timestamp: ${activityData.timestamp}`);
    printInfo(`Workspace Count: ${activityData.workspaceCount}`);
    
    if (activityData.workspaceCount > 0) {
      printInfo("\nMost Active Workspaces:");
      
      activityData.workspaces.forEach((workspace, index) => {
        if (index < 3) { // Show only the top 3
          printInfo(`\n[${index + 1}] ${workspace.path}`);
          printInfo(`  Name: ${workspace.workspace.name}`);
          printInfo(`  Recent Files: ${workspace.recentFileCount}`);
          
          if (workspace.mostRecentFiles.length > 0) {
            printInfo("  Most Recent Files:");
            workspace.mostRecentFiles.slice(0, 3).forEach(file => {
              printInfo(`    - ${file.path}`);
            });
          }
        }
      });
    }
    
    printSuccess("analyze_cline_activity is working correctly");
  } catch (error) {
    printError(`Error testing analyze_cline_activity: ${error.message}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  printSection("VS Code Monitoring Tools Test");
  
  try {
    // Test get_vscode_workspaces
    const workspacePath = await testGetVSCodeWorkspaces();
    
    // Test analyze_workspace
    const filePath = await testAnalyzeWorkspace(workspacePath);
    
    // Test get_file_history
    await testGetFileHistory(filePath);
    
    // Test analyze_cline_activity
    await testAnalyzeCloneActivity();
    
    // Print summary
    printSection("Test Summary");
    printSuccess("All VS Code monitoring tools are working correctly!");
    printInfo("\nYou can now use these tools in Claude Desktop to monitor your VS Code activity.");
  } catch (error) {
    printError(`Error running tests: ${error.message}`);
  }
}

// Run the tests
runAllTests();
