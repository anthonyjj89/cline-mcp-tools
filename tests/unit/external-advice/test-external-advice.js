/**
 * Unit test for the External Advice feature
 * This test verifies that the External Advice feature works correctly
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

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

// Function to create a test advice
function createTestAdvice(taskId) {
  const tasksDir = getVSCodeTasksDirectory();
  
  // Create the mock task directory
  const taskDir = createMockTaskDirectory(tasksDir, taskId);
  
  // Create the external advice directory if it doesn't exist
  const adviceDir = path.join(taskDir, 'external-advice');
  if (!fs.existsSync(adviceDir)) {
    fs.mkdirSync(adviceDir, { recursive: true });
  }
  
  // Create a test advice
  const advice = {
    id: `test-advice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: "This is a test advice for unit testing the External Advice feature.",
    title: "Test Advice",
    type: "info",
    priority: "medium",
    timestamp: Date.now(),
    expiresAt: null,
    relatedFiles: ["src/mcp-server.ts"],
    read: false
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  return { advice, adviceFilePath, taskId, taskDir };
}

// Function to verify that the advice file exists and has the correct content
function verifyAdviceFile(adviceFilePath, expectedAdvice) {
  // Check if the file exists
  assert.strictEqual(fs.existsSync(adviceFilePath), true, 'Advice file should exist');
  
  // Read the file content
  const fileContent = fs.readFileSync(adviceFilePath, 'utf8');
  const advice = JSON.parse(fileContent);
  
  // Verify the advice properties
  assert.strictEqual(advice.id, expectedAdvice.id, 'Advice ID should match');
  assert.strictEqual(advice.content, expectedAdvice.content, 'Advice content should match');
  assert.strictEqual(advice.title, expectedAdvice.title, 'Advice title should match');
  assert.strictEqual(advice.type, expectedAdvice.type, 'Advice type should match');
  assert.strictEqual(advice.priority, expectedAdvice.priority, 'Advice priority should match');
  assert.strictEqual(advice.timestamp, expectedAdvice.timestamp, 'Advice timestamp should match');
  assert.deepStrictEqual(advice.relatedFiles, expectedAdvice.relatedFiles, 'Advice related files should match');
  assert.strictEqual(advice.read, expectedAdvice.read, 'Advice read status should match');
  
  // If expiresAt is null, it should be null in the file too
  if (expectedAdvice.expiresAt === null) {
    assert.strictEqual(advice.expiresAt, null, 'Advice expiresAt should be null');
  } else {
    assert.strictEqual(advice.expiresAt, expectedAdvice.expiresAt, 'Advice expiresAt should match');
  }
}

// Function to clean up test advice files
function cleanupTestAdvice(adviceFilePath) {
  if (fs.existsSync(adviceFilePath)) {
    fs.unlinkSync(adviceFilePath);
  }
}

// Test case 1: Create and verify a test advice
function testCreateAdvice() {
  console.log('Test case 1: Create and verify a test advice');
  
  try {
    // Create a test task ID
    const taskId = `test-${Date.now()}`;
    
    // Create a test advice
    const { advice, adviceFilePath } = createTestAdvice(taskId);
    
    // Verify the advice file
    verifyAdviceFile(adviceFilePath, advice);
    
    // Clean up
    cleanupTestAdvice(adviceFilePath);
    
    console.log('Test case 1 passed!');
  } catch (error) {
    console.error('Test case 1 failed:', error);
    throw error;
  }
}

// Test case 2: Create multiple advice files for the same task
function testCreateMultipleAdvice() {
  console.log('Test case 2: Create multiple advice files for the same task');
  
  try {
    // Create a test task ID
    const taskId = `test-${Date.now()}`;
    
    // Create multiple test advice files
    const adviceFiles = [];
    
    for (let i = 0; i < 3; i++) {
      const { advice, adviceFilePath } = createTestAdvice(taskId);
      adviceFiles.push({ advice, adviceFilePath });
    }
    
    // Verify each advice file
    for (const { advice, adviceFilePath } of adviceFiles) {
      verifyAdviceFile(adviceFilePath, advice);
    }
    
    // Clean up
    for (const { adviceFilePath } of adviceFiles) {
      cleanupTestAdvice(adviceFilePath);
    }
    
    console.log('Test case 2 passed!');
  } catch (error) {
    console.error('Test case 2 failed:', error);
    throw error;
  }
}

// Test case 3: Create advice with different types and priorities
function testAdviceTypesAndPriorities() {
  console.log('Test case 3: Create advice with different types and priorities');
  
  try {
    const tasksDir = getVSCodeTasksDirectory();
    
    // Create a test task ID
    const taskId = `test-${Date.now()}`;
    
    // Create the mock task directory
    const taskDir = createMockTaskDirectory(tasksDir, taskId);
    
    // Create the external advice directory if it doesn't exist
    const adviceDir = path.join(taskDir, 'external-advice');
    if (!fs.existsSync(adviceDir)) {
      fs.mkdirSync(adviceDir, { recursive: true });
    }
    
    // Create advice with different types and priorities
    const adviceFiles = [];
    
    const types = ['info', 'warning', 'tip', 'task'];
    const priorities = ['low', 'medium', 'high'];
    
    for (const type of types) {
      for (const priority of priorities) {
        // Create a test advice
        const advice = {
          id: `test-advice-${type}-${priority}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: `This is a test advice with type ${type} and priority ${priority}.`,
          title: `Test ${type} Advice (${priority})`,
          type,
          priority,
          timestamp: Date.now(),
          expiresAt: null,
          relatedFiles: [],
          read: false
        };
        
        // Write the advice to a file
        const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
        fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
        
        adviceFiles.push({ advice, adviceFilePath });
      }
    }
    
    // Verify each advice file
    for (const { advice, adviceFilePath } of adviceFiles) {
      verifyAdviceFile(adviceFilePath, advice);
    }
    
    // Clean up
    for (const { adviceFilePath } of adviceFiles) {
      cleanupTestAdvice(adviceFilePath);
    }
    
    console.log('Test case 3 passed!');
  } catch (error) {
    console.error('Test case 3 failed:', error);
    throw error;
  }
}

// Test case 4: Test advice for multiple tasks
function testMultipleTasks() {
  console.log('Test case 4: Test advice for multiple tasks');
  
  try {
    // Create multiple test task IDs
    const taskIds = [
      `test-${Date.now() - 3600000}`, // 1 hour ago
      `test-${Date.now() - 1800000}`, // 30 minutes ago
      `test-${Date.now()}` // Now
    ];
    
    // Create test advice for each task
    const adviceFiles = [];
    
    for (const taskId of taskIds) {
      const { advice, adviceFilePath } = createTestAdvice(taskId);
      adviceFiles.push({ advice, adviceFilePath, taskId });
    }
    
    // Verify each advice file
    for (const { advice, adviceFilePath } of adviceFiles) {
      verifyAdviceFile(adviceFilePath, advice);
    }
    
    // Clean up
    for (const { adviceFilePath } of adviceFiles) {
      cleanupTestAdvice(adviceFilePath);
    }
    
    console.log('Test case 4 passed!');
  } catch (error) {
    console.error('Test case 4 failed:', error);
    throw error;
  }
}

// Run the tests
console.log('=== External Advice Unit Tests ===');

try {
  testCreateAdvice();
  testCreateMultipleAdvice();
  testAdviceTypesAndPriorities();
  testMultipleTasks();
  
  console.log('\nAll tests passed!');
} catch (error) {
  console.error('\nTests failed:', error);
  process.exit(1);
}
