/**
 * Debug script for testing the task directory
 * Tests the file system to see if the task directory exists
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

// Print detailed information about the file system
async function printFileSystemInfo() {
  console.log('\n=== File System Information ===\n');
  
  // Check if both paths exist
  console.log('Checking if paths exist:');
  console.log(`  Ultra path (${ultraPath}): ${fs.existsSync(ultraPath) ? 'EXISTS' : 'does not exist'}`);
  console.log(`  Standard path (${standardPath}): ${fs.existsSync(standardPath) ? 'EXISTS' : 'does not exist'}`);
  
  // Check if the test task exists
  const ultraTaskDir = path.join(ultraPath, ultraOnlyTaskId);
  const standardTaskDir = path.join(standardPath, ultraOnlyTaskId);
  console.log(`  Ultra task (${ultraTaskDir}): ${fs.existsSync(ultraTaskDir) ? 'EXISTS' : 'does not exist'}`);
  console.log(`  Standard task (${standardTaskDir}): ${fs.existsSync(standardTaskDir) ? 'EXISTS' : 'does not exist'}`);
  
  // If the Ultra task exists, list its contents
  if (fs.existsSync(ultraTaskDir)) {
    console.log('\nUltra task directory contents:');
    const ultraTaskFiles = await fs.readdir(ultraTaskDir);
    ultraTaskFiles.forEach(file => {
      const filePath = path.join(ultraTaskDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${file} (${stats.isDirectory() ? 'directory' : 'file'}, ${stats.size} bytes)`);
    });
  }
  
  // If the Standard task exists, list its contents
  if (fs.existsSync(standardTaskDir)) {
    console.log('\nStandard task directory contents:');
    const standardTaskFiles = await fs.readdir(standardTaskDir);
    standardTaskFiles.forEach(file => {
      const filePath = path.join(standardTaskDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${file} (${stats.isDirectory() ? 'directory' : 'file'}, ${stats.size} bytes)`);
    });
  }
  
  // List all tasks in both directories
  console.log('\nAll tasks in Ultra directory:');
  if (fs.existsSync(ultraPath)) {
    const ultraTasks = await fs.readdir(ultraPath);
    console.log(`  Total: ${ultraTasks.length}`);
    console.log(`  First 5: ${ultraTasks.slice(0, 5).join(', ')}`);
  } else {
    console.log('  Ultra directory does not exist');
  }
  
  console.log('\nAll tasks in Standard directory:');
  if (fs.existsSync(standardPath)) {
    const standardTasks = await fs.readdir(standardPath);
    console.log(`  Total: ${standardTasks.length}`);
    console.log(`  First 5: ${standardTasks.slice(0, 5).join(', ')}`);
  } else {
    console.log('  Standard directory does not exist');
  }
  
  // Check file permissions
  console.log('\nFile permissions:');
  console.log(`  Ultra path: ${await getPermissions(ultraPath)}`);
  console.log(`  Standard path: ${await getPermissions(standardPath)}`);
  console.log(`  Ultra task: ${await getPermissions(ultraTaskDir)}`);
  console.log(`  Standard task: ${await getPermissions(standardTaskDir)}`);
  
  // Check current user and process
  console.log('\nCurrent user and process:');
  console.log(`  User: ${os.userInfo().username}`);
  console.log(`  User ID: ${os.userInfo().uid}`);
  console.log(`  Group ID: ${os.userInfo().gid}`);
  console.log(`  Home directory: ${os.homedir()}`);
  console.log(`  Current directory: ${process.cwd()}`);
  console.log(`  Node.js version: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
}

// Get file permissions
async function getPermissions(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return 'File does not exist';
    }
    
    const stats = fs.statSync(filePath);
    return `Mode: ${stats.mode.toString(8)}, UID: ${stats.uid}, GID: ${stats.gid}`;
  } catch (error) {
    return `Error getting permissions: ${error.message}`;
  }
}

// Run the test
printFileSystemInfo()
  .then(() => console.log('\nTest completed'))
  .catch(error => console.error('Error:', error));
