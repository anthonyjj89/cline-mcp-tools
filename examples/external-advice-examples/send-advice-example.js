/**
 * Example demonstrating how to use the External Advice feature
 * This example shows how Claude can send recommendations directly to VS Code
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get the VS Code tasks directory based on the current OS
function getVSCodeTasksDirectory() {
  const homedir = os.homedir();
  
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    case 'darwin':
      return path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    case 'linux':
      return path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

// Function to create a mock task directory if it doesn't exist
function createMockTaskDirectory(tasksDir, taskId) {
  const taskDir = path.join(tasksDir, taskId);
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
    
    // Create mock conversation files to simulate a real task
    const apiFilePath = path.join(taskDir, 'api_conversation_history.json');
    const uiFilePath = path.join(taskDir, 'ui_messages.json');
    
    fs.writeFileSync(apiFilePath, JSON.stringify({ messages: [] }, null, 2), 'utf8');
    fs.writeFileSync(uiFilePath, JSON.stringify({ messages: [] }, null, 2), 'utf8');
    
    console.log(`Created mock task directory: ${taskDir}`);
  }
  
  return taskDir;
}

// Function to get the most recent task directory
function getMostRecentTaskDirectory(tasksDir) {
  const taskDirs = fs.readdirSync(tasksDir)
    .filter(dir => {
      const fullPath = path.join(tasksDir, dir);
      return fs.statSync(fullPath).isDirectory() && /^\d+$/.test(dir); // Only include timestamp directories
    })
    .sort((a, b) => parseInt(b) - parseInt(a)); // Sort by timestamp (newest first)
  
  if (taskDirs.length === 0) {
    // If no task directories exist, create a new one
    const newTaskId = `${Date.now()}`;
    createMockTaskDirectory(tasksDir, newTaskId);
    return newTaskId;
  }
  
  return taskDirs[0]; // Return the most recent task ID
}

/**
 * Example 1: Send a simple info advice with a question
 * 
 * This example demonstrates sending a simple question that will be inserted
 * into the chat when the user clicks "Read" on the notification.
 */
