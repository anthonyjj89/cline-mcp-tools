#!/usr/bin/env node

/**
 * Test script for the uncommitted changes functionality
 * 
 * This script demonstrates how to use the getUncommittedChanges function
 * to show all uncommitted changes in a Git repository including modified,
 * staged, and untracked files.
 */

import { getUncommittedChanges, findGitRepository } from './build/utils/git-analyzer.js';
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
 * Print a file change with its diff
 */
function printFileChange(fileChange) {
  const statusColor = fileChange.status === 'modified' ? colors.yellow :
                      fileChange.status === 'created' ? colors.green :
                      fileChange.status === 'renamed' ? colors.blue :
                      fileChange.status === 'deleted' ? colors.red : colors.white;
  
  const stagedLabel = fileChange.staged ? `${colors.green}[STAGED]${colors.reset}` : `${colors.yellow}[UNSTAGED]${colors.reset}`;
  
  console.log(`${stagedLabel} ${statusColor}${fileChange.status.toUpperCase()}${colors.reset}: ${fileChange.path}`);
  
  if (fileChange.error) {
    console.log(`  ${colors.red}Error: ${fileChange.error}${colors.reset}`);
    return;
  }
  
  if (fileChange.diff) {
    // Print a condensed version of the diff
    const lines = fileChange.diff.split('\n');
    let diffLines = [];
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        diffLines.push(`  ${colors.green}${line}${colors.reset}`);
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        diffLines.push(`  ${colors.red}${line}${colors.reset}`);
      } else if (line.startsWith('@@ ')) {
        diffLines.push(`  ${colors.cyan}${line}${colors.reset}`);
      }
    }
    
    // Only show a limited number of diff lines to avoid overwhelming output
    const maxDiffLines = 10;
    if (diffLines.length > maxDiffLines) {
      console.log(diffLines.slice(0, maxDiffLines).join('\n'));
      console.log(`  ${colors.dim}... and ${diffLines.length - maxDiffLines} more lines${colors.reset}`);
    } else if (diffLines.length > 0) {
      console.log(diffLines.join('\n'));
    } else {
      console.log(`  ${colors.dim}No diff available${colors.reset}`);
    }
  }
  
  console.log(''); // Add empty line between files
}

/**
 * Test the getUncommittedChanges function
 */
async function testGetUncommittedChanges(repoPath) {
  printHeader('Testing getUncommittedChanges()');
  printInfo(`Repository path: ${repoPath}`);
  
  try {
    const uncommittedInfo = await getUncommittedChanges(repoPath);
    
    if (!uncommittedInfo.isGitRepo) {
      printError('Not a Git repository');
      return false;
    }
    
    printSuccess('Successfully retrieved uncommitted changes information');
    
    // Print repository information
    printKeyValue('Branch', uncommittedInfo.branch || 'N/A');
    
    // Print summary
    if (uncommittedInfo.summary) {
      printSubHeader('Summary');
      printKeyValue('Has Changes', uncommittedInfo.summary.hasChanges ? 'Yes' : 'No');
      printKeyValue('Modified Files', uncommittedInfo.summary.modifiedCount);
      printKeyValue('Staged Files', uncommittedInfo.summary.stagedCount);
      printKeyValue('Untracked Files', uncommittedInfo.summary.untrackedCount);
      if (uncommittedInfo.summary.deletedCount) {
        printKeyValue('Deleted Files', uncommittedInfo.summary.deletedCount);
      }
      printKeyValue('Total Changes', uncommittedInfo.summary.totalChanges);
    }
    
    // Print modified files
    if (uncommittedInfo.modified && uncommittedInfo.modified.length > 0) {
      printSubHeader('Modified Files (Unstaged)');
      uncommittedInfo.modified.forEach(fileChange => {
        printFileChange(fileChange);
      });
    } else {
      printInfo('No unstaged modifications');
    }
    
    // Print staged files
    if (uncommittedInfo.staged && uncommittedInfo.staged.length > 0) {
      printSubHeader('Staged Files');
      uncommittedInfo.staged.forEach(fileChange => {
        printFileChange(fileChange);
      });
    } else {
      printInfo('No staged changes');
    }
    
    // Print untracked files
    if (uncommittedInfo.untracked && uncommittedInfo.untracked.length > 0) {
      printSubHeader('Untracked Files');
      uncommittedInfo.untracked.forEach(file => {
        console.log(`  ${colors.dim}${file}${colors.reset}`);
      });
    } else {
      printInfo('No untracked files');
    }
    
    return true;
  } catch (error) {
    printError(`Error testing getUncommittedChanges: ${error.message}`);
    return false;
  }
}

/**
 * Main function to run all tests
 */
async function main() {
  printHeader('Uncommitted Changes Test');
  
  // Get the directory to analyze (default to current directory)
  const targetDir = process.argv[2] || process.cwd();
  printInfo(`Target directory: ${targetDir}`);
  
  // Find the Git repository
  let repoPath = null;
  
  // If the target directory is a Git repository, use it directly
  if (fs.existsSync(path.join(targetDir, '.git'))) {
    repoPath = targetDir;
  } else {
    // Otherwise, try to find a Git repository containing the target directory
    repoPath = findGitRepository(targetDir);
  }
  
  if (!repoPath) {
    printError('Cannot proceed with tests: No Git repository found');
    printInfo('Try running the script with a path to a Git repository:');
    printInfo('  node test-uncommitted-changes.js /path/to/git/repo');
    
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
        printInfo(`  node test-uncommitted-changes.js ${isRepo}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      printInfo('No Git repositories found in parent directories');
    }
    
    return;
  }
  
  // Test getUncommittedChanges
  await testGetUncommittedChanges(repoPath);
  
  printHeader('Test Complete');
  printSuccess('Uncommitted changes functionality tested successfully');
}

// Run the main function
main().catch(error => {
  printError(`Unhandled error: ${error.message}`);
  process.exit(1);
});
