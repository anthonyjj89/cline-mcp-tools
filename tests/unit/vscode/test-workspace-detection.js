/**
 * Test script for enhanced VS Code workspace detection
 * This script tests the enhanced VS Code workspace detection methods
 * and provides detailed output about the detected workspaces.
 */

import { getVSCodeWorkspaces } from '../../../build/utils/vscode-tracker.js';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

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

// Helper function to check if VS Code is running
function isVSCodeRunning() {
  try {
    let command;
    if (process.platform === 'darwin') {
      command = 'ps aux | grep -i "Visual Studio Code.app/Contents/MacOS/Electron" | grep -v grep';
    } else if (process.platform === 'win32') {
      command = 'tasklist | findstr /i "Code.exe"';
    } else {
      command = 'ps aux | grep -i "/usr/share/code/code" | grep -v grep';
    }
    
    const result = execSync(command).toString();
    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
}

// Helper function to check storage files
function checkStorageFiles() {
  const possibleStorageLocations = [];
  
  if (process.platform === 'darwin') {
    // macOS
    possibleStorageLocations.push(
      path.join(os.homedir(), 'Library/Application Support/Code/storage.json'),
      path.join(os.homedir(), 'Library/Application Support/Code - Insiders/storage.json'),
      path.join(os.homedir(), 'Library/Application Support/Code - OSS/storage.json'),
      path.join(os.homedir(), 'Library/Application Support/VSCodium/storage.json')
    );
  } else if (process.platform === 'win32') {
    // Windows
    possibleStorageLocations.push(
      path.join(os.homedir(), 'AppData/Roaming/Code/storage.json'),
      path.join(os.homedir(), 'AppData/Roaming/Code - Insiders/storage.json'),
      path.join(os.homedir(), 'AppData/Roaming/Code - OSS/storage.json'),
      path.join(os.homedir(), 'AppData/Roaming/VSCodium/storage.json')
    );
  } else {
    // Linux and others
    possibleStorageLocations.push(
      path.join(os.homedir(), '.config/Code/storage.json'),
      path.join(os.homedir(), '.config/Code - Insiders/storage.json'),
      path.join(os.homedir(), '.config/Code - OSS/storage.json'),
      path.join(os.homedir(), '.config/VSCodium/storage.json')
    );
  }
  
  const results = [];
  
  for (const storageFile of possibleStorageLocations) {
    try {
      if (fs.existsSync(storageFile)) {
        print(`Found storage file: ${storageFile}`, colors.green);
        const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
        const workspaces = data.openedPathsList?.workspaces3 || [];
        print(`  Contains ${workspaces.length} workspaces`, colors.green);
        results.push({
          file: storageFile,
          workspaces
        });
      } else {
        print(`Storage file not found: ${storageFile}`, colors.yellow);
      }
    } catch (error) {
      print(`Error reading storage file ${storageFile}: ${error.message}`, colors.red);
    }
  }
  
  return results;
}

// Main test function
async function testWorkspaceDetection() {
  printHeader('VS Code Workspace Detection Test');
  
  // Check if VS Code is running
  const vsCodeRunning = isVSCodeRunning();
  print(`VS Code is ${vsCodeRunning ? 'running' : 'not running'}`, vsCodeRunning ? colors.green : colors.yellow);
  
  // Check storage files
  printHeader('Checking VS Code Storage Files');
  const storageResults = checkStorageFiles();
  
  // Get workspaces using the enhanced detection
  printHeader('Enhanced Workspace Detection Results');
  const workspaces = getVSCodeWorkspaces();
  
  if (workspaces.length > 0) {
    print(`Found ${workspaces.length} workspaces:`, colors.green + colors.bright);
    workspaces.forEach((workspace, index) => {
      print(`${index + 1}. ${workspace}`, colors.green);
      
      // Check if the workspace exists
      if (fs.existsSync(workspace)) {
        print(`   ✓ Workspace exists`, colors.green);
        
        // Check if it's a Git repository
        if (fs.existsSync(path.join(workspace, '.git'))) {
          print(`   ✓ Is a Git repository`, colors.green);
        } else {
          print(`   ✗ Not a Git repository`, colors.yellow);
        }
        
        // Check if it has a .vscode folder
        if (fs.existsSync(path.join(workspace, '.vscode'))) {
          print(`   ✓ Has .vscode folder`, colors.green);
        } else {
          print(`   ✗ No .vscode folder`, colors.yellow);
        }
      } else {
        print(`   ✗ Workspace does not exist`, colors.red);
      }
    });
  } else {
    print('No workspaces found', colors.yellow);
    
    // Provide suggestions
    print('\nSuggestions:', colors.cyan);
    print('1. Open VS Code with a workspace before running this test', colors.white);
    print('2. Check if VS Code is installed in a non-standard location', colors.white);
    print('3. Try running VS Code and opening a few projects before testing again', colors.white);
  }
  
  printHeader('Test Complete');
}

// Run the test
testWorkspaceDetection().catch(error => {
  print(`Error: ${error.message}`, colors.red);
  process.exit(1);
});
