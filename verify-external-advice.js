/**
 * Verification script for the External Advice feature
 * This script checks if the external advice files exist in the expected location
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the VS Code tasks directory based on the current OS
function getVSCodeTasksDirectory() {
  const homedir = os.homedir();
  
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    case 'darwin':
      return path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    case 'linux':
      return path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

// Function to verify the external advice files
function verifyExternalAdvice() {
  try {
    // Get the tasks directory
    const tasksDir = getVSCodeTasksDirectory();
    console.log('VS Code tasks directory:', tasksDir);
    
    // Get all task directories
    const taskDirs = fs.readdirSync(tasksDir)
      .filter(dir => {
        const fullPath = path.join(tasksDir, dir);
        return fs.statSync(fullPath).isDirectory() && /^\d+$/.test(dir); // Only include timestamp directories
      });
    
    console.log(`Found ${taskDirs.length} task directories`);
    
    let totalAdviceFiles = 0;
    let tasksWithAdvice = 0;
    
    // Check each task directory for external advice
    for (const taskDir of taskDirs) {
      const taskPath = path.join(tasksDir, taskDir);
      const adviceDir = path.join(taskPath, 'external-advice');
      
      if (fs.existsSync(adviceDir)) {
        // List all advice files
        const adviceFiles = fs.readdirSync(adviceDir);
        
        if (adviceFiles.length > 0) {
          tasksWithAdvice++;
          totalAdviceFiles += adviceFiles.length;
          
          console.log(`\nTask ${taskDir} has ${adviceFiles.length} advice files:`);
          
          // Read and display the content of each advice file
          adviceFiles.forEach((file, index) => {
            const filePath = path.join(adviceDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            try {
              const advice = JSON.parse(fileContent);
              console.log(`[${index + 1}] ${file}:`);
              console.log(`  - ID: ${advice.id}`);
              console.log(`  - Title: ${advice.title}`);
              console.log(`  - Content: ${advice.content.substring(0, 50)}...`);
              console.log(`  - Type: ${advice.type}`);
              console.log(`  - Priority: ${advice.priority}`);
              console.log(`  - Timestamp: ${new Date(advice.timestamp).toISOString()}`);
              console.log(`  - Expires At: ${advice.expiresAt ? new Date(advice.expiresAt).toISOString() : 'Never'}`);
              console.log(`  - Related Files: ${advice.relatedFiles ? advice.relatedFiles.join(', ') : 'None'}`);
              console.log(`  - Read: ${advice.read}`);
            } catch (error) {
              console.error(`Error parsing advice file ${file}:`, error);
            }
          });
        }
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Total tasks: ${taskDirs.length}`);
    console.log(`- Tasks with advice: ${tasksWithAdvice}`);
    console.log(`- Total advice files: ${totalAdviceFiles}`);
    
    if (totalAdviceFiles > 0) {
      console.log('\nExternal Advice feature is working correctly!');
    } else {
      console.log('\nNo advice files found. The External Advice feature may not be working correctly.');
    }
  } catch (error) {
    console.error('Error verifying external advice:', error);
  }
}

// Run the verification
verifyExternalAdvice();
