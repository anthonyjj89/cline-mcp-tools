/**
 * VS Code Monitoring - MCP tools for monitoring VS Code activity
 * Part of the Cline Chat Reader MCP Server
 */

import path from 'path';
import fs from 'fs-extra';
import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getVSCodeWorkspaces, getRecentlyModifiedFiles } from './utils/vscode-tracker.js';
import { getRecentChanges, getFileHistory, findGitRepository } from './utils/git-analyzer.js';
import { getWorkspaceSettings, getWorkspaceInfo, getLaunchConfigurations, getRecommendedExtensions } from './utils/vscode-settings.js';

// Schema definitions for MCP tools
export const GetVSCodeWorkspacesSchema = z.object({});

export const AnalyzeWorkspaceSchema = z.object({
  workspacePath: z.string().describe('Path to the workspace to analyze'),
  hoursBack: z.number()
    .optional()
    .describe('How many hours back to look for modified files (default: 24)')
    .default(24)
});

export const GetFileHistorySchema = z.object({
  filePath: z.string().describe('Path to the file to get history for')
});

export const AnalyzeCloneActivitySchema = z.object({
  hoursBack: z.number()
    .optional()
    .describe('How many hours back to look for activity (default: 24)')
    .default(24)
});

/**
 * Register VS Code monitoring tools with the MCP server
 * @param {Server} server - MCP server instance
 * @returns Object containing handler functions for VS Code monitoring tools
 */
export function registerVSCodeMonitoringTools(server: Server): {
  handleGetVSCodeWorkspaces: (args: unknown) => Promise<any>;
  handleAnalyzeWorkspace: (args: unknown) => Promise<any>;
  handleGetFileHistory: (args: unknown) => Promise<any>;
  handleAnalyzeCloneActivity: (args: unknown) => Promise<any>;
} {
  // Handle get_vscode_workspaces tool call
  async function handleGetVSCodeWorkspaces(args: unknown) {
    const _ = GetVSCodeWorkspacesSchema.parse(args);
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
  }
  
  // Handle analyze_workspace tool call
  async function handleAnalyzeWorkspace(args: unknown) {
    const { workspacePath, hoursBack } = AnalyzeWorkspaceSchema.parse(args);
    
    // Check if the workspace exists
    if (!fs.existsSync(workspacePath)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Workspace path does not exist: ${workspacePath}`
      );
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
    const filesByType: Record<string, any[]> = {};
    recentFiles.forEach((file: any) => {
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
  }
  
  // Handle get_file_history tool call
  async function handleGetFileHistory(args: unknown) {
    const { filePath } = GetFileHistorySchema.parse(args);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `File does not exist: ${filePath}`
      );
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
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get file info: ${(error as Error).message}`
      );
    }
  }
  
  // Handle analyze_cline_activity tool call
  async function handleAnalyzeCloneActivity(args: unknown) {
    const { hoursBack } = AnalyzeCloneActivitySchema.parse(args);
    
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
      if (recentFiles.length > 0 || (gitInfo.isGitRepo && gitInfo.commits && gitInfo.commits.length > 0)) {
        results.push({
          workspace: workspaceInfo,
          path: workspace,
          gitInfo,
          recentFileCount: recentFiles.length,
          mostRecentFiles: recentFiles.slice(0, 5).map((f: any) => ({
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
  }
  
  // Export the handler functions for use in the MCP server
  return {
    handleGetVSCodeWorkspaces,
    handleAnalyzeWorkspace,
    handleGetFileHistory,
    handleAnalyzeCloneActivity
  };
}
