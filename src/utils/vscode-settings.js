/**
 * VS Code Settings Parser - Utility for parsing VS Code settings
 * Part of the Cline Chat Reader MCP Server
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Get VS Code workspace settings
 * @param {string} workspacePath - Path to workspace
 * @returns {Object} Workspace settings
 */
export function getWorkspaceSettings(workspacePath) {
  const settingsPath = path.join(workspacePath, '.vscode', 'settings.json');
  
  try {
    if (fs.existsSync(settingsPath)) {
      return {
        hasSettings: true,
        settings: JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      };
    }
    return { hasSettings: false };
  } catch (error) {
    console.error('Error reading workspace settings:', error);
    return { 
      hasSettings: false,
      error: error.message 
    };
  }
}

/**
 * Get VS Code workspace file information
 * @param {string} workspacePath - Path to workspace
 * @returns {Object} Workspace file information
 */
export function getWorkspaceInfo(workspacePath) {
  try {
    // Look for .code-workspace files
    const files = fs.readdirSync(workspacePath);
    const workspaceFile = files.find(file => file.endsWith('.code-workspace'));
    
    if (workspaceFile) {
      const workspaceFilePath = path.join(workspacePath, workspaceFile);
      try {
        const workspaceData = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf8'));
        return {
          hasWorkspaceFile: true,
          name: path.basename(workspaceFile, '.code-workspace'),
          folders: workspaceData.folders || [],
          settings: workspaceData.settings || {}
        };
      } catch (error) {
        console.error('Error reading workspace file:', error);
      }
    }
    
    // If no workspace file found or error reading it, return basic info
    return {
      hasWorkspaceFile: false,
      name: path.basename(workspacePath)
    };
  } catch (error) {
    console.error('Error getting workspace info:', error);
    return {
      hasWorkspaceFile: false,
      name: path.basename(workspacePath),
      error: error.message
    };
  }
}

/**
 * Get VS Code launch configurations
 * @param {string} workspacePath - Path to workspace
 * @returns {Object} Launch configurations
 */
export function getLaunchConfigurations(workspacePath) {
  const launchPath = path.join(workspacePath, '.vscode', 'launch.json');
  
  try {
    if (fs.existsSync(launchPath)) {
      const launchData = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
      return {
        hasLaunchConfig: true,
        configurations: launchData.configurations || []
      };
    }
    return { hasLaunchConfig: false };
  } catch (error) {
    console.error('Error reading launch configurations:', error);
    return { 
      hasLaunchConfig: false,
      error: error.message 
    };
  }
}

/**
 * Get VS Code extensions recommended for the workspace
 * @param {string} workspacePath - Path to workspace
 * @returns {Object} Recommended extensions
 */
export function getRecommendedExtensions(workspacePath) {
  const extensionsPath = path.join(workspacePath, '.vscode', 'extensions.json');
  
  try {
    if (fs.existsSync(extensionsPath)) {
      const extensionsData = JSON.parse(fs.readFileSync(extensionsPath, 'utf8'));
      return {
        hasRecommendations: true,
        recommendations: extensionsData.recommendations || [],
        unwantedRecommendations: extensionsData.unwantedRecommendations || []
      };
    }
    return { hasRecommendations: false };
  } catch (error) {
    console.error('Error reading recommended extensions:', error);
    return { 
      hasRecommendations: false,
      error: error.message 
    };
  }
}
