#!/usr/bin/env node

/**
 * Direct implementation of the get_active_task functionality
 * 
 * This script implements the get_active_task functionality directly,
 * without using the MCP server.
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Function to get active tasks
async function getActiveTasks(label) {
  try {
    // Look for active_tasks.json file in both standard and Ultra paths
    const homedir = os.homedir();
    const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
    const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
    
    // Try ultra path first, then standard path
    let activeTasksData = null;
    
    if (await fs.pathExists(ultraPath)) {
      try {
        const content = await fs.readFile(ultraPath, 'utf8');
        activeTasksData = JSON.parse(content);
        console.log(`Found active tasks file at ${ultraPath}`);
      } catch (error) {
        console.error('Error reading ultra active tasks file:', error);
      }
    }
    
    if (!activeTasksData && await fs.pathExists(standardPath)) {
      try {
        const content = await fs.readFile(standardPath, 'utf8');
        activeTasksData = JSON.parse(content);
        console.log(`Found active tasks file at ${standardPath}`);
      } catch (error) {
        console.error('Error reading standard active tasks file:', error);
      }
    }
    
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      // Filter by label if specified
      let filteredTasks = activeTasksData.activeTasks;
      if (label) {
        filteredTasks = activeTasksData.activeTasks.filter(task => task.label === label);
      }
      
      if (filteredTasks.length > 0) {
        // Sort by lastActivated (most recent first)
        filteredTasks.sort((a, b) => b.lastActivated - a.lastActivated);
        
        return {
          active_tasks: filteredTasks.map(task => ({
            id: task.id,
            active_label: task.label,
            last_activated: new Date(task.lastActivated).toISOString()
          })),
          count: filteredTasks.length,
          filtered_by_label: label ? label : null
        };
      }
    }
    
    // If no active tasks are found, return an empty list
    return {
      active_tasks: [],
      count: 0,
      message: "No conversations are currently marked as active in VS Code. The user can click the waving hand icon in Cline Ultra to mark a conversation as active."
    };
  } catch (error) {
    console.error('Error getting active tasks:', error);
    return {
      active_tasks: [],
      count: 0,
      error: error.message
    };
  }
}

// Create test active_tasks.json file for testing
async function setupTestFile() {
  const homedir = os.homedir();
  const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  
  // Create test data
  const testData = {
    activeTasks: [
      {
        id: "1711369200000", // Example timestamp
        label: "A",
        lastActivated: Date.now() - 60000 // 1 minute ago
      },
      {
        id: "1711369300000", // Example timestamp
        label: "B",
        lastActivated: Date.now() - 120000 // 2 minutes ago
      }
    ]
  };
  
  // Ensure directories exist
  await fs.ensureDir(path.dirname(ultraPath));
  
  // Write test data to Ultra path
  await fs.writeJson(ultraPath, testData, { spaces: 2 });
  console.log(`Created test active_tasks.json at ${ultraPath}`);
  
  return ultraPath;
}

// Clean up test file
async function cleanupTestFile(filePath) {
  try {
    await fs.remove(filePath);
    console.log(`Removed test file: ${filePath}`);
  } catch (err) {
    console.error(`Error removing test file: ${err.message}`);
  }
}

// Main function
async function main() {
  try {
    // Set up test file
    const testFilePath = await setupTestFile();
    
    // Test get_active_task with no label
    console.log('\nTesting get_active_task with no label:');
    const result1 = await getActiveTasks();
    console.log(JSON.stringify(result1, null, 2));
    
    // Test get_active_task with label A
    console.log('\nTesting get_active_task with label A:');
    const result2 = await getActiveTasks('A');
    console.log(JSON.stringify(result2, null, 2));
    
    // Test get_active_task with label B
    console.log('\nTesting get_active_task with label B:');
    const result3 = await getActiveTasks('B');
    console.log(JSON.stringify(result3, null, 2));
    
    // Clean up test file
    await cleanupTestFile(testFilePath);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
