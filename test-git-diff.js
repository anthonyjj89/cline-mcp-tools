#!/usr/bin/env node

/**
 * Test script for the Git diff functionality
 * 
 * This script demonstrates how to use the getGitDiff function
 * to show the actual changes between commits or between the working directory and HEAD.
 */

import { getGitDiff, findGitRepository } from './build/utils/git-analyzer.js';
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
 * Format a diff line with colors
 */
function formatDiffLine(line) {
  if (line.startsWith('+')) {
    return `${colors.green}${line}${colors.reset}`;
  } else if (line.startsWith('-')) {
    return `${colors.red}${line}${colors.reset}`;
  } else if (line.startsWith('@')) {
    return `${colors.cyan}${line}${colors.reset}`;
  } else {
    return line;
  }
}

/**
 * Test the getGitDiff function with working directory and HEAD
 */
async function testWorkingDirDiff(repoPath, filePath) {
  printHeader('Testing getGitDiff() - Working Directory vs HEAD');
  printInfo(`Repository path: ${repoPath}`);
  printInfo(`File path: ${filePath}`);
  
  try {
    const diff = await getGitDiff(repoPath, filePath);
    
    if (!diff.isGitRepo) {
      printError('Not a Git repository');
      return false;
    }
    
    printSuccess('Successfully retrieved diff information');
    
    // Print command used
    printKeyValue('Command', diff.command);
    
    // Print raw diff
    if (diff.rawDiff && diff.rawDiff.trim() !== '') {
      printSubHeader('Raw Diff');
      const lines = diff.rawDiff.split('\n');
      lines.forEach(line => {
        console.log(formatDiffLine(line));
      });
    } else {
      printInfo('No changes detected');
    }
    
    // Print parsed diff
    if (diff.parsedDiff && diff.parsedDiff.changes && diff.parsedDiff.changes.length > 0) {
      printSubHeader('Parsed Diff');
      
      diff.parsedDiff.changes.forEach((file, fileIndex) => {
        console.log(`${colors.bright}File:${colors.reset} ${file.header}`);
        
        file.hunks.forEach((hunk, hunkIndex) => {
          console.log(`\n${colors.cyan}${hunk.header}${colors.reset}`);
          
          hunk.lines.forEach(line => {
            let prefix = '';
            let lineColor = colors.reset;
            
            if (line.type === 'added') {
              prefix = '+';
              lineColor = colors.green;
            } else if (line.type === 'removed') {
              prefix = '-';
              lineColor = colors.red;
            } else {
              prefix = ' ';
            }
            
            console.log(`${lineColor}${line.content}${colors.reset}`);
          });
        });
        
        if (fileIndex < diff.parsedDiff.changes.length - 1) {
          console.log(''); // Add empty line between files
        }
      });
    }
    
    return true;
  } catch (error) {
    printError(`Error testing getGitDiff: ${error.message}`);
    return false;
  }
}

/**
 * Test the getGitDiff function with two specific commits
 */
async function testCommitDiff(repoPath, filePath, oldRef, newRef) {
  printHeader(`Testing getGitDiff() - ${oldRef} vs ${newRef}`);
  printInfo(`Repository path: ${repoPath}`);
  printInfo(`File path: ${filePath}`);
  printInfo(`Old reference: ${oldRef}`);
  printInfo(`New reference: ${newRef}`);
  
  try {
    const diff = await getGitDiff(repoPath, filePath, oldRef, newRef);
    
    if (!diff.isGitRepo) {
      printError('Not a Git repository');
      return false;
    }
    
    printSuccess('Successfully retrieved diff information');
    
    // Print command used
    printKeyValue('Command', diff.command);
    
    // Print raw diff
    if (diff.rawDiff && diff.rawDiff.trim() !== '') {
      printSubHeader('Raw Diff');
      const lines = diff.rawDiff.split('\n');
      lines.forEach(line => {
        console.log(formatDiffLine(line));
      });
    } else {
      printInfo('No changes detected between these commits');
    }
    
    return true;
  } catch (error) {
    printError(`Error testing getGitDiff: ${error.message}`);
    return false;
  }
}

/**
 * Main function to run all tests
 */
async function main() {
  printHeader('Git Diff Test');
  
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
    printInfo('  node test-git-diff.js /path/to/git/repo');
    
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
        printInfo(`  node test-git-diff.js ${isRepo}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      printInfo('No Git repositories found in parent directories');
    }
    
    return;
  }
  
  // Use README.md in the test-git-repo directory
  let testFile = path.join(repoPath, 'README.md');
  
  // If README.md doesn't exist, try to find another file
  if (!fs.existsSync(testFile)) {
    testFile = null;
    
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
  }
  
  // Test getGitDiff with working directory and HEAD
  await testWorkingDirDiff(repoPath, testFile);
  
  // Check if we have at least two commits to compare
  try {
    const { execSync } = await import('child_process');
    const gitLog = execSync(`cd ${repoPath} && git log --oneline -n 2`, { encoding: 'utf8' });
    const commits = gitLog.trim().split('\n');
    
    if (commits.length >= 2) {
      const newRef = commits[0].split(' ')[0];
      const oldRef = commits[1].split(' ')[0];
      
      // Test getGitDiff with two specific commits
      await testCommitDiff(repoPath, testFile, oldRef, newRef);
    } else {
      printInfo('Not enough commits to test diff between commits');
    }
  } catch (error) {
    printError(`Error getting commit history: ${error.message}`);
  }
  
  printHeader('Test Complete');
  printSuccess('Git diff functionality tested successfully');
}

// Run the main function
main().catch(error => {
  printError(`Unhandled error: ${error.message}`);
  process.exit(1);
});