function sendSimpleQuestionAdvice() {
  const tasksDir = getVSCodeTasksDirectory();
  
  // Get the most recent task ID
  const taskId = getMostRecentTaskDirectory(tasksDir);
  const taskDir = path.join(tasksDir, taskId);
  
  // Create the external advice directory if it doesn't exist
  const adviceDir = path.join(taskDir, 'external-advice');
  if (!fs.existsSync(adviceDir)) {
    fs.mkdirSync(adviceDir, { recursive: true });
  }
  
  // Create Dismissed subdirectory for the folder-based approach
  const dismissedDir = path.join(adviceDir, 'Dismissed');
  if (!fs.existsSync(dismissedDir)) {
    fs.mkdirSync(dismissedDir, { recursive: true });
  }
  
  // Create a simple advice with a question
  const advice = {
    id: `advice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: "What are the best practices for error handling in asynchronous JavaScript?",
    title: "JavaScript Best Practices",
    type: "info",
    priority: "medium",
    timestamp: Date.now(),
    expiresAt: null, // Never expires
    relatedFiles: [],
    read: false
    // 'dismissed' field removed - now using folder-based approach instead
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  console.log('Simple question advice sent successfully!');
  console.log('Task ID:', taskId);
  console.log('Advice ID:', advice.id);
  console.log('Advice file path:', adviceFilePath);
}

/**
 * Example 2: Send a warning advice about a potential issue
 * 
 * This example demonstrates sending a warning with a question about
 * a potential issue in the code.
 */
function sendWarningAdvice() {
  const tasksDir = getVSCodeTasksDirectory();
  
  // Get the most recent task ID
  const taskId = getMostRecentTaskDirectory(tasksDir);
  const taskDir = path.join(tasksDir, taskId);
  
  // Create the external advice directory if it doesn't exist
  const adviceDir = path.join(taskDir, 'external-advice');
  if (!fs.existsSync(adviceDir)) {
    fs.mkdirSync(adviceDir, { recursive: true });
  }
  
  // Create a warning advice
  const advice = {
    id: `advice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: "I noticed I'm using a deprecated API in my code. What's the recommended alternative to fs.exists() and what are the benefits of switching?",
    title: "Deprecated API Usage",
    type: "warning",
    priority: "high",
    timestamp: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    relatedFiles: ["src/utils/api-client.js", "src/services/data-service.js"],
    read: false
    // 'dismissed' field removed - now using folder-based approach instead
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  console.log('Warning advice sent successfully!');
  console.log('Task ID:', taskId);
  console.log('Advice ID:', advice.id);
  console.log('Advice file path:', adviceFilePath);
}

/**
 * Example 3: Send a tip advice with a specific request
 * 
 * This example demonstrates sending a tip with a specific request
 * for code improvement.
 */
function sendTipAdvice() {
  const tasksDir = getVSCodeTasksDirectory();
  
  // Get the most recent task ID
  const taskId = getMostRecentTaskDirectory(tasksDir);
  const taskDir = path.join(tasksDir, taskId);
  
  // Create the external advice directory if it doesn't exist
  const adviceDir = path.join(taskDir, 'external-advice');
  if (!fs.existsSync(adviceDir)) {
    fs.mkdirSync(adviceDir, { recursive: true });
  }
  
  // Create a tip advice
  const advice = {
    id: `advice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: "Can you help me optimize this function for better performance? I think it might be causing slowdowns in my application.",
    title: "Performance Tip",
    type: "tip",
    priority: "low",
    timestamp: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // Expires in 24 hours
    relatedFiles: ["src/utils/calculations.js"],
    read: false
    // 'dismissed' field removed - now using folder-based approach instead
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  console.log('Tip advice sent successfully!');
  console.log('Task ID:', taskId);
  console.log('Advice ID:', advice.id);
  console.log('Advice file path:', adviceFilePath);
}

/**
 * Example 4: Send a task advice with a specific task request
 * 
 * This example demonstrates sending a task advice with a specific
 * request for help with a task.
 */
function sendTaskAdvice() {
  const tasksDir = getVSCodeTasksDirectory();
  
  // Get the most recent task ID
  const taskId = getMostRecentTaskDirectory(tasksDir);
  const taskDir = path.join(tasksDir, taskId);
  
  // Create the external advice directory if it doesn't exist
  const adviceDir = path.join(taskDir, 'external-advice');
  if (!fs.existsSync(adviceDir)) {
    fs.mkdirSync(adviceDir, { recursive: true });
  }
  
  // Create a task advice
  const advice = {
    id: `advice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: "Could you help me write unit tests for my authentication component? I'm not sure where to start or what test cases to include.",
    title: "Add Unit Tests",
    type: "task",
    priority: "medium",
    timestamp: Date.now(),
    expiresAt: null, // Never expires
    relatedFiles: ["src/components/auth.js", "src/utils/validation.js"],
    read: false
    // 'dismissed' field removed - now using folder-based approach instead
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  console.log('Task advice sent successfully!');
  console.log('Task ID:', taskId);
  console.log('Advice ID:', advice.id);
  console.log('Advice file path:', adviceFilePath);
}

/**
 * Example 5: Send advice to a specific task with a code-related question
 * 
 * This example demonstrates sending advice to a specific task with
 * a code-related question.
 */
function sendAdviceToSpecificTask() {
  const tasksDir = getVSCodeTasksDirectory();
  
  // Create a specific task ID
  const taskId = `${Date.now() - 86400000}`; // Yesterday's timestamp
  
  // Create the mock task directory
  const taskDir = createMockTaskDirectory(tasksDir, taskId);
  
  // Create the external advice directory if it doesn't exist
  const adviceDir = path.join(taskDir, 'external-advice');
  if (!fs.existsSync(adviceDir)) {
    fs.mkdirSync(adviceDir, { recursive: true });
  }
  
  // Create an advice for a specific task
  const advice = {
    id: `advice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: "What's the difference between Promise.all() and Promise.allSettled() and when should I use each one?",
    title: "JavaScript Promises",
    type: "info",
    priority: "medium",
    timestamp: Date.now(),
    expiresAt: null,
    relatedFiles: [],
    read: false
    // 'dismissed' field removed - now using folder-based approach instead
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  console.log('Specific task advice sent successfully!');
  console.log('Task ID:', taskId);
  console.log('Advice ID:', advice.id);
  console.log('Advice file path:', adviceFilePath);
}

// Run the examples
console.log('=== External Advice Examples ===');
console.log('\nExample 1: Simple Question Advice');
sendSimpleQuestionAdvice();

console.log('\nExample 2: Warning Advice');
sendWarningAdvice();

console.log('\nExample 3: Tip Advice');
sendTipAdvice();

console.log('\nExample 4: Task Advice');
sendTaskAdvice();

console.log('\nExample 5: Advice to Specific Task');
sendAdviceToSpecificTask();

console.log('\nAll examples completed successfully!');
console.log('\nNote: When the user clicks "Read" on any of these notifications, the content will be inserted into the chat as a user message.');
