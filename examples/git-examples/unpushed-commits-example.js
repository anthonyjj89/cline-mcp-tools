#!/usr/bin/env node
/**
 * Example demonstrating how to use the Git analyzer to detect unpushed commits
 * 
 * This example shows how to:
 * 1. Initialize the Git analyzer
 * 2. Check for unpushed commits in a repository
 * 3. Display the results in a user-friendly format
 */

import { getUnpushedCommits } from '../../build/utils/git-analyzer.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Git repository to analyze
// By default, we'll use the current project repository
const repoPath = path.resolve(__dirname, '../../');

async function main() {
    console.log('Checking for unpushed commits in repository:', repoPath);
    
    try {
        // Get unpushed commits
        const unpushedCommits = await getUnpushedCommits(repoPath);
        
        // Display the results
        if (unpushedCommits.length === 0) {
            console.log('No unpushed commits found. The repository is up to date with the remote.');
        } else {
            console.log(`Found ${unpushedCommits.length} unpushed commits:`);
            
            unpushedCommits.forEach((commit, index) => {
                console.log(`\nCommit ${index + 1}:`);
                console.log(`  Hash: ${commit.hash}`);
                console.log(`  Author: ${commit.author}`);
                console.log(`  Date: ${commit.date}`);
                console.log(`  Message: ${commit.message}`);
                
                if (commit.files && commit.files.length > 0) {
                    console.log('  Files changed:');
                    commit.files.forEach(file => {
                        console.log(`    - ${file}`);
                    });
                }
            });
            
            console.log('\nThese commits exist locally but have not been pushed to the remote repository.');
            console.log('To push these commits, run: git push');
        }
    } catch (error) {
        console.error('Error checking for unpushed commits:', error.message);
        if (error.message.includes('not a git repository')) {
            console.error(`The directory '${repoPath}' is not a Git repository.`);
        } else if (error.message.includes('remote origin not configured')) {
            console.error('The repository does not have a remote origin configured.');
        }
    }
}

main();
