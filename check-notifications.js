/**
 * Script to check notifications in a specific task
 * This will list all advice files in the external-advice directory for the specified task
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

// Check notifications
async function checkNotifications() {
  console.log(`Checking notifications for task: ${taskId}`);
  
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
  console.log(`\nTotal advice files: ${adviceFiles.length}`);
  
  if (adviceFiles.length === 0) {
    console.log('No advice files found.');
    return true;
  }
  
  console.log('\nAdvice files:');
  for (const file of adviceFiles) {
    try {
      const filePath = path.join(adviceDir, file);
      const stats = fs.statSync(filePath);
      
      console.log(`\nFile: ${file} (${stats.size} bytes, created ${new Date(stats.birthtime).toLocaleString()})`);
      
      // Skip files that don't end with .json
      if (!file.endsWith('.json')) {
        console.log('  Not a JSON file, skipping content analysis');
        continue;
      }
      
      // Try to read and parse the file
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const advice = JSON.parse(content);
        
        console.log(`  ID: ${advice.id || 'N/A'}`);
        console.log(`  Title: ${advice.title || 'N/A'}`);
        console.log(`  Type: ${advice.type || 'N/A'}`);
        console.log(`  Priority: ${advice.priority || 'N/A'}`);
        console.log(`  Timestamp: ${advice.timestamp ? new Date(advice.timestamp).toLocaleString() : 'N/A'}`);
        console.log(`  Read: ${advice.read !== undefined ? advice.read : 'N/A'}`);
        console.log(`  Content: ${advice.content ? (advice.content.substring(0, 100) + (advice.content.length > 100 ? '...' : '')) : 'N/A'}`);
      } catch (error) {
        console.log(`  Error parsing file: ${error.message}`);
      }
    } catch (error) {
      console.log(`\nError processing file ${file}: ${error.message}`);
    }
  }
  
  return true;
}

// Run the function
checkNotifications()
  .then(success => {
    if (success) {
      console.log('\nNotification check completed successfully.');
    } else {
      console.error('\nFailed to check notifications.');
    }
  })
  .catch(error => {
    console.error('Error checking notifications:', error);
  });
