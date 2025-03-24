/**
 * Script to mark a notification as read
 * This will update the 'read' property of a notification to true
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Define the specific task ID and path
const homedir = os.homedir();
const taskId = '1742841089770'; // The specific task ID provided by the user
const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks');
const taskDir = path.join(ultraPath, taskId);
const adviceDir = path.join(taskDir, 'external-advice');

// Mark a notification as read
async function markNotificationRead(notificationId) {
  console.log(`Marking notification ${notificationId} as read for task: ${taskId}`);
  
  // Check if the task directory exists
  if (!fs.existsSync(taskDir)) {
    console.error(`Task directory does not exist: ${taskDir}`);
    return false;
  }
  
  // Check if the external-advice directory exists
  if (!fs.existsSync(adviceDir)) {
    console.error(`External advice directory does not exist: ${adviceDir}`);
    return false;
  }
  
  // List all advice files in the directory
  const adviceFiles = await fs.readdir(adviceDir);
  
  // Find the notification file
  let notificationFile = null;
  for (const file of adviceFiles) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(adviceDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const advice = JSON.parse(content);
        
        if (advice.id === notificationId) {
          notificationFile = filePath;
          break;
        }
      } catch (error) {
        // Skip files that can't be parsed
      }
    }
  }
  
  if (!notificationFile) {
    console.error(`Notification with ID ${notificationId} not found`);
    return false;
  }
  
  // Read the notification file
  const content = await fs.readFile(notificationFile, 'utf8');
  const advice = JSON.parse(content);
  
  // Mark as read
  advice.read = true;
  
  // Write back to the file
  await fs.writeFile(notificationFile, JSON.stringify(advice, null, 2), 'utf8');
  
  console.log(`Notification ${notificationId} marked as read`);
  return true;
}

// Get the notification ID from command line arguments
const notificationId = process.argv[2];

if (!notificationId) {
  console.error('Please provide a notification ID as a command line argument');
  process.exit(1);
}

// Run the function
markNotificationRead(notificationId)
  .then(success => {
    if (success) {
      console.log('\nNotification marked as read successfully.');
    } else {
      console.error('\nFailed to mark notification as read.');
    }
  })
  .catch(error => {
    console.error('Error marking notification as read:', error);
  });
