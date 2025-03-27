/**
 * Comprehensive test for the Crash Reports functionality
 * Tests all aspects of the crash reports feature including:
 * - Directory creation
 * - Crash report generation
 * - Crash report saving
 * - Crash report reading
 * - Crash report updating
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// Import the required modules
const { recoverCrashedConversation, formatRecoveredContext, createCrashReport } = require('../../../build/utils/crash-recovery.js');
const { ensureCrashReportsDirectories, getCrashReportsDirectory, getDismissedCrashReportsDirectory } = require('../../../build/utils/paths.js');

// Configuration
const TEST_TASK_ID = '1742912459362'; // Replace with a valid task ID from your system
const TEST_TIMEOUT = 30000; // 30 seconds

/**
 * Test the crash reports directory creation
 */
async function testCrashReportsDirectoryCreation() {
  console.log('\n--- Testing crash reports directory creation ---');
  
  try {
    // Ensure crash reports directories exist
    const { crashReportsDir, dismissedDir, created } = await ensureCrashReportsDirectories();
    
    // Verify the directories exist
    assert.ok(fs.existsSync(crashReportsDir), 'Crash reports directory should exist');
    assert.ok(fs.existsSync(dismissedDir), 'Dismissed directory should exist');
    
    // Verify the directory paths are correct
    const homedir = os.homedir();
    const expectedCrashReportsDir = path.join(
      homedir, 
      'Library', 
      'Application Support', 
      'Code', 
      'User', 
      'globalStorage', 
      'custom.claude-dev-ultra', 
      'crashReports'
    );
    
    const expectedDismissedDir = path.join(expectedCrashReportsDir, 'Dismissed');
    
    assert.strictEqual(crashReportsDir, expectedCrashReportsDir, 'Crash reports directory path should match expected path');
    assert.strictEqual(dismissedDir, expectedDismissedDir, 'Dismissed directory path should match expected path');
    
    console.log('✅ Crash reports directory creation test passed');
    return { crashReportsDir, dismissedDir };
  } catch (error) {
    console.error('❌ Crash reports directory creation test failed:', error);
    throw error;
  }
}

/**
 * Test the crash report generation
 */
async function testCrashReportGeneration() {
  console.log('\n--- Testing crash report generation ---');
  
  try {
    // Recover a crashed conversation
    const recoveredContext = await recoverCrashedConversation(TEST_TASK_ID, 2000, true);
    
    // Verify the recovered context has the expected properties
    assert.ok(recoveredContext, 'Recovered context should exist');
    assert.ok(recoveredContext.main_topic, 'Recovered context should have a main topic');
    assert.ok(Array.isArray(recoveredContext.subtopics), 'Recovered context should have subtopics array');
    assert.ok(recoveredContext.summary, 'Recovered context should have a summary');
    assert.ok(recoveredContext.message_count, 'Recovered context should have message count');
    
    // Format the recovered context as a message
    const formattedMessage = formatRecoveredContext(recoveredContext);
    
    // Verify the formatted message
    assert.ok(formattedMessage, 'Formatted message should exist');
    assert.ok(formattedMessage.includes('CONVERSATION RECOVERY'), 'Formatted message should include recovery header');
    assert.ok(formattedMessage.includes(recoveredContext.main_topic), 'Formatted message should include main topic');
    
    // Create a crash report object
    const crashReport = createCrashReport(TEST_TASK_ID, recoveredContext, formattedMessage);
    
    // Verify the crash report object
    assert.ok(crashReport, 'Crash report should exist');
    assert.ok(crashReport.id, 'Crash report should have an ID');
    assert.ok(crashReport.id.startsWith('crash-'), 'Crash report ID should start with "crash-"');
    assert.strictEqual(crashReport.task_id, TEST_TASK_ID, 'Crash report task ID should match test task ID');
    assert.ok(crashReport.timestamp, 'Crash report should have a timestamp');
    assert.strictEqual(crashReport.main_topic, recoveredContext.main_topic, 'Crash report main topic should match recovered context');
    assert.ok(Array.isArray(crashReport.subtopics), 'Crash report should have subtopics array');
    assert.ok(crashReport.formatted_message, 'Crash report should have formatted message');
    assert.strictEqual(crashReport.read, false, 'Crash report should be marked as unread');
    
    console.log('✅ Crash report generation test passed');
    return { recoveredContext, formattedMessage, crashReport };
  } catch (error) {
    console.error('❌ Crash report generation test failed:', error);
    throw error;
  }
}

/**
 * Test saving and reading crash reports
 */
