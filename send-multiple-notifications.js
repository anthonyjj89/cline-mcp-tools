/**
 * Script to send multiple test notifications with different types to a specific task
 * This will create multiple advice notifications in the external-advice directory for the specified task
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
async function sendNotification(type, priority, title, content) {
  console.log(`Sending ${type} notification with ${priority} priority to task: ${taskId}`);
  
  // Check if the task directory exists
  if (!fs.existsSync(taskDir)) {
    console.error(`Task directory does not exist: ${taskDir}`);
    return false;
  }
  
  // Create the external-advice directory if it doesn't exist
  await fs.mkdirp(adviceDir);
  
  // Create a unique advice ID
  const adviceId = `advice-${type}-${Date.now()}`;
  
  // Create the advice object
  const advice = {
    id: adviceId,
    content: content,
    title: title,
    type: type,
    priority: priority,
    timestamp: Date.now(),
    expiresAt: null,
    relatedFiles: [],
    read: false
  };
  
  // Write the advice to a file
  const adviceFilePath = path.join(adviceDir, `${adviceId}.json`);
  console.log(`Writing advice to file: ${adviceFilePath}`);
  await fs.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  return adviceId;
}

// Send multiple notifications with different types
async function sendMultipleNotifications() {
  // Wait a bit between notifications to ensure they're processed in order
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Send an info notification
  await sendNotification(
    'info',
    'medium',
    'Information Notification',
    'This is an information notification from the External Advice feature.'
  );
  await wait(1000);
  
  // Send a warning notification
  await sendNotification(
    'warning',
    'high',
    'Warning Notification',
    'This is a warning notification with high priority. It should be displayed prominently in your Cline Ultra interface.'
  );
  await wait(1000);
  
  // Send a tip notification
  await sendNotification(
    'tip',
    'low',
    'Helpful Tip',
    'This is a tip notification with low priority. It provides helpful advice that is not urgent.'
  );
  await wait(1000);
  
  // Send a task notification
  await sendNotification(
    'task',
    'medium',
    'Task Notification',
    'This is a task notification. It suggests an action that you might want to take.'
  );
  
  // List all advice files in the directory
  const adviceFiles = await fs.readdir(adviceDir);
  console.log(`\nTotal advice files: ${adviceFiles.length}`);
  console.log(`Latest advice files:`);
  adviceFiles.slice(-4).forEach(file => console.log(`  ${file}`));
  
  return true;
}

// Run the function
sendMultipleNotifications()
  .then(success => {
    if (success) {
      console.log('\nMultiple test notifications sent successfully!');
      console.log('Check your Cline Ultra interface for the notifications.');
      console.log(`Notifications should appear in task: ${taskId}`);
    } else {
      console.error('\nFailed to send test notifications.');
    }
  })
  .catch(error => {
    console.error('Error sending test notifications:', error);
  });
