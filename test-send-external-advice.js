/**
 * Test script for testing the handleSendExternalAdvice function
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

// Mock implementation of handleSendExternalAdvice
async function handleSendExternalAdvice(tasksDir, args) {
  console.log(`Called handleSendExternalAdvice with tasksDir: ${tasksDir}`);
  console.log(`Args:`, args);
  
  const { content, title, type, priority, expiresAfter, relatedFiles, task_id } = args;
  
  // Get the appropriate tasks directory for this specific task
  console.log(`Getting tasks directory for task ID: ${task_id}`);
  const specificTasksDir = getVSCodeTasksDirectory(task_id);
  console.log(`Got tasks directory: ${specificTasksDir}`);
  
  // Check if we're using the Ultra path
  const isUltra = specificTasksDir.includes('custom.claude-dev-ultra');
  console.log(`Is Ultra: ${isUltra}`);
  
  // Get the task directory
  const taskDir = path.join(specificTasksDir, task_id);
  console.log(`Task directory: ${taskDir}`);
  
  // Verify the task directory exists
  if (!fs.existsSync(taskDir)) {
    console.error(`Task directory does not exist: ${taskDir}`);
    throw new Error(`Task directory does not exist: ${taskDir}`);
  }
  
  // Create external advice object
  const advice = {
    id: `advice-test-${Date.now()}`,
    content,
    title: title || 'Advice from Claude',
    type: type || 'info',
    priority: priority || 'medium',
    timestamp: Date.now(),
    expiresAt: expiresAfter ? Date.now() + (expiresAfter * 60 * 1000) : null,
    relatedFiles: relatedFiles || [],
    read: false
  };
  
  // Create external advice directory within the specific task folder
  const adviceDir = path.join(taskDir, 'external-advice');
  console.log(`Creating advice directory: ${adviceDir}`);
  await fs.mkdirp(adviceDir);
  
  // Write advice to file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  console.log(`Writing advice to file: ${adviceFilePath}`);
  await fs.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  return {
    success: true,
    adviceId: advice.id,
    message: 'Advice sent successfully',
    warning: isUltra ? null : 'NOTE: This advice was sent to standard Cline, but the External Advice feature only works with Cline Ultra.'
  };
}

// Test the handleSendExternalAdvice function
async function testHandleSendExternalAdvice() {
  console.log('\n=== Testing handleSendExternalAdvice ===\n');
  
  // Check if both paths exist
  console.log('Checking if paths exist:');
  console.log(`  Ultra path (${ultraPath}): ${fs.existsSync(ultraPath) ? 'EXISTS' : 'does not exist'}`);
  console.log(`  Standard path (${standardPath}): ${fs.existsSync(standardPath) ? 'EXISTS' : 'does not exist'}`);
  
  // Check if the test task exists
  const ultraTaskDir = path.join(ultraPath, ultraOnlyTaskId);
  console.log(`  Ultra task (${ultraTaskDir}): ${fs.existsSync(ultraTaskDir) ? 'EXISTS' : 'does not exist'}`);
  
  // Test with Ultra-only task ID
  console.log('\nTest: Ultra-only task ID');
  try {
    const result = await handleSendExternalAdvice('dummy-tasks-dir', {
      content: 'Test advice for Ultra task',
      title: 'Test Advice',
      type: 'info',
      priority: 'medium',
      task_id: ultraOnlyTaskId
    });
    
    console.log('Result:', result);
    
    // Check if the advice file was created
    const adviceDir = path.join(ultraPath, ultraOnlyTaskId, 'external-advice');
    const adviceFiles = await fs.readdir(adviceDir);
    console.log(`Advice files: ${adviceFiles.length}`);
    
    // Print summary
    console.log('\n=== Summary ===');
    console.log(`Success: ${result.success}`);
    console.log(`Warning included: ${result.warning ? 'Yes' : 'No'}`);
    console.log(`Advice files created: ${adviceFiles.length > 0 ? 'Yes' : 'No'}`);
    
    // Check if the function is working correctly
    const isCorrect = result.success && !result.warning && adviceFiles.length > 0;
    console.log(`\nFunction working correctly: ${isCorrect ? 'YES' : 'NO'}`);
    if (!isCorrect) {
      console.log('ERROR: Function failed to send advice to Ultra task');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testHandleSendExternalAdvice()
  .then(() => console.log('\nTest completed'))
  .catch(error => console.error('Error:', error));
