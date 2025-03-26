/**
 * Test script for the crash reports directory
 * This script checks if the crash reports directory exists, creates it if it doesn't,
 * creates a test crash report, and verifies that the crash report was created.
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

async function testCrashReportsDirectory() {
  console.log('Testing crash reports directory...');
  
  try {
    // Step 1: Get the crash reports directory path
    const homedir = os.homedir();
    const crashReportsDir = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'crashReports');
    const dismissedDir = path.join(crashReportsDir, 'Dismissed');
    
    console.log(`Crash reports directory: ${crashReportsDir}`);
    console.log(`Dismissed directory: ${dismissedDir}`);
    
    // Step 2: Check if the directories exist
    const crashReportsDirExists = await fs.pathExists(crashReportsDir);
    const dismissedDirExists = await fs.pathExists(dismissedDir);
    
    console.log(`Crash reports directory exists: ${crashReportsDirExists}`);
    console.log(`Dismissed directory exists: ${dismissedDirExists}`);
    
    // Step 3: Create the directories if they don't exist
    if (!crashReportsDirExists) {
      console.log('Creating crash reports directory...');
      await fs.mkdirp(crashReportsDir);
      console.log('Crash reports directory created.');
    }
    
    if (!dismissedDirExists) {
      console.log('Creating dismissed directory...');
      await fs.mkdirp(dismissedDir);
      console.log('Dismissed directory created.');
    }
    
    // Step 4: Create a test crash report
    console.log('Creating test crash report...');
    const crashReportId = `test-crash-${Date.now()}`;
    const crashReportPath = path.join(crashReportsDir, `${crashReportId}.json`);
    
    const crashReport = {
      id: crashReportId,
      task_id: 'test-task-id',
      timestamp: Date.now(),
      summary: 'This is a test crash report.',
      main_topic: 'Test',
      subtopics: ['Test1', 'Test2', 'Test3'],
      active_files: ['file1.js', 'file2.js', 'file3.js'],
      open_questions: ['Question 1?', 'Question 2?'],
      current_status: 'Testing crash reports directory.',
      formatted_message: 'This is a test formatted message.',
      read: false
    };
    
    await fs.writeFile(crashReportPath, JSON.stringify(crashReport, null, 2), 'utf8');
    console.log(`Test crash report created at: ${crashReportPath}`);
    
    // Step 5: Verify that the crash report was created
    console.log('Verifying test crash report...');
    const crashReportExists = await fs.pathExists(crashReportPath);
    console.log(`Test crash report exists: ${crashReportExists}`);
    
    if (crashReportExists) {
      const savedReport = JSON.parse(await fs.readFile(crashReportPath, 'utf8'));
      console.log(`Verified crash report ID: ${savedReport.id}`);
      console.log(`Verified task ID: ${savedReport.task_id}`);
      console.log(`Verified main topic: ${savedReport.main_topic}`);
    }
    
    // Step 6: List all crash reports in the directory
    console.log('\nListing all crash reports in the directory:');
    const crashReports = await fs.readdir(crashReportsDir);
    
    for (const file of crashReports) {
      if (file !== 'Dismissed') {
        const filePath = path.join(crashReportsDir, file);
        const stats = await fs.stat(filePath);
        console.log(`- ${file} (${stats.size} bytes, created ${stats.birthtime.toLocaleString()})`);
      }
    }
    
    console.log('\nTest completed successfully!');
    return {
      success: true,
      crashReportsDir,
      dismissedDir,
      testCrashReportPath: crashReportPath
    };
  } catch (error) {
    console.error('Error testing crash reports directory:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testCrashReportsDirectory().then(result => {
  if (result.success) {
    console.log('\nTest completed successfully.');
  } else {
    console.error('\nTest failed:', result.error);
    process.exit(1);
  }
});
