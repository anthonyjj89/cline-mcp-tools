/**
 * Debug script for testing the getVSCodeTasksDirectory function
 * Tests the function with a specific task ID that exists exclusively in the Cline Ultra directory
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Define paths for both extensions
const homedir = os.homedir();
const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks');
const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');

// Test task ID that exists exclusively in the Cline Ultra directory
const ultraOnlyTaskId = '1742841089770'; // This is the task ID mentioned in the feedback

// Implementation of getVSCodeTasksDirectory with added logging
function getVSCodeTasksDirectory(taskId) {
  console.log(`Called getVSCodeTasksDirectory with taskId: ${taskId || 'undefined'}`);
  
  // Define paths for both extensions based on platform
  const getPaths = () => {
    switch (process.platform) {
      case 'win32':
        return [
          // Cline Ultra path
          path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks'),
          // Standard Cline path
          path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
        ];
      case 'darwin':
        return [
          // Cline Ultra path
          path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks'),
          // Standard Cline path
          path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
        ];
      case 'linux':
        return [
          // Cline Ultra path
          path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks'),
          // Standard Cline path
          path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
        ];
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  };
  
  const possiblePaths = getPaths();
  console.log('Possible paths:');
  possiblePaths.forEach((p, i) => console.log(`  ${i}: ${p}`));
  
  // If taskId is provided, check if it exists in either path
  if (taskId) {
    console.log(`Checking for task ${taskId} in possible paths...`);
    for (const basePath of possiblePaths) {
      const taskPath = path.join(basePath, taskId);
      const exists = fs.existsSync(taskPath);
      console.log(`  Checking ${taskPath}: ${exists ? 'EXISTS' : 'does not exist'}`);
      if (exists) {
        console.log(`  Returning path: ${basePath}`);
        return basePath;
      }
    }
    console.log('  Task not found in any path');
  }
  
  // Return the first path that exists
  console.log('Checking which path exists...');
  for (const basePath of possiblePaths) {
    const exists = fs.existsSync(basePath);
    console.log(`  Checking ${basePath}: ${exists ? 'EXISTS' : 'does not exist'}`);
    if (exists) {
      console.log(`  Returning first existing path: ${basePath}`);
      return basePath;
    }
  }
  
  // Default to the Ultra path if neither exists
  console.log(`  No path exists, defaulting to Ultra path: ${possiblePaths[0]}`);
  return possiblePaths[0];
}

// Create a test task in the Cline Ultra directory if it doesn't exist
async function createTestTaskIfNeeded() {
  const ultraTaskDir = path.join(ultraPath, ultraOnlyTaskId);
  
  if (!fs.existsSync(ultraTaskDir)) {
    console.log(`Creating test task in Ultra directory: ${ultraTaskDir}`);
    await fs.mkdirp(ultraTaskDir);
    await fs.writeFile(
      path.join(ultraTaskDir, 'api_conversation_history.json'),
      JSON.stringify([{ role: 'human', content: 'Test message for Ultra' }])
    );
    console.log('Test task created');
    return true;
  } else {
    console.log(`Test task already exists in Ultra directory: ${ultraTaskDir}`);
    return false;
  }
}

// Test the getVSCodeTasksDirectory function
async function testGetVSCodeTasksDirectory() {
  console.log('\n=== Testing getVSCodeTasksDirectory ===\n');
  
  // Check if both paths exist
  console.log('Checking if paths exist:');
  console.log(`  Ultra path (${ultraPath}): ${fs.existsSync(ultraPath) ? 'EXISTS' : 'does not exist'}`);
  console.log(`  Standard path (${standardPath}): ${fs.existsSync(standardPath) ? 'EXISTS' : 'does not exist'}`);
  
  // Create test task if needed
  const created = await createTestTaskIfNeeded();
  
  // Test with no task ID
  console.log('\nTest 1: No task ID');
  const noTaskIdResult = getVSCodeTasksDirectory();
  console.log(`Result: ${noTaskIdResult}`);
  
  // Test with Ultra-only task ID
  console.log('\nTest 2: Ultra-only task ID');
  const ultraOnlyResult = getVSCodeTasksDirectory(ultraOnlyTaskId);
  console.log(`Result: ${ultraOnlyResult}`);
  
  // Test with non-existent task ID
  console.log('\nTest 3: Non-existent task ID');
  const nonExistentResult = getVSCodeTasksDirectory('non-existent-task');
  console.log(`Result: ${nonExistentResult}`);
  
  // Clean up if we created the test task
  if (created) {
    console.log('\nCleaning up test task...');
    await fs.remove(path.join(ultraPath, ultraOnlyTaskId));
    console.log('Test task removed');
  }
  
  // Print summary
  console.log('\n=== Summary ===');
  console.log(`No task ID: ${noTaskIdResult}`);
  console.log(`Ultra-only task ID: ${ultraOnlyResult}`);
  console.log(`Non-existent task ID: ${nonExistentResult}`);
  
  // Check if the function is working correctly
  const ultraPathCorrect = ultraOnlyResult.includes('custom.claude-dev-ultra');
  console.log(`\nFunction working correctly: ${ultraPathCorrect ? 'YES' : 'NO'}`);
  if (!ultraPathCorrect) {
    console.log('ERROR: Function returned Standard path for Ultra-only task ID');
  }
}

// Run the test
testGetVSCodeTasksDirectory()
  .then(() => console.log('\nTest completed'))
  .catch(error => console.error('Error:', error));
