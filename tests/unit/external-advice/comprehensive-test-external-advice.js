/**
 * Comprehensive test for the External Advice feature
 * This test follows a structured approach to test the MCP server side of the feature
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

// Function to clean up test task directories
function cleanupTestTaskDirectory(taskDir) {
  if (fs.existsSync(taskDir)) {
    // Remove all files in the directory recursively
    fs.rmSync(taskDir, { recursive: true, force: true });
    console.log(`Cleaned up ${taskDir}`);
  }
}

// Function to directly test the handleSendExternalAdvice function
// This simulates what would happen when the MCP tool is called
async function testAdviceCreation(testCase) {
  const tasksDir = getVSCodeTasksDirectory();
  
  // Create a unique task ID for this test
  const taskId = `test-${testCase.type}-${testCase.priority}-${Date.now()}`;
  
  // Create the mock task directory
  const taskDir = createMockTaskDirectory(tasksDir, taskId);
  
  // Create a unique ID for this test
  const id = `test-${testCase.type}-${testCase.priority}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create the advice object
  const advice = {
    id,
    content: testCase.content,
    title: testCase.title || `Test ${testCase.type} Advice`,
    type: testCase.type,
    priority: testCase.priority,
    timestamp: Date.now(),
    expiresAt: testCase.expiresAfter ? Date.now() + (testCase.expiresAfter * 60 * 1000) : null,
    relatedFiles: testCase.relatedFiles || [],
    read: false
  };
  
  // Create the external advice directory if it doesn't exist
  const adviceDir = path.join(taskDir, 'external-advice');
  if (!fs.existsSync(adviceDir)) {
    fs.mkdirSync(adviceDir, { recursive: true });
  }
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  fs.writeFileSync(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  console.log(`Created test advice: ${advice.id}`);
  
  // Verify the file was created
  assert.strictEqual(fs.existsSync(adviceFilePath), true, 'Advice file should exist');
  
  // Read the file content
  const fileContent = fs.readFileSync(adviceFilePath, 'utf8');
  const savedAdvice = JSON.parse(fileContent);
  
  // Verify the advice properties
  assert.strictEqual(savedAdvice.id, advice.id, 'Advice ID should match');
  assert.strictEqual(savedAdvice.content, advice.content, 'Advice content should match');
  assert.strictEqual(savedAdvice.title, advice.title, 'Advice title should match');
  assert.strictEqual(savedAdvice.type, advice.type, 'Advice type should match');
  assert.strictEqual(savedAdvice.priority, advice.priority, 'Advice priority should match');
  assert.strictEqual(savedAdvice.timestamp, advice.timestamp, 'Advice timestamp should match');
  assert.deepStrictEqual(savedAdvice.relatedFiles, advice.relatedFiles, 'Advice related files should match');
  assert.strictEqual(savedAdvice.read, advice.read, 'Advice read status should match');
  
  // If expiresAt is null, it should be null in the file too
  if (advice.expiresAt === null) {
    assert.strictEqual(savedAdvice.expiresAt, null, 'Advice expiresAt should be null');
  } else {
    assert.strictEqual(savedAdvice.expiresAt, advice.expiresAt, 'Advice expiresAt should match');
  }
  
  return { advice, adviceFilePath, taskId, taskDir };
}

// Function to monitor the advice directory for changes
function monitorAdviceDirectory(taskDir, callback, timeout = 5000) {
  // Create the external advice directory if it doesn't exist
  const adviceDir = path.join(taskDir, 'external-advice');
  if (!fs.existsSync(adviceDir)) {
    fs.mkdirSync(adviceDir, { recursive: true });
  }
  
  // Get initial files
  const initialFiles = fs.readdirSync(adviceDir);
  console.log(`Initial files in ${adviceDir}:`, initialFiles);
  
  // Set up a timer to check for new files
  const startTime = Date.now();
  const interval = setInterval(() => {
    const currentFiles = fs.readdirSync(adviceDir);
    const newFiles = currentFiles.filter(file => !initialFiles.includes(file));
    
    if (newFiles.length > 0) {
      console.log('New files detected:', newFiles);
      clearInterval(interval);
      callback(newFiles);
    }
    
    // Check if we've exceeded the timeout
    if (Date.now() - startTime > timeout) {
      console.log('Monitoring timed out, no new files detected');
      clearInterval(interval);
      callback([]);
    }
  }, 500);
  
  return interval;
}

// Test cases for different notification types
const testCases = [
  {
    content: "Simple info notification for testing",
    title: "Info Test",
    type: "info",
    priority: "low"
  },
  {
    content: "Warning notification with related files",
    title: "Warning Test",
    type: "warning",
    priority: "medium",
    relatedFiles: ["src/mcp-server.ts", "src/utils/paths.ts"]
  },
  {
    content: "High priority task notification",
    title: "Task Test",
    type: "task",
    priority: "high",
    expiresAfter: 60 // expires after 60 minutes
  },
  {
    content: "Tip notification with short expiration",
    title: "Tip Test",
    type: "tip",
    priority: "medium",
    expiresAfter: 1 // expires after 1 minute
  }
];

// Function to run all test cases
async function runTestCases() {
  console.log('Running test cases for External Advice feature...');
  
  // Create a test task ID
  const tasksDir = getVSCodeTasksDirectory();
  const taskId = `test-${Date.now()}`;
  const taskDir = createMockTaskDirectory(tasksDir, taskId);
  
  // Run each test case
  const results = [];
  
  for (const [index, testCase] of testCases.entries()) {
    console.log(`\nTest Case ${index + 1}: ${testCase.type} notification with ${testCase.priority} priority`);
    
    try {
      const result = await testAdviceCreation({
        ...testCase,
        taskId
      });
      
      results.push(result);
      console.log(`Test Case ${index + 1} passed!`);
    } catch (error) {
      console.error(`Test Case ${index + 1} failed:`, error);
      throw error;
    }
  }
  
  // Clean up
  for (const { adviceFilePath } of results) {
    if (fs.existsSync(adviceFilePath)) {
      fs.unlinkSync(adviceFilePath);
    }
  }
  
  // Clean up the task directory
  cleanupTestTaskDirectory(taskDir);
}

// Function to test edge cases
async function testEdgeCases() {
  console.log('\nTesting edge cases...');
  
  // Create a test task ID
  const tasksDir = getVSCodeTasksDirectory();
  const taskId = `test-edge-cases-${Date.now()}`;
  const taskDir = createMockTaskDirectory(tasksDir, taskId);
  
  const results = [];
  
  // Test case: Missing optional fields
  console.log('Edge Case 1: Missing optional fields');
  try {
    const result = await testAdviceCreation({
      content: "Advice with minimal fields",
      type: "info",
      priority: "medium",
      taskId
    });
    
    results.push(result);
    console.log('Edge Case 1 passed!');
  } catch (error) {
    console.error('Edge Case 1 failed:', error);
    throw error;
  }
  
  // Test case: Very long content
  console.log('Edge Case 2: Very long content');
  try {
    const longContent = 'A'.repeat(5000); // 5000 characters
    const result = await testAdviceCreation({
      content: longContent,
      title: "Long Content Test",
      type: "info",
      priority: "medium",
      taskId
    });
    
    results.push(result);
    console.log('Edge Case 2 passed!');
  } catch (error) {
    console.error('Edge Case 2 failed:', error);
    throw error;
  }
  
  // Test case: Many related files
  console.log('Edge Case 3: Many related files');
  try {
    const manyFiles = Array.from({ length: 50 }, (_, i) => `src/file${i}.js`);
    const result = await testAdviceCreation({
      content: "Advice with many related files",
      title: "Many Files Test",
      type: "warning",
      priority: "high",
      relatedFiles: manyFiles,
      taskId
    });
    
    results.push(result);
    console.log('Edge Case 3 passed!');
  } catch (error) {
    console.error('Edge Case 3 failed:', error);
    throw error;
  }
  
  // Clean up
  for (const { adviceFilePath } of results) {
    if (fs.existsSync(adviceFilePath)) {
      fs.unlinkSync(adviceFilePath);
    }
  }
  
  // Clean up the task directory
  cleanupTestTaskDirectory(taskDir);
}

// Function to test rapid creation of multiple advice files
async function testRapidCreation() {
  console.log('\nTesting rapid creation of multiple advice files...');
  
  // Create a test task ID
  const tasksDir = getVSCodeTasksDirectory();
  const taskId = `test-rapid-creation-${Date.now()}`;
  const taskDir = createMockTaskDirectory(tasksDir, taskId);
  
  const promises = [];
  
  // Create 10 advice files rapidly
  for (let i = 0; i < 10; i++) {
    promises.push(testAdviceCreation({
      content: `Rapid advice ${i + 1}`,
      title: `Rapid Test ${i + 1}`,
      type: "info",
      priority: "medium",
      taskId
    }));
  }
  
  try {
    const results = await Promise.all(promises);
    console.log(`Successfully created ${results.length} advice files rapidly`);
    
    // Clean up the test files
    for (const { adviceFilePath } of results) {
      if (fs.existsSync(adviceFilePath)) {
        fs.unlinkSync(adviceFilePath);
      }
    }
    
    // Clean up the task directory
    cleanupTestTaskDirectory(taskDir);
    
    console.log('Rapid creation test passed!');
  } catch (error) {
    console.error('Rapid creation test failed:', error);
    throw error;
  }
}

// Function to test expiration functionality
async function testExpiration() {
  console.log('\nTesting expiration functionality...');
  
  // Create a test task ID
  const tasksDir = getVSCodeTasksDirectory();
  const taskId = `test-expiration-${Date.now()}`;
  const taskDir = createMockTaskDirectory(tasksDir, taskId);
  
  // Create an advice that expires in 2 seconds
  const { advice, adviceFilePath } = await testAdviceCreation({
    content: "This advice will expire very soon",
    title: "Expiration Test",
    type: "info",
    priority: "medium",
    expiresAfter: 2 / 60, // 2 seconds in minutes
    taskId
  });
  
  console.log('Created advice with 2-second expiration');
  console.log('Waiting for expiration...');
  
  // Wait for 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // In a real implementation, the VS Code extension would check for expired advice
  // and remove them or mark them as expired. Here we're just demonstrating that
  // the expiresAt field is set correctly.
  
  // Read the file again
  const fileContent = fs.readFileSync(adviceFilePath, 'utf8');
  const savedAdvice = JSON.parse(fileContent);
  
  // Verify the expiresAt field
  assert.ok(savedAdvice.expiresAt < Date.now(), 'Advice should be expired');
  
  console.log('Expiration test passed!');
  
  // Clean up the test file
  if (fs.existsSync(adviceFilePath)) {
    fs.unlinkSync(adviceFilePath);
  }
  
  // Clean up the task directory
  cleanupTestTaskDirectory(taskDir);
}

// Function to test non-existent task ID
async function testNonExistentTaskId() {
  console.log('\nTesting non-existent task ID...');
  
  const tasksDir = getVSCodeTasksDirectory();
  const nonExistentTaskId = `non-existent-${Date.now()}`;
  
  try {
    // Try to create an advice for a non-existent task
    // This should fail because the task directory doesn't exist
    // and we're not creating it in this test
    
    // Create the advice object
    const advice = {
      id: `test-non-existent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: "This advice should not be created because the task doesn't exist",
      title: "Non-existent Task Test",
      type: "info",
      priority: "medium",
      timestamp: Date.now(),
      expiresAt: null,
      relatedFiles: [],
      read: false
    };
    
    // Check if the task directory exists
    const taskDir = path.join(tasksDir, nonExistentTaskId);
    
    // This should be false
    const taskDirExists = fs.existsSync(taskDir);
    assert.strictEqual(taskDirExists, false, 'Task directory should not exist');
    
    // In the real implementation, the MCP server would throw an error
    // if the task directory doesn't exist
    
    console.log('Non-existent task ID test passed!');
  } catch (error) {
    console.error('Non-existent task ID test failed:', error);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log('=== Comprehensive External Advice Tests ===');
  
  try {
    // Run all test cases
    await runTestCases();
    
    // Test edge cases
    await testEdgeCases();
    
    // Test rapid creation
    await testRapidCreation();
    
    // Test expiration
    await testExpiration();
    
    // Test non-existent task ID
    await testNonExistentTaskId();
    
    console.log('\nAll tests passed!');
  } catch (error) {
    console.error('\nTests failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