async function testCrashReportSavingAndReading() {
  console.log('\n--- Testing crash report saving and reading ---');
  
  try {
    // Get the crash reports directory
    const crashReportsDir = getCrashReportsDirectory();
    
    // Generate a crash report
    const { crashReport } = await testCrashReportGeneration();
    
    // Save the crash report to the crash reports directory
    const crashReportPath = path.join(crashReportsDir, `${crashReport.id}.json`);
    await fs.promises.writeFile(crashReportPath, JSON.stringify(crashReport, null, 2), 'utf8');
    
    // Verify the crash report file exists
    assert.ok(fs.existsSync(crashReportPath), 'Crash report file should exist');
    
    // Read the crash report file
    const savedReport = JSON.parse(await fs.promises.readFile(crashReportPath, 'utf8'));
    
    // Verify the saved report matches the original
    assert.strictEqual(savedReport.id, crashReport.id, 'Saved report ID should match original');
    assert.strictEqual(savedReport.task_id, crashReport.task_id, 'Saved report task ID should match original');
    assert.strictEqual(savedReport.main_topic, crashReport.main_topic, 'Saved report main topic should match original');
    assert.strictEqual(savedReport.read, crashReport.read, 'Saved report read status should match original');
    
    console.log('✅ Crash report saving and reading test passed');
    return { crashReportPath, savedReport };
  } catch (error) {
    console.error('❌ Crash report saving and reading test failed:', error);
    throw error;
  }
}

/**
 * Test updating crash reports
 */
async function testCrashReportUpdating() {
  console.log('\n--- Testing crash report updating ---');
  
  try {
    // Get the crash reports directory
    const crashReportsDir = getCrashReportsDirectory();
    
    // Generate and save a crash report
    const { crashReportPath, savedReport } = await testCrashReportSavingAndReading();
    
    // Update the crash report
    savedReport.read = true;
    await fs.promises.writeFile(crashReportPath, JSON.stringify(savedReport, null, 2), 'utf8');
    
    // Read the updated crash report
    const updatedReport = JSON.parse(await fs.promises.readFile(crashReportPath, 'utf8'));
    
    // Verify the updated report
    assert.strictEqual(updatedReport.id, savedReport.id, 'Updated report ID should match original');
    assert.strictEqual(updatedReport.read, true, 'Updated report should be marked as read');
    
    console.log('✅ Crash report updating test passed');
    return { crashReportPath, updatedReport };
  } catch (error) {
    console.error('❌ Crash report updating test failed:', error);
    throw error;
  }
}

/**
 * Test moving crash reports to the dismissed directory
 */
async function testCrashReportDismissal() {
  console.log('\n--- Testing crash report dismissal ---');
  
  try {
    // Get the crash reports directories
    const crashReportsDir = getCrashReportsDirectory();
    const dismissedDir = getDismissedCrashReportsDirectory();
    
    // Generate and save a crash report
    const { crashReportPath, updatedReport } = await testCrashReportUpdating();
    
    // Move the crash report to the dismissed directory
    const dismissedPath = path.join(dismissedDir, path.basename(crashReportPath));
    await fs.promises.rename(crashReportPath, dismissedPath);
    
    // Verify the crash report is no longer in the main directory
    assert.ok(!fs.existsSync(crashReportPath), 'Crash report should no longer exist in the main directory');
    
    // Verify the crash report is in the dismissed directory
    assert.ok(fs.existsSync(dismissedPath), 'Crash report should exist in the dismissed directory');
    
    // Read the dismissed crash report
    const dismissedReport = JSON.parse(await fs.promises.readFile(dismissedPath, 'utf8'));
    
    // Verify the dismissed report
    assert.strictEqual(dismissedReport.id, updatedReport.id, 'Dismissed report ID should match original');
    
    console.log('✅ Crash report dismissal test passed');
    
    // Clean up - move the report back to the main directory
    await fs.promises.rename(dismissedPath, crashReportPath);
    
    return { crashReportPath, dismissedPath };
  } catch (error) {
    console.error('❌ Crash report dismissal test failed:', error);
    throw error;
  }
}

/**
 * Clean up test files
 */
async function cleanUp() {
  console.log('\n--- Cleaning up test files ---');
  
  try {
    // Get the crash reports directory
    const crashReportsDir = getCrashReportsDirectory();
    
    // List all files in the crash reports directory
    const files = await fs.promises.readdir(crashReportsDir);
    
    // Delete all test crash report files
    for (const file of files) {
      if (file !== 'Dismissed' && file.startsWith('crash-')) {
        const filePath = path.join(crashReportsDir, file);
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const report = JSON.parse(fileContent);
        
        // Only delete files created by this test
        if (report.task_id === TEST_TASK_ID) {
          await fs.promises.unlink(filePath);
          console.log(`Deleted test file: ${filePath}`);
        }
      }
    }
    
    console.log('✅ Clean up completed');
  } catch (error) {
    console.error('❌ Clean up failed:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting crash reports tests...');
  
  try {
    await testCrashReportsDirectoryCreation();
    await testCrashReportGeneration();
    await testCrashReportSavingAndReading();
    await testCrashReportUpdating();
    await testCrashReportDismissal();
    
    console.log('\n✅ All crash reports tests passed!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  } finally {
    await cleanUp();
  }
}

// Run the tests with a timeout
const testPromise = runTests();
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error(`Tests timed out after ${TEST_TIMEOUT}ms`)), TEST_TIMEOUT);
});

Promise.race([testPromise, timeoutPromise])
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
