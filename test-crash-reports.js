/**
 * Test script for the crash reports functionality
 * This script tests the ability to recover a crashed conversation and save it to the crash reports directory
 */

import { recoverCrashedConversation, formatRecoveredContext } from './build/utils/crash-recovery.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Configuration
const TEST_TASK_ID = '1742912459362'; // Replace with a valid task ID from your system

/**
 * Main test function
 */
async function testCrashReports() {
  console.log('Testing crash reports functionality...');
  
  try {
    // Step 1: Ensure crash reports directories exist
    console.log('\n1. Ensuring crash reports directories exist...');
    
    // Get the crash reports directory path
    const homedir = os.homedir();
    const crashReportsDir = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'crashReports');
    const dismissedDir = path.join(crashReportsDir, 'Dismissed');
    
    // Create the directories if they don't exist
    let created = false;
    if (!await fs.pathExists(crashReportsDir)) {
      await fs.mkdirp(crashReportsDir);
      created = true;
    }
    
    if (!await fs.pathExists(dismissedDir)) {
      await fs.mkdirp(dismissedDir);
      created = true;
    }
    
    console.log(`Crash reports directory: ${crashReportsDir}`);
    console.log(`Dismissed directory: ${dismissedDir}`);
    console.log(`Directories created: ${created}`);
    
    // Step 2: Recover a crashed conversation
    console.log('\n2. Recovering crashed conversation...');
    const recoveredContext = await recoverCrashedConversation(TEST_TASK_ID, 2000, true);
    console.log(`Recovered ${recoveredContext.message_count.recovered} messages`);
    console.log(`Main topic: ${recoveredContext.main_topic}`);
    console.log(`Subtopics: ${recoveredContext.subtopics.slice(0, 3).join(', ')}`);
    
    // Step 3: Format the recovered context as a message
    console.log('\n3. Formatting recovered context as a message...');
    const formattedMessage = formatRecoveredContext(recoveredContext);
    console.log(`Formatted message length: ${formattedMessage.length} characters`);
    
    // Step 4: Create a crash report object
    console.log('\n4. Creating crash report object...');
    const crashReport = {
      id: `crash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      task_id: TEST_TASK_ID,
      timestamp: Date.now(),
      summary: recoveredContext.summary,
      main_topic: recoveredContext.main_topic,
      subtopics: recoveredContext.subtopics.slice(0, 5),
      active_files: recoveredContext.active_files.slice(0, 5),
      open_questions: recoveredContext.open_questions,
      current_status: recoveredContext.current_status,
      formatted_message: formattedMessage,
      read: false
    };
    console.log(`Crash report ID: ${crashReport.id}`);
    
    // Step 5: Save the crash report to the crash reports directory
    console.log('\n5. Saving crash report to crash reports directory...');
    const crashReportPath = path.join(crashReportsDir, `${crashReport.id}.json`);
    await fs.writeFile(crashReportPath, JSON.stringify(crashReport, null, 2), 'utf8');
    console.log(`Crash report saved to: ${crashReportPath}`);
    
    // Step 6: Verify that the crash report was created correctly
    console.log('\n6. Verifying crash report...');
    const savedReport = JSON.parse(await fs.readFile(crashReportPath, 'utf8'));
    console.log(`Verified crash report ID: ${savedReport.id}`);
    console.log(`Verified task ID: ${savedReport.task_id}`);
    console.log(`Verified main topic: ${savedReport.main_topic}`);
    
    console.log('\nCrash reports test completed successfully!');
    console.log(`\nTo view the crash report, open VS Code and check the crash reports directory at:`);
    console.log(crashReportsDir);
    
    return {
      success: true,
      crashReportPath,
      crashReportId: crashReport.id
    };
  } catch (error) {
    console.error('Error testing crash reports:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testCrashReports().then(result => {
  if (result.success) {
    console.log('\nTest completed successfully.');
  } else {
    console.error('\nTest failed:', result.error);
    process.exit(1);
  }
});
