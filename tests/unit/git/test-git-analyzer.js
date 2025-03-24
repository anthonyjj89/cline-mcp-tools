#!/usr/bin/env node

/**
 * Test script for the git-analyzer utility
 * 
 * This script demonstrates how to use the git-analyzer functions
 * to get information about Git repositories.
 */

import { getRecentChanges, getFileHistory, findGitRepository } from '../../../build/utils/git-analyzer.js';
import path from 'path';
import fs from 'fs';

// ANSI color codes for better output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Print a formatted section header
 */
function printHeader(title) {
  console.log('\n');
  console.log(`${colors.cyan}${colors.bright}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright} ${title} ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}${'='.repeat(80)}${colors.reset}`);
}

/**
 * Print a formatted subsection header
 */
function printSubHeader(title) {
  console.log(`\n${colors.yellow}${colors.bright}--- ${title} ---${colors.reset}\n`);
}

/**
 * Print a success message
 */
function printSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

/**
 * Print an error message
 */
function printError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

/**
 * Print an info message
 */
function printInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

/**
 * Print a key-value pair
 */
function printKeyValue(key, value) {
  console.log(`${colors.bright}${key}:${colors.reset} ${value}`);
}

/**
 * Format a date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Test the getRecentChanges function
 */
async function testGetRecentChanges(repoPath) {
  printHeader('Testing getRecentChanges()');
  printInfo(`Repository path: ${repoPath}`);
  
  try {
    const repoInfo = await getRecentChanges(repoPath);
    
    if (!repoInfo.isGitRepo) {
      printError('Not a Git repository');
      return;
    }
    
    printSuccess('Successfully retrieved repository information');
    
    // Print repository information
    printSubHeader('Repository Information');
    printKeyValue('Current Branch', repoInfo.branch);
    
    // Print modified files
    if (repoInfo.modified && repoInfo.modified.length > 0) {
      printSubHeader('Modified Files');
      repoInfo.modified.forEach(file => {
        console.log(`${colors.yellow}M${colors.reset} ${file}`);
      });
    }
    
    // Print created files
    if (repoInfo.created && repoInfo.created.length > 0) {
      printSubHeader('Created Files');
      repoInfo.created.forEach(file => {
        console.log(`${colors.green}A${colors.reset} ${file}`);
      });
    }
    
    // Print deleted files
    if (repoInfo.deleted && repoInfo.deleted.length > 0) {
      printSubHeader('Deleted Files');
      repoInfo.deleted.forEach(file => {
        console.log(`${colors.red}D${colors.reset} ${file}`);
      });
    }
    
    // Print renamed files
    if (repoInfo.renamed && repoInfo.renamed.length > 0) {
      printSubHeader('Renamed Files');
      repoInfo.renamed.forEach(file => {
        console.log(`${colors.blue}R${colors.reset} ${file.from} → ${file.to}`);
      });
    }
    
    // Print recent commits
    if (repoInfo.commits && repoInfo.commits.length > 0) {
      printSubHeader('Recent Commits');
      repoInfo.commits.forEach((commit, index) => {
        console.log(`${colors.yellow}${commit.hash.substring(0, 7)}${colors.reset} - ${formatDate(commit.date)}`);
        console.log(`${colors.bright}Author:${colors.reset} ${commit.author}`);
        console.log(`${colors.bright}Message:${colors.reset} ${commit.message}`);
        if (index < repoInfo.commits.length - 1) {
          console.log(''); // Add empty line between commits
        }
      });
    }
    
    return true;
  } catch (error) {
    printError(`Error testing getRecentChanges: ${error.message}`);
    return false;
  }
}

/**
 * Test the getFileHistory function
 */
async function testGetFileHistory(repoPath, filePath) {
  printHeader('Testing getFileHistory()');
  printInfo(`Repository path: ${repoPath}`);
  printInfo(`File path: ${filePath}`);
  
  try {
    const fileHistory = await getFileHistory(repoPath, filePath);
    
    if (!fileHistory.isGitRepo) {
      printError('Not a Git repository');
      return;
    }
    
    printSuccess('Successfully retrieved file history');
    
    // Print file history
    if (fileHistory.history && fileHistory.history.length > 0) {
      printSubHeader('Commit History');
      fileHistory.history.forEach((commit, index) => {
        console.log(`${colors.yellow}${commit.hash.substring(0, 7)}${colors.reset} - ${formatDate(commit.date)}`);
        console.log(`${colors.bright}Author:${colors.reset} ${commit.author}`);
        console.log(`${colors.bright}Message:${colors.reset} ${commit.message}`);
        if (index < fileHistory.history.length - 1) {
          console.log(''); // Add empty line between commits
        }
      });
    } else {
      printInfo('No commit history found for this file');
    }
    
    return true;
  } catch (error) {
    printError(`Error testing getFileHistory: ${error.message}`);
    return false;
  }
}

/**
 * Test the findGitRepository function
 */
function testFindGitRepository(filePath) {
  printHeader('Testing findGitRepository()');
  printInfo(`File path: ${filePath}`);
  
  try {
    const repoPath = findGitRepository(filePath);
    
    if (repoPath) {
      printSuccess(`Found Git repository: ${repoPath}`);
      return repoPath;
    } else {
      printError('No Git repository found for this file');
      return null;
    }
  } catch (error) {
    printError(`Error testing findGitRepository: ${error.message}`);
    return null;
  }
}

/**
 * Main function to run all tests
 */
async function main() {
  printHeader('Git Analyzer Test');
  
  // Get the directory to analyze (default to current directory)
  const targetDir = process.argv[2] || process.cwd();
  printInfo(`Target directory: ${targetDir}`);
  
  // Test findGitRepository with the target directory
  const repoPath = testFindGitRepository(targetDir);
  
  if (!repoPath) {
    printError('Cannot proceed with tests: No Git repository found');
    printInfo('Try running the script with a path to a Git repository:');
    printInfo('  node test-git-analyzer.js /path/to/git/repo');
    
    // Try to find a Git repository in parent directories
    printSubHeader('Searching for Git repositories in parent directories');
    let currentDir = targetDir;
    let found = false;
    
    while (currentDir !== path.dirname(currentDir)) {
      currentDir = path.dirname(currentDir);
      const isRepo = findGitRepository(currentDir);
      if (isRepo) {
        printSuccess(`Found Git repository at: ${isRepo}`);
        printInfo('Try running the script with this path:');
        printInfo(`  node test-git-analyzer.js ${isRepo}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      printInfo('No Git repositories found in parent directories');
    }
    
    return;
  }
  
  // Test getRecentChanges with the found repository
  await testGetRecentChanges(repoPath);
  
  // Find a file to test getFileHistory with
  let testFile = null;
  
  // Try to find a JavaScript or TypeScript file in the repository directory
  const files = fs.readdirSync(repoPath);
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.ts')) {
      testFile = path.join(repoPath, file);
      break;
    }
  }
  
  // If no file was found, use this script itself
  if (!testFile) {
    testFile = __filename;
  }
  
  // Test getFileHistory with the found file
  await testGetFileHistory(repoPath, testFile);
  
  printHeader('Test Complete');
  printSuccess('All git-analyzer functions tested successfully');
}

// Run the main function
main().catch(error => {
  printError(`Unhandled error: ${error.message}`);
  process.exit(1);
});
