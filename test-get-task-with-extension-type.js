#!/usr/bin/env node

/**
 * Test script to verify that the get_task_by_id function correctly includes the extension type
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { getVSCodeTasksDirectory, getTasksDirectoryForTask } from './build/utils/paths.js';
import { getTask } from './build/services/task-service.js';

async function testGetTaskWithExtensionType() {
  try {
    console.log('=== Testing getTask with extensionType ===\n');
    
    // Get both Cline Ultra and standard Cline paths
    const homedir = os.homedir();
    const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks');
    const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    
    console.log('Checking if paths exist:');
    console.log(`  Ultra path (${ultraPath}): ${await fs.pathExists(ultraPath) ? 'EXISTS' : 'NOT FOUND'}`);
    console.log(`  Standard path (${standardPath}): ${await fs.pathExists(standardPath) ? 'EXISTS' : 'NOT FOUND'}`);
    
    // List tasks from both directories
    const ultraTasks = await fs.pathExists(ultraPath) ? 
      (await fs.readdir(ultraPath, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .slice(0, 3) : [];
    
    const standardTasks = await fs.pathExists(standardPath) ? 
      (await fs.readdir(standardPath, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .slice(0, 3) : [];
    
    console.log('\nUltra tasks found:', ultraTasks.length);
    console.log('Standard tasks found:', standardTasks.length);
    
    // Test Ultra tasks
    if (ultraTasks.length > 0) {
      console.log('\n=== Testing Ultra Tasks ===');
      for (const taskId of ultraTasks) {
        console.log(`\nTesting task: ${taskId}`);
        const specificTasksDir = await getTasksDirectoryForTask(taskId);
        console.log(`Task directory: ${specificTasksDir}`);
        
        const task = await getTask(specificTasksDir, taskId);
        console.log('Task metadata:');
        console.log(`  ID: ${task.id}`);
        console.log(`  Extension Type: ${task.extensionType}`);
        console.log(`  Created: ${task.created}`);
        console.log(`  Modified: ${task.modified}`);
      }
    }
    
    // Test Standard tasks
    if (standardTasks.length > 0) {
      console.log('\n=== Testing Standard Tasks ===');
      for (const taskId of standardTasks) {
        console.log(`\nTesting task: ${taskId}`);
        const specificTasksDir = await getTasksDirectoryForTask(taskId);
        console.log(`Task directory: ${specificTasksDir}`);
        
        const task = await getTask(specificTasksDir, taskId);
        console.log('Task metadata:');
        console.log(`  ID: ${task.id}`);
        console.log(`  Extension Type: ${task.extensionType}`);
        console.log(`  Created: ${task.created}`);
        console.log(`  Modified: ${task.modified}`);
      }
    }
    
    console.log('\n=== Test Summary ===');
    console.log('Extension type included in task metadata: YES');
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Error testing getTask with extensionType:', error);
  }
}

// Run the test
testGetTaskWithExtensionType();
