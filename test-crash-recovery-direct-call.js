/**
 * Direct test script for the crash recovery functionality
 * This script bypasses the MCP server and directly calls the crash recovery functions
 */

import { recoverCrashedConversation, formatRecoveredContext } from './build/utils/crash-recovery.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Test configuration
const TEST_TASK_ID = '1742912459362'; // Replace with a valid task ID from your system
const SAVE_TO_CRASHREPORTS = true;
const INCLUDE_CODE_SNIPPETS = true;
const MAX_LENGTH = 1000;

/**
 * Ensure crash reports directories exist
 * @returns Object with directory paths and creation status
 */
async function ensureCrashReportsDirectories() {
  const homedir = os.homedir();
  let crashReportsDir;
  
  // Determine the crash reports directory based on the OS
  if (process.platform === 'win32') {
    // Windows
    crashReportsDir = path.join(
      process.env.APPDATA || '',
      'Code',
      'User',
      'globalStorage',
      'custom.claude-dev-ultra',
      'crashReports'
    );
  } else if (process.platform === 'darwin') {
    // macOS
    crashReportsDir = path.join(
      homedir,
      'Library',
      'Application Support',
      'Code',
      'User',
      'globalStorage',
      'custom.claude-dev-ultra',
      'crashReports'
    );
  } else {
    // Linux and others
    crashReportsDir = path.join(
      homedir,
      '.config',
      'Code',
      'User',
      'globalStorage',
      'custom.claude-dev-ultra',
      'crashReports'
    );
  }
  
  // Create the dismissed directory path
  const dismissedDir = path.join(crashReportsDir, 'Dismissed');
  
  // Check if directories exist
  const crashReportsDirExists = await fs.pathExists(crashReportsDir);
  const dismissedDirExists = await fs.pathExists(dismissedDir);
  
  // Create directories if they don't exist
  let created = false;
  
  if (!crashReportsDirExists) {
    await fs.mkdirp(crashReportsDir);
    created = true;
  }
  
  if (!dismissedDirExists) {
    await fs.mkdirp(dismissedDir);
    created = true;
  }
  
  return { crashReportsDir, dismissedDir, created };
}

/**
 * Create a crash report object
 * @param taskId Task ID
 * @param recoveredContext Recovered context
 * @param formattedMessage Formatted message
 * @returns Crash report object
 */
function createCrashReport(taskId, recoveredContext, formattedMessage) {
  return {
    id: `crash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    task_id: taskId,
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
}

/**
 * Test the crash recovery functionality
 */
async function testCrashRecovery() {
  try {
    console.log('=== Testing crash recovery functionality ===');
    console.log('Test configuration:');
    console.log(`- Task ID: ${TEST_TASK_ID}`);
    console.log(`- Save to crash reports: ${SAVE_TO_CRASHREPORTS}`);
    console.log(`- Include code snippets: ${INCLUDE_CODE_SNIPPETS}`);
    console.log(`- Max length: ${MAX_LENGTH}`);
    
    // Step 1: Recover the crashed conversation
    console.log('\nStep 1: Recovering crashed conversation...');
    const recoveredContext = await recoverCrashedConversation(TEST_TASK_ID, MAX_LENGTH, INCLUDE_CODE_SNIPPETS);
    
    console.log(`Recovered ${recoveredContext.message_count.recovered} messages`);
    console.log(`Main topic: ${recoveredContext.main_topic}`);
    console.log(`Subtopics: ${recoveredContext.subtopics.join(', ')}`);
    
    // Step 2: Format the recovered context as a message
    console.log('\nStep 2: Formatting recovered context as a message...');
    const formattedMessage = formatRecoveredContext(recoveredContext);
    console.log(`Formatted message length: ${formattedMessage.length} characters`);
    
    // Step 3: Save to crash reports directory if requested
    if (SAVE_TO_CRASHREPORTS) {
      console.log('\nStep 3: Saving to crash reports directory...');
      
      // Ensure crash reports directories exist
      const { crashReportsDir, dismissedDir, created } = await ensureCrashReportsDirectories();
      console.log(`Crash reports directory: ${crashReportsDir}`);
      console.log(`Dismissed directory: ${dismissedDir}`);
      console.log(`Directories created: ${created}`);
      
      // Create crash report object
      const crashReport = createCrashReport(TEST_TASK_ID, recoveredContext, formattedMessage);
      console.log(`Crash report created with ID: ${crashReport.id}`);
      
      // Save the report to the crash reports directory
      const crashReportPath = path.join(crashReportsDir, `${crashReport.id}.json`);
      await fs.writeFile(crashReportPath, JSON.stringify(crashReport, null, 2), 'utf8');
      console.log(`Crash report saved to: ${crashReportPath}`);
      
      // Verify the crash report was saved
      console.log('\nStep 4: Verifying crash report...');
      const crashReportExists = await fs.pathExists(crashReportPath);
      console.log(`Crash report exists: ${crashReportExists}`);
      
      if (crashReportExists) {
        const savedReport = JSON.parse(await fs.readFile(crashReportPath, 'utf8'));
        console.log(`Verified crash report ID: ${savedReport.id}`);
        console.log(`Verified task ID: ${savedReport.task_id}`);
        console.log(`Verified main topic: ${savedReport.main_topic}`);
      }
    }
    
    console.log('\nCrash recovery test completed successfully!');
    
    // Print instructions for viewing the crash report
    console.log('\nTo view the crash report, open VS Code and check the crash reports directory at:');
    console.log(`${os.homedir()}/Library/Application Support/Code/User/globalStorage/custom.claude-dev-ultra/crashReports`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCrashRecovery();
