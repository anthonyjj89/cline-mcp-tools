/**
 * Script to send a test notification to a specific task
 * This will create an advice notification in the external-advice directory for the specified task
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

// Create a test notification
async function sendTestNotification() {
  console.log(`Sending test notification to task: ${taskId}`);
  
  // Check if the task directory exists
  if (!fs.existsSync(taskDir)) {
    console.error(`Task directory does not exist: ${taskDir}`);
    return false;
  }
  
  // Create the external-advice directory if it doesn't exist
  await fs.mkdirp(adviceDir);
  
  // Create a unique advice ID
  const adviceId = `advice-test-${Date.now()}`;
  
  // Create the advice object
  const advice = {
    id: adviceId,
    content: "This is a test notification from the External Advice feature. If you're seeing this notification in your Cline Ultra interface, the feature is working correctly!",
    title: "Test Notification",
    type: "info",
    priority: "high",
    timestamp: Date.now(),
    expiresAt: null,
    relatedFiles: [],
    read: false
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${adviceId}.json`);
  console.log(`Writing advice to file: ${adviceFilePath}`);
  await fs.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  // List all advice files in the directory
  const adviceFiles = await fs.readdir(adviceDir);
  console.log(`Total advice files: ${adviceFiles.length}`);
  console.log(`Latest advice file: ${adviceFiles[adviceFiles.length - 1]}`);
  
  return true;
}

// Run the function
sendTestNotification()
  .then(success => {
    if (success) {
      console.log('\nTest notification sent successfully!');
      console.log('Check your Cline Ultra interface for the notification.');
      console.log(`Notification should appear in task: ${taskId}`);
    } else {
      console.error('\nFailed to send test notification.');
    }
  })
  .catch(error => {
    console.error('Error sending test notification:', error);
  });
