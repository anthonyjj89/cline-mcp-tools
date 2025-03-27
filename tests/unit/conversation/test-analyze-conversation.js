/**
 * Test script for the analyze_conversation tool
 * This script tests the functionality of the conversation analyzer with a real task
 */

import fs from 'fs';
import path from 'path';
import { getVSCodeTasksDirectory } from '../../../build/utils/paths.js';
import { listTasks } from '../../../build/services/index.js';
import { analyzeConversation } from '../../../build/utils/conversation-analyzer-simple.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Helper function to print colored output
function print(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to print section headers
function printHeader(message) {
  console.log('\n');
  print('='.repeat(80), colors.cyan);
  print(` ${message} `, colors.cyan + colors.bright);
  print('='.repeat(80), colors.cyan);
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Main test function
async function testAnalyzeConversation() {
  printHeader('Analyze Conversation Tool Test');
  
  try {
    // Get the VS Code tasks directory
    const tasksDir = getVSCodeTasksDirectory();
    print(`Using VS Code tasks directory: ${tasksDir}`, colors.blue);
    
    // List recent tasks
    print('\nListing recent tasks...', colors.blue);
    const tasks = await listTasks(tasksDir);
    
    if (tasks.length === 0) {
      print('No tasks found. Please run Claude Desktop and create a task first.', colors.red);
      return;
    }
    
    // Get the most recent task
    const latestTask = tasks[0];
    print(`\nFound ${tasks.length} tasks. Using the most recent task:`, colors.green);
    print(`Task ID: ${latestTask.id}`, colors.yellow);
    print(`Timestamp: ${new Date(latestTask.timestamp).toISOString()}`, colors.yellow);
    
    // Get the API conversation file path
    const apiFilePath = path.join(tasksDir, latestTask.id, 'api_conversation_history.json');
    
    // Check if the file exists and get its size
    if (fs.existsSync(apiFilePath)) {
      const stats = fs.statSync(apiFilePath);
      print(`Conversation file size: ${formatFileSize(stats.size)}`, colors.yellow);
    } else {
      print('Conversation file not found.', colors.red);
      return;
    }
    
    // Test with all messages
    printHeader('Analyzing All Messages');
    try {
      print('Analyzing conversation...', colors.blue);
      const startTime = Date.now();
      const analysis = await analyzeConversation(apiFilePath);
      const duration = (Date.now() - startTime) / 1000;
      
      print(`Analysis completed in ${duration.toFixed(2)}s`, colors.green);
      print('\nAnalysis Results:', colors.bright);
      print(JSON.stringify(analysis, null, 2));
      
      // Verify results
      if (analysis.message_count > 0) {
        print(`✓ Found ${analysis.message_count} messages`, colors.green);
      } else {
        print('✗ No messages found', colors.red);
      }
      
      if (analysis.topics.length > 0) {
        print(`✓ Extracted ${analysis.topics.length} topics`, colors.green);
        print('Top topics:', colors.bright);
        analysis.topics.slice(0, 5).forEach(topic => {
          print(`  - ${topic.topic} (${topic.count} occurrences)`, colors.green);
        });
      } else {
        print('✗ No topics extracted', colors.red);
      }
      
      if (analysis.code_blocks > 0) {
        print(`✓ Detected ${analysis.code_blocks} code blocks`, colors.green);
      }
      
      if (analysis.files_referenced.length > 0) {
        print(`✓ Found ${analysis.files_referenced.length} file references`, colors.green);
        print('Files referenced:', colors.bright);
        analysis.files_referenced.slice(0, 5).forEach(file => {
          print(`  - ${file}`, colors.green);
        });
      }
      
      if (analysis.key_actions.length > 0) {
        print(`✓ Detected ${analysis.key_actions.length} key actions`, colors.green);
        print('Key actions:', colors.bright);
        analysis.key_actions.forEach(action => {
          print(`  - ${action}`, colors.green);
        });
      }
    } catch (error) {
      print(`Error analyzing conversation: ${error.message}`, colors.red);
    }
    
    // Test with time window
    printHeader('Analyzing Messages in Time Window');
    try {
      const minutesBack = 30; // Last 30 minutes
      const timeWindow = Date.now() - (minutesBack * 60 * 1000);
      print(`Analyzing conversation with time window: last ${minutesBack} minutes`, colors.blue);
      print(`Timestamp: ${new Date(timeWindow).toISOString()}`, colors.blue);
      
      const startTime = Date.now();
      const analysis = await analyzeConversation(apiFilePath, timeWindow);
      const duration = (Date.now() - startTime) / 1000;
      
      print(`Analysis completed in ${duration.toFixed(2)}s`, colors.green);
      print('\nTime-Window Analysis Results:', colors.bright);
      print(JSON.stringify(analysis, null, 2));
      
      // Verify results
      print(`Found ${analysis.message_count} messages in time window`, 
        analysis.message_count > 0 ? colors.green : colors.yellow);
    } catch (error) {
      print(`Error analyzing conversation with time window: ${error.message}`, colors.red);
    }
    
    printHeader('Test Complete');
  } catch (error) {
    print(`Error: ${error.message}`, colors.red);
  }
}

// Run the test
testAnalyzeConversation().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
