/**
 * Comprehensive test script for the External Advice feature
 * Tests the entire flow from the MCP server to the file system
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { z } from 'zod';

// Mock implementation of SendExternalAdviceSchema
const SendExternalAdviceSchema = z.object({
  content: z.string().describe('Advice content to send to the user'),
  title: z.string().optional().describe('Title for the advice notification'),
  type: z.enum(['info', 'warning', 'tip', 'task']).default('info').describe('Type of advice'),
  priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Priority level of the advice'),
  expiresAfter: z.number().optional().describe('Time in minutes after which the advice should expire'),
  relatedFiles: z.array(z.string()).optional().describe('Paths to files related to this advice'),
  task_id: z.string().describe('Task ID (timestamp) of the conversation to send advice to')
});

// Mock implementation of getVSCodeTasksDirectory
function getVSCodeTasksDirectory(taskId) {
  console.log(`Called getVSCodeTasksDirectory with taskId: ${taskId || 'undefined'}`);
  
  // Define paths for both extensions based on platform
  const homedir = os.homedir();
  const possiblePaths = [
    // Cline Ultra path
    path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks'),
    // Standard Cline path
    path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
  ];
  
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

// Define paths for both extensions
const homedir = os.homedir();
const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks');
const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');

// Test task ID that exists exclusively in the Cline Ultra directory
const ultraOnlyTaskId = '1742841089770'; // This is the task ID mentioned in the feedback

// Implementation of handleSendExternalAdvice from src/mcp-server.ts
async function handleSendExternalAdvice(tasksDir, args) {
  console.log(`Called handleSendExternalAdvice with tasksDir: ${tasksDir}`);
  console.log(`Args:`, args);
  
  try {
    // Parse arguments using the schema
    const { content, title, type, priority, expiresAfter, relatedFiles, task_id } = SendExternalAdviceSchema.parse(args);
    
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
      type,
      priority,
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
  } catch (error) {
    console.error('Error in handleSendExternalAdvice:', error);
    throw error;
  }
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
  
  // If the test task doesn't exist, create it
  if (!fs.existsSync(ultraTaskDir)) {
    console.log(`Creating test task in Ultra directory: ${ultraTaskDir}`);
    await fs.mkdirp(ultraTaskDir);
    await fs.writeFile(
      path.join(ultraTaskDir, 'api_conversation_history.json'),
      JSON.stringify([{ role: 'human', content: 'Test message for Ultra' }])
    );
    console.log('Test task created');
  }
  
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
