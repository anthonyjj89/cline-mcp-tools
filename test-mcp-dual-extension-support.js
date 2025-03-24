/**
 * Test script for verifying dual extension support in the MCP server
 * Tests the ability to handle tasks from both Cline and Cline Ultra extensions
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

// Define paths for both extensions
const homedir = os.homedir();
const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks');
const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');

// Create test task IDs
const ultraTaskId = `ultra-test-${Date.now()}`;
const standardTaskId = `standard-test-${Date.now()}`;

// Create mock task directories and files
async function setupTestEnvironment() {
  console.log('Setting up test environment...');
  
  // Create Ultra task directory
  const ultraTaskDir = path.join(ultraPath, ultraTaskId);
  await fs.mkdirp(ultraTaskDir);
  await fs.writeFile(
    path.join(ultraTaskDir, 'api_conversation_history.json'),
    JSON.stringify([{ role: 'human', content: 'Test message for Ultra' }])
  );
  console.log(`Created Ultra test task: ${ultraTaskDir}`);
  
  // Create Standard task directory
  const standardTaskDir = path.join(standardPath, standardTaskId);
  await fs.mkdirp(standardTaskDir);
  await fs.writeFile(
    path.join(standardTaskDir, 'api_conversation_history.json'),
    JSON.stringify([{ role: 'human', content: 'Test message for Standard' }])
  );
  console.log(`Created Standard test task: ${standardTaskDir}`);
  
  return { ultraTaskDir, standardTaskDir };
}

// Clean up test directories
async function cleanupTestEnvironment(ultraTaskDir, standardTaskDir) {
  console.log('Cleaning up test environment...');
  
  if (await fs.pathExists(ultraTaskDir)) {
    await fs.remove(ultraTaskDir);
    console.log(`Removed Ultra test task: ${ultraTaskDir}`);
  }
  
  if (await fs.pathExists(standardTaskDir)) {
    await fs.remove(standardTaskDir);
    console.log(`Removed Standard test task: ${standardTaskDir}`);
  }
}

// Test sending external advice to both extensions
async function testSendExternalAdvice() {
  console.log('\n=== Testing Send External Advice ===');
  
  // Mock the MCP server's handleSendExternalAdvice function
  const mockSendExternalAdvice = async (taskId) => {
    // Get the appropriate tasks directory for this specific task
    const getVSCodeTasksDirectory = (taskId) => {
      // Check Ultra path first
      const ultraTaskPath = path.join(ultraPath, taskId);
      if (fs.existsSync(ultraTaskPath)) {
        return ultraPath;
      }
      
      // Check Standard path next
      const standardTaskPath = path.join(standardPath, taskId);
      if (fs.existsSync(standardTaskPath)) {
        return standardPath;
      }
      
      // Default to Ultra path if neither exists
      return ultraPath;
    };
    
    const specificTasksDir = getVSCodeTasksDirectory(taskId);
    const isUltra = specificTasksDir.includes('custom.claude-dev-ultra');
    const taskDir = path.join(specificTasksDir, taskId);
    
    // Create external advice directory
    const adviceDir = path.join(taskDir, 'external-advice');
    await fs.mkdirp(adviceDir);
    
    // Create advice object
    const advice = {
      id: `advice-test-${Date.now()}`,
      content: `Test advice for ${isUltra ? 'Ultra' : 'Standard'} task`,
      title: 'Test Advice',
      type: 'info',
      priority: 'medium',
      timestamp: Date.now(),
      expiresAt: null,
      relatedFiles: [],
      read: false
    };
    
    // Write advice to file
    const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
    await fs.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
    
    return {
      success: true,
      adviceId: advice.id,
      message: 'Advice sent successfully',
      warning: isUltra ? null : 'NOTE: This advice was sent to standard Cline, but the External Advice feature only works with Cline Ultra.'
    };
  };
  
  // Test with Ultra task
  console.log('Testing with Ultra task...');
  const ultraResult = await mockSendExternalAdvice(ultraTaskId);
  console.log('Ultra result:', ultraResult);
  console.log(`Warning included: ${ultraResult.warning ? 'Yes' : 'No'}`);
  
  // Verify advice file was created
  const ultraAdviceDir = path.join(ultraPath, ultraTaskId, 'external-advice');
  const ultraAdviceFiles = await fs.readdir(ultraAdviceDir);
  console.log(`Advice files created: ${ultraAdviceFiles.length > 0 ? 'Yes' : 'No'}`);
  
  // Test with Standard task
  console.log('\nTesting with Standard task...');
  const standardResult = await mockSendExternalAdvice(standardTaskId);
  console.log('Standard result:', standardResult);
  console.log(`Warning included: ${standardResult.warning ? 'Yes' : 'No'}`);
  
  // Verify advice file was created
  const standardAdviceDir = path.join(standardPath, standardTaskId, 'external-advice');
  const standardAdviceFiles = await fs.readdir(standardAdviceDir);
  console.log(`Advice files created: ${standardAdviceFiles.length > 0 ? 'Yes' : 'No'}`);
  
  return {
    ultraSuccess: ultraResult.success && !ultraResult.warning && ultraAdviceFiles.length > 0,
    standardSuccess: standardResult.success && standardResult.warning && standardAdviceFiles.length > 0
  };
}

// Test listing tasks from both extensions
async function testListRecentTasks() {
  console.log('\n=== Testing List Recent Tasks ===');
  
  // Mock the MCP server's handleListRecentTasks function
  const mockListRecentTasks = async () => {
    // List tasks from both directories
    const ultraTasks = await fs.pathExists(ultraPath) ? 
      (await fs.readdir(ultraPath))
        .filter(dir => fs.statSync(path.join(ultraPath, dir)).isDirectory())
        .map(dir => ({ id: dir, timestamp: parseInt(dir, 10) || 0 })) : 
      [];
    
    const standardTasks = await fs.pathExists(standardPath) ? 
      (await fs.readdir(standardPath))
        .filter(dir => fs.statSync(path.join(standardPath, dir)).isDirectory())
        .map(dir => ({ id: dir, timestamp: parseInt(dir, 10) || 0 })) : 
      [];
    
    // Merge and sort tasks by timestamp
    const allTasks = [...ultraTasks, ...standardTasks].sort((a, b) => b.timestamp - a.timestamp);
    
    return {
      task_count: allTasks.length,
      tasks: allTasks
    };
  };
  
  const result = await mockListRecentTasks();
  console.log(`Total tasks found: ${result.task_count}`);
  
  // Check if our test tasks are included
  const ultraTaskIncluded = result.tasks.some(task => task.id === ultraTaskId);
  const standardTaskIncluded = result.tasks.some(task => task.id === standardTaskId);
  
  console.log(`Ultra test task included: ${ultraTaskIncluded ? 'Yes' : 'No'}`);
  console.log(`Standard test task included: ${standardTaskIncluded ? 'Yes' : 'No'}`);
  
  return {
    success: ultraTaskIncluded && standardTaskIncluded
  };
}

// Run all tests
async function runTests() {
  try {
    // Setup test environment
    const { ultraTaskDir, standardTaskDir } = await setupTestEnvironment();
    
    // Run tests
    const adviceResults = await testSendExternalAdvice();
    const listResults = await testListRecentTasks();
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Send External Advice to Ultra: ${adviceResults.ultraSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`Send External Advice to Standard: ${adviceResults.standardSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`List Recent Tasks: ${listResults.success ? 'PASS' : 'FAIL'}`);
    
    // Clean up
    await cleanupTestEnvironment(ultraTaskDir, standardTaskDir);
    
    // Return overall success
    return adviceResults.ultraSuccess && adviceResults.standardSuccess && listResults.success;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

// Run the tests
runTests()
  .then(success => {
    console.log(`\nOverall test result: ${success ? 'PASS' : 'FAIL'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
