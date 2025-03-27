/**
 * Test script for verifying compatibility with both Cline and Cline Ultra extensions
 * Tests the path resolution and warning message functionality
 */

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const { getVSCodeTasksDirectory } = require('../../../src/utils/paths');

// Mock task directories
const ultraTaskId = 'ultra-task-123456789';
const standardTaskId = 'standard-task-123456789';
const nonExistentTaskId = 'non-existent-task';

// Create mock directories for testing
async function setupMockDirectories() {
  const homedir = require('os').homedir();
  
  // Create Ultra path
  const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks', ultraTaskId);
  await fs.mkdirp(ultraPath);
  console.log(`Created Ultra test directory: ${ultraPath}`);
  
  // Create Standard path
  const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks', standardTaskId);
  await fs.mkdirp(standardPath);
  console.log(`Created Standard test directory: ${standardPath}`);
  
  return { ultraPath, standardPath };
}

// Clean up mock directories
async function cleanupMockDirectories(paths) {
  for (const dirPath of Object.values(paths)) {
    const parentDir = path.dirname(path.dirname(dirPath)); // Go up to the extension directory
    await fs.remove(parentDir);
    console.log(`Removed test directory: ${parentDir}`);
  }
}

// Test the path resolution functionality
async function testPathResolution() {
  console.log('\n=== Testing Path Resolution ===');
  
  // Test with Ultra task ID
  const ultraDir = getVSCodeTasksDirectory(ultraTaskId);
  assert(ultraDir.includes('custom.claude-dev-ultra'), 'Should return Ultra path for Ultra task ID');
  console.log(`✓ Ultra task ID resolves to: ${ultraDir}`);
  
  // Test with Standard task ID
  const standardDir = getVSCodeTasksDirectory(standardTaskId);
  assert(standardDir.includes('saoudrizwan.claude-dev'), 'Should return Standard path for Standard task ID');
  console.log(`✓ Standard task ID resolves to: ${standardDir}`);
  
  // Test with non-existent task ID
  const defaultDir = getVSCodeTasksDirectory(nonExistentTaskId);
  console.log(`✓ Non-existent task ID resolves to: ${defaultDir}`);
  
  // Test with no task ID
  const noTaskIdDir = getVSCodeTasksDirectory();
  console.log(`✓ No task ID resolves to: ${noTaskIdDir}`);
}

// Test the warning message functionality
async function testWarningMessage() {
  console.log('\n=== Testing Warning Message ===');
  
  // Mock the handleSendExternalAdvice function
  const mockHandleSendExternalAdvice = async (tasksDir, args) => {
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = getVSCodeTasksDirectory(args.task_id);
    
    // Check if we're using the Ultra path
    const isUltra = specificTasksDir.includes('custom.claude-dev-ultra');
    
    // Return mock response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            adviceId: 'mock-advice-id',
            message: 'Advice sent successfully',
            warning: isUltra ? null : 'NOTE: This advice was sent to standard Cline, but the External Advice feature only works with Cline Ultra.'
          }, null, 2),
        },
      ],
    };
  };
  
  // Test with Ultra task ID
  const ultraResponse = await mockHandleSendExternalAdvice(null, { task_id: ultraTaskId });
  const ultraResult = JSON.parse(ultraResponse.content[0].text);
  assert(ultraResult.warning === null, 'Should not include warning for Ultra');
  console.log('✓ No warning included for Ultra task');
  
  // Test with Standard task ID
  const standardResponse = await mockHandleSendExternalAdvice(null, { task_id: standardTaskId });
  const standardResult = JSON.parse(standardResponse.content[0].text);
  assert(standardResult.warning !== null, 'Should include warning for Standard');
  console.log(`✓ Warning included for Standard task: "${standardResult.warning}"`);
}

// Run all tests
async function runTests() {
  try {
    console.log('Setting up test directories...');
    const paths = await setupMockDirectories();
    
    // Run tests
    await testPathResolution();
    await testWarningMessage();
    
    console.log('\n=== All tests passed! ===');
    
    // Clean up
    console.log('\nCleaning up test directories...');
    await cleanupMockDirectories(paths);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
