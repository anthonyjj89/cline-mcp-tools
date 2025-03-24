/**
 * VS Code Monitoring - MCP tools for monitoring VS Code activity
 * Part of the Cline Chat Reader MCP Server
 */

import path from 'path';
import fs from 'fs-extra';
import { getVSCodeWorkspaces, getRecentlyModifiedFiles } from './utils/vscode-tracker.js';
import { getRecentChanges, getFileHistory, findGitRepository } from './utils/git-analyzer.js';
import { getWorkspaceSettings, getWorkspaceInfo, getLaunchConfigurations, getRecommendedExtensions } from './utils/vscode-settings.js';
import { z } from 'zod';

// Schema definitions for MCP tools
const GetVSCodeWorkspacesSchema = z.object({});

const AnalyzeWorkspaceSchema = z.object({
  workspacePath: z.string().describe('Path to the workspace to analyze'),
  hoursBack: z.number()
    .optional()
    .describe('How many hours back to look for modified files (default: 24)')
    .default(24)
});

const GetFileHistorySchema = z.object({
  filePath: z.string().describe('Path to the file to get history for')
});

const AnalyzeCloneActivitySchema = z.object({
  hoursBack: z.number()
    .optional()
    .describe('How many hours back to look for activity (default: 24)')
    .default(24)
});

/**
 * Register VS Code monitoring tools with the MCP server
 * @param {Object} server - MCP server instance
 */
export function registerVSCodeMonitoringTools(server) {
  // Convert Zod schema to JSON Schema
  const zodToJsonSchema = server.zodToJsonSchema;
  
  // Register the tools with the server
  server.registerTool('get_vscode_workspaces', GetVSCodeWorkspacesSchema, async () => {
    const workspaces = getVSCodeWorkspaces();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            workspaces,
            count: workspaces.length
          }, null, 2)
        }
      ]
    };
  });
  
  server.registerTool('analyze_workspace', AnalyzeWorkspaceSchema, async (args) => {
    const { workspacePath, hoursBack } = args;
    
    // Check if the workspace exists
    if (!fs.existsSync(workspacePath)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Workspace path does not exist: ${workspacePath}`
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    
    // Get workspace info
    const workspaceInfo = getWorkspaceInfo(workspacePath);
    
    // Get VS Code settings
    const settings = getWorkspaceSettings(workspacePath);
    
    // Get launch configurations
    const launchConfig = getLaunchConfigurations(workspacePath);
    
    // Get recommended extensions
    const extensions = getRecommendedExtensions(workspacePath);
    
    // Get Git info if it's a repo
    const gitInfo = await getRecentChanges(workspacePath);
    
    // Get recently modified files
    const recentFiles = getRecentlyModifiedFiles(workspacePath, hoursBack);
    
    // Group files by type for better analysis
    const filesByType = {};
    recentFiles.forEach(file => {
      const ext = file.extension || 'unknown';
      if (!filesByType[ext]) filesByType[ext] = [];
      filesByType[ext].push(file);
    });
    
    // Prepare the result
    const result = {
      workspace: workspaceInfo,
      settings,
      launchConfig,
      extensions,
      gitInfo,
      recentFiles: {
        count: recentFiles.length,
        byType: filesByType,
        mostRecent: recentFiles.slice(0, 10) // Just the 10 most recent
      }
    };
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  });
  
  server.registerTool('get_file_history', GetFileHistorySchema, async (args) => {
    const { filePath } = args;
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `File does not exist: ${filePath}`
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    
    // Try to find the Git repo that contains this file
    const repoPath = findGitRepository(filePath);
    
    if (repoPath) {
      // Get Git history for the file
      const history = await getFileHistory(repoPath, filePath);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(history, null, 2)
          }
        ]
      };
    }
    
    // If not in a Git repo, just return file info
    try {
      const stats = fs.statSync(filePath);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              isGitRepo: false,
              fileInfo: {
                path: filePath,
                lastModified: stats.mtime,
                size: stats.size,
                created: stats.birthtime
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              isGitRepo: false,
              error: 'File not found or inaccessible'
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  });
  
  server.registerTool('analyze_cline_activity', AnalyzeCloneActivitySchema, async (args) => {
    const { hoursBack } = args;
    
    // Get all VS Code workspaces
    const workspaces = getVSCodeWorkspaces();
    
    const results = [];
    
    for (const workspace of workspaces) {
      // Skip if not a real path
      if (!fs.existsSync(workspace)) continue;
      
      // Get workspace info
      const workspaceInfo = getWorkspaceInfo(workspace);
      
      // Check if it's a Git repo
      const gitInfo = await getRecentChanges(workspace);
      
      // Get recently modified files
      const recentFiles = getRecentlyModifiedFiles(workspace, hoursBack);
      
      // Only include workspaces with recent activity
      if (recentFiles.length > 0 || (gitInfo.isGitRepo && gitInfo.commits.length > 0)) {
        results.push({
          workspace: workspaceInfo,
          path: workspace,
          gitInfo,
          recentFileCount: recentFiles.length,
          mostRecentFiles: recentFiles.slice(0, 5).map(f => ({
            path: path.relative(workspace, f.path),
            lastModified: f.lastModified
          }))
        });
      }
    }
    
    // Sort results by number of recent files (most active first)
    results.sort((a, b) => b.recentFileCount - a.recentFileCount);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            timestamp: new Date().toISOString(),
            workspaceCount: results.length,
            workspaces: results
          }, null, 2)
        }
      ]
    };
  });
}
