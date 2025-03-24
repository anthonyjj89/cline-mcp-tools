#!/usr/bin/env node
/**
 * Example demonstrating how to use the VS Code monitoring functionality
 * 
 * This example shows how to:
 * 1. Get information about VS Code workspaces
 * 2. Monitor workspace changes
 * 3. Analyze workspace settings
 * 4. Track recently modified files
 */

import { 
    getRecentWorkspaces,
    getWorkspaceSettings,
    getRecentlyModifiedFiles,
    getWorkspaceGitInfo
} from '../../build/utils/vscode-tracker.js';

async function main() {
    console.log('VS Code Workspace Monitoring Example');
    console.log('===================================\n');
    
    try {
        // 1. Get information about VS Code workspaces
        console.log('1. Recent Workspaces:');
        console.log('--------------------');
        
        const recentWorkspaces = await getRecentWorkspaces();
        
        if (recentWorkspaces.length === 0) {
            console.log('No recent workspaces found.');
        } else {
            console.log(`Found ${recentWorkspaces.length} recent workspaces:`);
            
            recentWorkspaces.forEach((workspace, index) => {
                console.log(`\nWorkspace ${index + 1}:`);
                console.log(`  Path: ${workspace.path}`);
                console.log(`  Last opened: ${workspace.lastOpened}`);
                console.log(`  Name: ${workspace.name}`);
            });
        }
        
        // 2. Analyze workspace settings
        console.log('\n2. Workspace Settings:');
        console.log('---------------------');
        
        if (recentWorkspaces.length > 0) {
            const mostRecentWorkspace = recentWorkspaces[0];
            console.log(`Analyzing settings for workspace: ${mostRecentWorkspace.name}`);
            
            const settings = await getWorkspaceSettings(mostRecentWorkspace.path);
            
            console.log('\nSettings:');
            Object.entries(settings).forEach(([key, value]) => {
                console.log(`  ${key}: ${JSON.stringify(value)}`);
            });
        } else {
            console.log('No workspaces available to analyze settings.');
        }
        
        // 3. Track recently modified files
        console.log('\n3. Recently Modified Files:');
        console.log('--------------------------');
        
        if (recentWorkspaces.length > 0) {
            const mostRecentWorkspace = recentWorkspaces[0];
            console.log(`Checking recently modified files in workspace: ${mostRecentWorkspace.name}`);
            
            const recentFiles = await getRecentlyModifiedFiles(mostRecentWorkspace.path);
            
            if (recentFiles.length === 0) {
                console.log('No recently modified files found.');
            } else {
                console.log(`Found ${recentFiles.length} recently modified files:`);
                
                recentFiles.forEach((file, index) => {
                    console.log(`\nFile ${index + 1}:`);
                    console.log(`  Path: ${file.path}`);
                    console.log(`  Last modified: ${file.lastModified}`);
                    console.log(`  Size: ${file.size} bytes`);
                });
            }
        } else {
            console.log('No workspaces available to check for modified files.');
        }
        
        // 4. Get Git repository information
        console.log('\n4. Git Repository Information:');
        console.log('-----------------------------');
        
        if (recentWorkspaces.length > 0) {
            const mostRecentWorkspace = recentWorkspaces[0];
            console.log(`Checking Git information for workspace: ${mostRecentWorkspace.name}`);
            
            const gitInfo = await getWorkspaceGitInfo(mostRecentWorkspace.path);
            
            if (!gitInfo) {
                console.log('No Git repository found for this workspace.');
            } else {
                console.log('\nGit Repository Information:');
                console.log(`  Repository: ${gitInfo.repositoryPath}`);
                console.log(`  Current branch: ${gitInfo.currentBranch}`);
                console.log(`  Remote URL: ${gitInfo.remoteUrl}`);
                
                if (gitInfo.lastCommit) {
                    console.log('\n  Last Commit:');
                    console.log(`    Hash: ${gitInfo.lastCommit.hash}`);
                    console.log(`    Author: ${gitInfo.lastCommit.author}`);
                    console.log(`    Date: ${gitInfo.lastCommit.date}`);
                    console.log(`    Message: ${gitInfo.lastCommit.message}`);
                }
            }
        } else {
            console.log('No workspaces available to check Git information.');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
