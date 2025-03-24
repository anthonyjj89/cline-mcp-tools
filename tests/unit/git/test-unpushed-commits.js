#!/usr/bin/env node

/**
 * Test script for the unpushed commits functionality
 * 
 * This script demonstrates how to use the getUnpushedCommits function
 * to show commits that exist locally but have not been pushed to the remote repository.
 */

import { getUnpushedCommits, findGitRepository } from './build/utils/git-analyzer.js';
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
 * Test the getUnpushedCommits function
 */
async function testGetUnpushedCommits(repoPath) {
  printHeader('Testing getUnpushedCommits()');
  printInfo(`Repository path: ${repoPath}`);
  
  try {
    const unpushedInfo = await getUnpushedCommits(repoPath);
    
    if (!unpushedInfo.isGitRepo) {
      printError('Not a Git repository');
      return false;
    }
    
    printSuccess('Successfully retrieved unpushed commits information');
    
    // Print repository information
    printKeyValue('Branch', unpushedInfo.branch || 'N/A');
    printKeyValue('Has Remote', unpushedInfo.hasRemote ? 'Yes' : 'No');
    
    if (!unpushedInfo.hasRemote) {
      printInfo(unpushedInfo.message || 'No remote repository found');
      return true;
    }
    
    printKeyValue('Has Upstream', unpushedInfo.hasUpstream ? 'Yes' : 'No');
    
    if (!unpushedInfo.hasUpstream) {
      printInfo(unpushedInfo.message || 'No upstream branch found');
      return true;
    }
    
    printKeyValue('Unpushed Commits', unpushedInfo.unpushedCount || 0);
    
    // Print unpushed commits
    if (unpushedInfo.commits && unpushedInfo.commits.length > 0) {
      printSubHeader('Unpushed Commits');
      
      unpushedInfo.commits.forEach((commit, index) => {
        console.log(`${colors.green}${commit.hash.substring(0, 7)}${colors.reset} - ${commit.date} - ${colors.bright}${commit.author}${colors.reset}`);
        console.log(`    ${commit.message}`);
        
        if (index < unpushedInfo.commits.length - 1) {
          console.log(''); // Add empty line between commits
        }
      });
    } else {
      printInfo('No unpushed commits found');
    }
    
    return true;
  } catch (error) {
    printError(`Error testing getUnpushedCommits: ${error.message}`);
    return false;
  }
}

/**
 * Main function to run all tests
 */
async function main() {
  printHeader('Unpushed Commits Test');
  
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
    printInfo('  node test-unpushed-commits.js /path/to/git/repo');
    
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
        printInfo(`  node test-unpushed-commits.js ${isRepo}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      printInfo('No Git repositories found in parent directories');
    }
    
    return;
  }
  
  // Test getUnpushedCommits
  await testGetUnpushedCommits(repoPath);
  
  printHeader('Test Complete');
  printSuccess('Unpushed commits functionality tested successfully');
}

// Run the main function
main().catch(error => {
  printError(`Unhandled error: ${error.message}`);
  process.exit(1);
});
