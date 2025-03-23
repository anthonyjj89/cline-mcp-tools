/**
 * VS Code Tracker - Utility for tracking VS Code workspaces and modified files
 * Part of the Cline Chat Reader MCP Server
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Get list of recently opened VS Code workspaces
 * @returns {Array} List of workspace paths
 */
export function getVSCodeWorkspaces() {
  // Determine OS-specific VS Code storage path
  let storageFile;
  
  if (process.platform === 'darwin') {
    // macOS
    storageFile = path.join(os.homedir(), 'Library/Application Support/Code/storage.json');
  } else if (process.platform === 'win32') {
    // Windows
    storageFile = path.join(os.homedir(), 'AppData/Roaming/Code/storage.json');
  } else {
    // Linux and others
    storageFile = path.join(os.homedir(), '.config/Code/storage.json');
  }
  
  try {
    if (fs.existsSync(storageFile)) {
      const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      // Extract workspace paths
      const workspaces = data.openedPathsList?.workspaces3 || [];
      return workspaces.filter(w => fs.existsSync(w)); // Filter only existing paths
    }
    return [];
  } catch (error) {
    console.error('Error reading VS Code storage:', error);
    return [];
  }
}

/**
 * Get recently modified files in a directory
 * @param {string} dirPath - Directory to scan
 * @param {number} hoursBack - How many hours back to look
 * @returns {Array} List of recently modified files
 */
export function getRecentlyModifiedFiles(dirPath, hoursBack = 24) {
  const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
  const results = [];
  
  // Skip these directories to avoid unnecessary scanning
  const ignoreDirs = ['.git', 'node_modules', 'dist', 'build', '.vscode'];
  
  function scan(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        if (ignoreDirs.includes(file)) continue;
        
        const filePath = path.join(dir, file);
        
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            scan(filePath); // Recursively scan subdirectories
          } else if (stats.isFile() && stats.mtimeMs > cutoffTime) {
            // Only add files modified within the time window
            results.push({
              path: filePath,
              lastModified: stats.mtime,
              size: stats.size,
              extension: path.extname(filePath).toLowerCase()
            });
          }
        } catch (err) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (err) {
      // Skip directories we can't access
      console.warn(`Could not access directory: ${dir}`, err.message);
    }
  }
  
  scan(dirPath);
  
  // Sort by last modified (newest first)
  return results.sort((a, b) => b.lastModified - a.lastModified);
}
