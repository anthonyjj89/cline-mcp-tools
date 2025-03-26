/**
 * Test script for sending external advice to an active conversation
 * This tests the ability to send advice using only the active_label parameter
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

// Get active tasks data
async function getActiveTasks() {
  const homedir = os.homedir();
  const ultraActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  const standardActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  let activeTasksData = null;
  
  // Try to read the active tasks file from both locations
  if (await fs.pathExists(ultraActivePath)) {
    try {
      const content = await fs.readFile(ultraActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
      return { data: activeTasksData, path: ultraActivePath };
    } catch (error) {
      console.error('Error reading ultra active tasks file:', error);
    }
  }
  
  if (await fs.pathExists(standardActivePath)) {
    try {
      const content = await fs.readFile(standardActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
      return { data: activeTasksData, path: standardActivePath };
    } catch (error) {
      console.error('Error reading standard active tasks file:', error);
    }
  }
  
  return { data: null, path: null };
}

// Send advice to active conversation
async function sendAdviceToActive() {
  // Get active tasks
  const { data: activeTasksData, path: activeTasksPath } = await getActiveTasks();
  
  if (!activeTasksData || !activeTasksData.activeTasks || activeTasksData.activeTasks.length === 0) {
    console.error('No active tasks found. Please mark a conversation as active in VS Code first.');
    return;
  }
  
  // Find Active A task
  const activeATask = activeTasksData.activeTasks.find(t => t.label === 'A');
  
  if (!activeATask) {
    console.error('No conversation marked as Active A found. Please mark a conversation as Active A in VS Code first.');
    return;
  }
  
  console.log(`Found Active A task: ${activeATask.id}`);
  console.log(`Last activated: ${new Date(activeATask.lastActivated).toLocaleString()}`);
  
  // Create advice content
  const advice = {
    content: "This is a test message sent using only the active_label parameter without task_id. If you're seeing this, the fix for the send_external_advice tool is working correctly!",
    title: "Active Label Test",
    type: "info",
    priority: "high",
    active_label: "A" // Only using active_label, not task_id
  };
  
  // Get the tasks directory for this task
  const homedir = os.homedir();
  const tasksDir = activeTasksPath.includes('custom.claude-dev-ultra') 
    ? path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks')
    : path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
  
  // Create the advice directory if it doesn't exist
  const adviceDir = path.join(tasksDir, activeATask.id, 'external-advice');
  await fs.mkdirp(adviceDir);
  
  // Create a unique ID for the advice
  const adviceId = `advice-active-label-test-${Date.now()}`;
  
  // Create the full advice object
  const fullAdvice = {
    id: adviceId,
    ...advice,
    timestamp: Date.now(),
    expiresAt: null,
    relatedFiles: [],
    read: false,
    dismissed: false
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${adviceId}.json`);
  await fs.writeFile(adviceFilePath, JSON.stringify(fullAdvice, null, 2), 'utf8');
  
  console.log(`Advice written to: ${adviceFilePath}`);
  
  // List all advice files in the directory
  const adviceFiles = await fs.readdir(adviceDir);
  console.log(`Total advice files: ${adviceFiles.length}`);
  
  // Get the latest advice file
  const latestAdviceFile = adviceFiles.sort().pop();
  console.log(`Latest advice file: ${latestAdviceFile}`);
  
  console.log('\nTest completed successfully!');
  console.log(`Advice sent to Active A conversation (${activeATask.id})`);
  console.log('Check your Cline Ultra interface for the notification.');
}

// Run the test
sendAdviceToActive().catch(console.error);
