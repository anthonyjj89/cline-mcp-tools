/**
 * Test script for the External Advice feature
 * This script sends a test advice to the VS Code extension
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

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

// Function to send a test advice
async function sendTestAdvice() {
  try {
    // Get the tasks directory
    const tasksDir = getVSCodeTasksDirectory();
    
    // Create a mock task ID (timestamp)
    const taskId = `${Date.now()}`;
    
    // Create the mock task directory
    const taskDir = createMockTaskDirectory(tasksDir, taskId);
    
    // Create the external advice directory within the task directory
    const adviceDir = path.join(taskDir, 'external-advice');
    if (!fs.existsSync(adviceDir)) {
      fs.mkdirSync(adviceDir, { recursive: true });
    }
    
    // Create a test advice
    const advice = {
      id: `advice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: 'This is a test advice from the External Advice feature. It demonstrates how Claude can send recommendations directly to VS Code.',
      title: 'Test External Advice',
      type: 'info',
      priority: 'medium',
      timestamp: Date.now(),
      expiresAt: Date.now() + (60 * 60 * 1000), // Expires in 1 hour
      relatedFiles: ['src/mcp-server.ts'],
      read: false
    };
    
    // Write the advice to a file
    const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
    fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
    
    console.log('Test advice sent successfully!');
    console.log('Task ID:', taskId);
    console.log('Advice ID:', advice.id);
    console.log('Advice file path:', adviceFilePath);
    
    // Check if the file was created
    if (fs.existsSync(adviceFilePath)) {
      console.log('Advice file created successfully.');
      
      // Read the file to verify its contents
      const fileContent = fs.readFileSync(adviceFilePath, 'utf8');
      console.log('File content:', fileContent);
    } else {
      console.error('Failed to create advice file.');
    }
  } catch (error) {
    console.error('Error sending test advice:', error);
  }
}

// Run the test
sendTestAdvice();
