#!/usr/bin/env node

/**
 * Script to check if the Claude Task Reader MCP server is running with the fixed code
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Check if the MCP server is running
async function checkMcpServer() {
  try {
    console.log('Checking if the Claude Task Reader MCP server is running...');
    
    // Get the list of running processes
    const { stdout } = await execAsync('ps aux | grep "node.*Claude-Task-Reader/build/index.js" | grep -v grep');
    
    if (stdout.trim()) {
      console.log('Claude Task Reader MCP server is running.');
      console.log('Process info:');
      console.log(stdout.trim());
      return true;
    } else {
      console.log('Claude Task Reader MCP server is NOT running.');
      return false;
    }
  } catch (error) {
    console.log('Claude Task Reader MCP server is NOT running.');
    return false;
  }
}

// Check if the MCP server is using the fixed code
async function checkFixedCode() {
  try {
    console.log('\nChecking if the MCP server is using the fixed code...');
    
    // Read the task-service.js file
    const taskServicePath = path.join('/Users/ant/Claude-Task-Reader/build/services/task-service.js');
    const taskServiceContent = await fs.readFile(taskServicePath, 'utf8');
    
    // Check if the file contains the fix
    const hasLastActivityTimestamp = taskServiceContent.includes('lastActivityTimestamp');
    const sortsByLastActivity = taskServiceContent.includes('sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp)');
    
    if (hasLastActivityTimestamp && sortsByLastActivity) {
      console.log('The MCP server is using the fixed code.');
      console.log('The listTasks function has been modified to sort tasks by last activity timestamp.');
      return true;
    } else {
      console.log('The MCP server is NOT using the fixed code.');
      console.log('The listTasks function has NOT been modified to sort tasks by last activity timestamp.');
      return false;
    }
  } catch (error) {
    console.error('Error checking fixed code:', error);
    return false;
  }
}

// Main function
async function main() {
  const isRunning = await checkMcpServer();
  const isUsingFixedCode = await checkFixedCode();
  
  console.log('\nSummary:');
  console.log(`- Claude Task Reader MCP server is ${isRunning ? 'running' : 'NOT running'}.`);
  console.log(`- The MCP server is ${isUsingFixedCode ? 'using' : 'NOT using'} the fixed code.`);
  
  if (isRunning && isUsingFixedCode) {
    console.log('\nThe fix has been applied and the MCP server is running with the fixed code.');
    console.log('If Claude is still not using the fixed code, try restarting Claude Desktop:');
    console.log('./restart-claude-desktop-latest-task-fix.sh');
  } else if (isRunning && !isUsingFixedCode) {
    console.log('\nThe MCP server is running but is NOT using the fixed code.');
    console.log('Try restarting Claude Desktop to apply the fix:');
    console.log('./restart-claude-desktop-latest-task-fix.sh');
  } else if (!isRunning && isUsingFixedCode) {
    console.log('\nThe fix has been applied but the MCP server is NOT running.');
    console.log('Try restarting Claude Desktop to start the MCP server:');
    console.log('./restart-claude-desktop-latest-task-fix.sh');
  } else {
    console.log('\nThe fix has NOT been applied and the MCP server is NOT running.');
    console.log('Try applying the fix and then restarting Claude Desktop:');
    console.log('./simple-fix.sh');
    console.log('./restart-claude-desktop-latest-task-fix.sh');
  }
}

// Run the main function
main().catch(console.error);
