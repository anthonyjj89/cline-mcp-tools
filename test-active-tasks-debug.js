#!/usr/bin/env node
/**
 * MCP Active Tasks Diagnostic Script
 * 
 * This script performs comprehensive diagnostics on the active tasks file
 * to identify issues with file path resolution, JSON parsing, and task identification.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up logging with timestamps and categories
function log(category, message) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${category}] ${message}`);
}

// Log with different severity levels
const logInfo = (message) => log('INFO', message);
const logDebug = (message) => log('DEBUG', message);
const logWarning = (message) => log('WARNING', message);
const logError = (message) => log('ERROR', message);

// Get platform-specific paths
function getPlatformPaths() {
  const homedir = os.homedir();
  logInfo(`Detected platform: ${process.platform}`);
  logInfo(`Home directory: ${homedir}`);
  
  const basePath = (() => {
    switch (process.platform) {
      case 'win32':
        const windowsPath = path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        logInfo(`Windows path: ${windowsPath}`);
        return windowsPath;
      case 'darwin':
        const macPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        logInfo(`macOS path: ${macPath}`);
        return macPath;
      case 'linux':
        const linuxPath = path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        logInfo(`Linux path: ${linuxPath}`);
        return linuxPath;
      default:
        logWarning(`Unsupported platform: ${process.platform}, using fallback paths`);
        const fallbackPath = path.join(homedir, '.vscode', 'saoudrizwan.claude-dev');
        logInfo(`Fallback path: ${fallbackPath}`);
        return fallbackPath;
    }
  })();
  
  const paths = {
    activeTasksFile: path.join(basePath, 'active_tasks.json'),
    standardTasksDir: path.join(basePath, 'tasks'),
    crashReportsDir: path.join(basePath, 'crashReports')
  };
  
  logInfo(`Final paths: ${JSON.stringify(paths, null, 2)}`);
  return paths;
}

// Check if a file exists and is readable
function checkFileExists(filePath) {
  try {
    logDebug(`Checking if file exists: ${filePath}`);
    const stats = fs.statSync(filePath);
    logDebug(`File exists. Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
    return true;
  } catch (error) {
    logError(`File does not exist or is not accessible: ${filePath}`);
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Check directory contents
function checkDirectoryContents(dirPath) {
  try {
    logDebug(`Checking directory contents: ${dirPath}`);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      logDebug(`Directory exists. Contents (${files.length} items):`);
      files.forEach((file, index) => {
        try {
          const fullPath = path.join(dirPath, file);
          const stats = fs.statSync(fullPath);
          const isDir = stats.isDirectory() ? 'DIR' : 'FILE';
          const size = stats.isDirectory() ? '-' : `${stats.size} bytes`;
          logDebug(`  ${index + 1}. [${isDir}] ${file} (${size})`);
        } catch (error) {
          logError(`  ${index + 1}. Error getting stats for ${file}: ${error.message}`);
        }
      });
      return true;
    } else {
      logError(`Directory does not exist: ${dirPath}`);
      return false;
    }
  } catch (error) {
    logError(`Error checking directory: ${dirPath}`);
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Read and parse JSON file
function readJsonFile(filePath) {
  try {
    logDebug(`Reading JSON file: ${filePath}`);
    const data = fs.readFileSync(filePath, 'utf8');
    logDebug(`File read successfully. Content length: ${data.length} bytes`);
    
    // Log truncated content for debugging
    const truncated = data.length > 500 
      ? data.substring(0, 500) + '... [truncated]' 
      : data;
    logDebug(`File content (truncated): ${truncated}`);
    
    try {
      const parsed = JSON.parse(data);
      logDebug(`JSON parsed successfully`);
      return parsed;
    } catch (parseError) {
      logError(`Error parsing JSON: ${parseError.message}`);
      return null;
    }
  } catch (error) {
    logError(`Error reading file: ${error.message}`);
    return null;
  }
}

// Verify active tasks data structure
function verifyActiveTasksData(data) {
  if (!data) {
    logError(`No data to verify`);
    return false;
  }
  
  logDebug(`Verifying active tasks data structure`);
  
  // Check if data is an object
  if (typeof data !== 'object' || data === null) {
    logError(`Data is not an object: ${typeof data}`);
    return false;
  }
  
  // Check if activeTasks property exists and is an array
  if (!Array.isArray(data.activeTasks)) {
    logError(`activeTasks is not an array: ${typeof data.activeTasks}`);
    return false;
  }
  
  logInfo(`Active tasks count: ${data.activeTasks.length}`);
  
  // Check each active task
  data.activeTasks.forEach((task, index) => {
    logDebug(`Task ${index + 1}:`);
    logDebug(`  ID: ${task.id || 'missing'}`);
    logDebug(`  Label: ${task.label || 'missing'}`);
    logDebug(`  Last Activated: ${task.lastActivated || 'missing'}`);
    
    // Check required properties
    const hasId = typeof task.id === 'string' && task.id.length > 0;
    const hasLabel = typeof task.label === 'string' && task.label.length > 0;
    const hasLastActivated = typeof task.lastActivated === 'number';
    
    if (!hasId) logError(`  Task ${index + 1} is missing a valid ID`);
    if (!hasLabel) logError(`  Task ${index + 1} is missing a valid label`);
    if (!hasLastActivated) logError(`  Task ${index + 1} is missing a valid lastActivated timestamp`);
  });
  
  return true;
}

// Find active task by label
function findActiveTaskByLabel(data, label) {
  if (!data || !Array.isArray(data.activeTasks)) {
    logError(`Invalid data structure for finding task by label`);
    return null;
  }
  
  logDebug(`Looking for active task with label: ${label}`);
  
  // Check exact match (case-sensitive)
  const exactMatch = data.activeTasks.find(task => task.label === label);
  if (exactMatch) {
    logInfo(`Found task with exact label match: ${JSON.stringify(exactMatch, null, 2)}`);
    return exactMatch;
  }
  
  // Check case-insensitive match (for debugging)
  const caseInsensitiveMatch = data.activeTasks.find(task => 
    task.label && task.label.toUpperCase() === label.toUpperCase()
  );
  
  if (caseInsensitiveMatch) {
    logWarning(`Found task with case-insensitive match only: ${JSON.stringify(caseInsensitiveMatch, null, 2)}`);
    logWarning(`This suggests a case sensitivity issue in the label comparison`);
    return null;
  }
  
  logError(`No task found with label: ${label}`);
  return null;
}

// Simulate getActiveTaskWithCache function
function simulateGetActiveTask(taskIdOrLabel) {
  logInfo(`Simulating getActiveTaskWithCache with input: ${taskIdOrLabel}`);
  
  const config = getPlatformPaths();
  const activeTasksFile = config.activeTasksFile;
  
  // Check if file exists
  if (!checkFileExists(activeTasksFile)) {
    // Check parent directory
    const parentDir = path.dirname(activeTasksFile);
    checkDirectoryContents(parentDir);
    return null;
  }
  
  // Read and parse file
  const data = readJsonFile(activeTasksFile);
  if (!data) {
    return null;
  }
  
  // Verify data structure
  verifyActiveTasksData(data);
  
  // Handle special cases for ACTIVE_A and ACTIVE_B
  if (taskIdOrLabel === 'ACTIVE_A' || taskIdOrLabel === 'ACTIVE_B') {
    const label = taskIdOrLabel === 'ACTIVE_A' ? 'A' : 'B';
    return findActiveTaskByLabel(data, label);
  }
  
  // If taskIdOrLabel is a specific task ID
  if (taskIdOrLabel) {
    logDebug(`Looking for task with ID: ${taskIdOrLabel}`);
    const task = data.activeTasks.find(t => t.id === taskIdOrLabel);
    
    if (task) {
      logInfo(`Found task with ID ${taskIdOrLabel}: ${JSON.stringify(task, null, 2)}`);
      return task;
    }
    
    logError(`No task found with ID: ${taskIdOrLabel}`);
    return null;
  }
  
  // If no taskIdOrLabel provided, return the first active task (prioritize A then B)
  logDebug(`No taskIdOrLabel provided, looking for first active task (prioritizing A then B)`);
  
  if (data.activeTasks && data.activeTasks.length > 0) {
    // Prioritize A, then B
    const task = data.activeTasks.find(t => t.label === 'A') || 
                data.activeTasks.find(t => t.label === 'B') ||
                data.activeTasks[0];
    
    if (task) {
      logInfo(`Found default active task: ${JSON.stringify(task, null, 2)}`);
      return task;
    }
  }
  
  logError(`No active tasks found`);
  return null;
}

// Main function
async function main() {
  try {
    logInfo(`Starting MCP Active Tasks Diagnostic Script`);
    logInfo(`Node.js version: ${process.version}`);
    logInfo(`Current working directory: ${process.cwd()}`);
    
    // Test with no parameter (default active task)
    logInfo(`\n=== TEST 1: Get default active task ===`);
    const defaultTask = simulateGetActiveTask();
    logInfo(`Default active task result: ${defaultTask ? 'FOUND' : 'NOT FOUND'}`);
    
    // Test with ACTIVE_A
    logInfo(`\n=== TEST 2: Get active task A ===`);
    const taskA = simulateGetActiveTask('ACTIVE_A');
    logInfo(`Active task A result: ${taskA ? 'FOUND' : 'NOT FOUND'}`);
    
    // Test with ACTIVE_B
    logInfo(`\n=== TEST 3: Get active task B ===`);
    const taskB = simulateGetActiveTask('ACTIVE_B');
    logInfo(`Active task B result: ${taskB ? 'FOUND' : 'NOT FOUND'}`);
    
    // Test with specific task ID (if available from previous tests)
    if (taskA) {
      logInfo(`\n=== TEST 4: Get task by specific ID ===`);
      const specificTask = simulateGetActiveTask(taskA.id);
      logInfo(`Specific task result: ${specificTask ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    logInfo(`Diagnostic tests completed`);
  } catch (error) {
    logError(`Unhandled error in main function: ${error.message}`);
    logError(error.stack);
  }
}

// Run the main function
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
