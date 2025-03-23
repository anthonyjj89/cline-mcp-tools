/**
 * VS Code Tracker - Utility for tracking VS Code workspaces and modified files
 * Part of the Cline Chat Reader MCP Server
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * Get list of recently opened VS Code workspaces using multiple detection methods
 * @returns {Array} List of workspace paths
 */
export function getVSCodeWorkspaces() {
  // Combine results from all methods
  const fromStorage = getWorkspacesFromStorageFiles();
  const fromProcesses = getRunningVSCodeWorkspaces();
  const fromWindowTitles = getVSCodeWindowTitles();
  const fromRecentFiles = getRecentlyOpenedFile();
  
  // Combine and deduplicate
  const allWorkspaces = [...fromStorage, ...fromProcesses, ...fromWindowTitles, ...fromRecentFiles];
  const uniqueWorkspaces = [...new Set(allWorkspaces)];
  
  // Filter only existing paths and decode URI components if needed
  return uniqueWorkspaces
    .map(w => {
      try {
        // Handle file:// URIs
        if (w.startsWith('file://')) {
          return decodeURIComponent(w.substring(7));
        }
        return w;
      } catch (e) {
        return w;
      }
    })
    .filter(w => {
      try {
        return fs.existsSync(w);
      } catch (e) {
        return false;
      }
    });
}

/**
 * Get workspaces from VS Code storage.json files
 * @returns {Array} List of workspace paths
 */
function getWorkspacesFromStorageFiles() {
  const workspaces = [];
  
  // Check multiple possible storage file locations based on OS
  const possibleStorageLocations = [];
  
  if (process.platform === 'darwin') {
    // macOS
    possibleStorageLocations.push(
      path.join(os.homedir(), 'Library/Application Support/Code/storage.json'),
      path.join(os.homedir(), 'Library/Application Support/Code - Insiders/storage.json'),
      path.join(os.homedir(), 'Library/Application Support/Code - OSS/storage.json'),
      path.join(os.homedir(), 'Library/Application Support/VSCodium/storage.json')
    );
  } else if (process.platform === 'win32') {
    // Windows
    possibleStorageLocations.push(
      path.join(os.homedir(), 'AppData/Roaming/Code/storage.json'),
      path.join(os.homedir(), 'AppData/Roaming/Code - Insiders/storage.json'),
      path.join(os.homedir(), 'AppData/Roaming/Code - OSS/storage.json'),
      path.join(os.homedir(), 'AppData/Roaming/VSCodium/storage.json')
    );
  } else {
    // Linux and others
    possibleStorageLocations.push(
      path.join(os.homedir(), '.config/Code/storage.json'),
      path.join(os.homedir(), '.config/Code - Insiders/storage.json'),
      path.join(os.homedir(), '.config/Code - OSS/storage.json'),
      path.join(os.homedir(), '.config/VSCodium/storage.json')
    );
  }
  
  // Try each possible storage location
  for (const storageFile of possibleStorageLocations) {
    try {
      if (fs.existsSync(storageFile)) {
        const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
        // Extract workspace paths
        const storageWorkspaces = data.openedPathsList?.workspaces3 || [];
        workspaces.push(...storageWorkspaces);
      }
    } catch (error) {
      console.error(`Error reading VS Code storage file ${storageFile}:`, error);
    }
  }
  
  return workspaces;
}

/**
 * Get workspaces from running VS Code processes
 * @returns {Array} List of workspace paths
 */
function getRunningVSCodeWorkspaces() {
  try {
    let psCommand;
    let grepCommand;
    
    if (process.platform === 'darwin') {
      // macOS
      psCommand = 'ps aux';
      grepCommand = 'grep -i "Visual Studio Code.app/Contents/MacOS/Electron" | grep -v grep';
    } else if (process.platform === 'win32') {
      // Windows - not implemented
      return [];
    } else {
      // Linux
      psCommand = 'ps aux';
      grepCommand = 'grep -i "/usr/share/code/code" | grep -v grep';
    }
    
    // Get all VS Code processes
    const psOutput = execSync(`${psCommand} | ${grepCommand}`).toString();
    
    // Extract workspace paths from command line arguments
    const workspaces = [];
    const lines = psOutput.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Look for folder path arguments (--folder-uri or just file paths)
      const folderUriMatch = line.match(/--folder-uri=file:\/\/([^\s]+)/);
      if (folderUriMatch && folderUriMatch[1]) {
        const workspacePath = decodeURIComponent(folderUriMatch[1]);
        workspaces.push(workspacePath);
        continue;
      }
      
      // Look for workspace arguments
      const workspaceMatch = line.match(/--file-uri=file:\/\/([^\s]+\.code-workspace)/);
      if (workspaceMatch && workspaceMatch[1]) {
        const workspacePath = decodeURIComponent(workspaceMatch[1]);
        workspaces.push(workspacePath);
      }
    }
    
    return workspaces;
  } catch (error) {
    // This is expected to fail on some systems, so we'll just log it at debug level
    console.debug('Error detecting running VS Code instances:', error);
    return [];
  }
}

/**
 * Get VS Code window titles using AppleScript (macOS only)
 * @returns {Array} List of workspace paths extracted from window titles
 */
function getVSCodeWindowTitles() {
  if (process.platform !== 'darwin') {
    return []; // Only supported on macOS
  }
  
  try {
    const script = `
      tell application "System Events"
        set appList to application processes where name contains "Code"
        set windowTitles to {}
        repeat with appProcess in appList
          set windowTitles to windowTitles & (name of windows of appProcess)
        end repeat
        return windowTitles
      end tell
    `;
    
    const result = execSync(`osascript -e '${script}'`).toString();
    
    // Extract workspace paths from window titles
    // Format is typically: "filename - workspace - Visual Studio Code"
    const workspaces = [];
    const titles = result.split(', ');
    
    for (const title of titles) {
      const parts = title.split(' - ');
      if (parts.length >= 2) {
        // The workspace name is usually the second-to-last part
        const workspaceName = parts[parts.length - 2];
        
        // Try to find this workspace in the home directory
        const possiblePaths = [
          path.join(os.homedir(), workspaceName),
          path.join(os.homedir(), 'Documents', workspaceName),
          path.join(os.homedir(), 'Projects', workspaceName),
          path.join(os.homedir(), 'Development', workspaceName),
          path.join(os.homedir(), 'dev', workspaceName)
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            workspaces.push(possiblePath);
            break;
          }
        }
      }
    }
    
    return workspaces;
  } catch (error) {
    console.debug('Error getting VS Code window titles:', error);
    return [];
  }
}

/**
 * Get workspaces from recently opened files
 * @returns {Array} List of workspace paths
 */
function getRecentlyOpenedFile() {
  const workspaces = [];
  
  // Check multiple possible locations based on OS
  const possibleLocations = [];
  
  if (process.platform === 'darwin') {
    // macOS
    possibleLocations.push(
      path.join(os.homedir(), 'Library/Application Support/Code/User/globalState/workspaces.json'),
      path.join(os.homedir(), 'Library/Application Support/Code - Insiders/User/globalState/workspaces.json'),
      path.join(os.homedir(), 'Library/Application Support/Code - OSS/User/globalState/workspaces.json'),
      path.join(os.homedir(), 'Library/Application Support/VSCodium/User/globalState/workspaces.json')
    );
  } else if (process.platform === 'win32') {
    // Windows
    possibleLocations.push(
      path.join(os.homedir(), 'AppData/Roaming/Code/User/globalState/workspaces.json'),
      path.join(os.homedir(), 'AppData/Roaming/Code - Insiders/User/globalState/workspaces.json'),
      path.join(os.homedir(), 'AppData/Roaming/Code - OSS/User/globalState/workspaces.json'),
      path.join(os.homedir(), 'AppData/Roaming/VSCodium/User/globalState/workspaces.json')
    );
  } else {
    // Linux and others
    possibleLocations.push(
      path.join(os.homedir(), '.config/Code/User/globalState/workspaces.json'),
      path.join(os.homedir(), '.config/Code - Insiders/User/globalState/workspaces.json'),
      path.join(os.homedir(), '.config/Code - OSS/User/globalState/workspaces.json'),
      path.join(os.homedir(), '.config/VSCodium/User/globalState/workspaces.json')
    );
  }
  
  // Try each possible location
  for (const location of possibleLocations) {
    try {
      if (fs.existsSync(location)) {
        const data = JSON.parse(fs.readFileSync(location, 'utf8'));
        
        if (data.entries && Array.isArray(data.entries)) {
          for (const entry of data.entries) {
            if (entry.folderUri) {
              workspaces.push(entry.folderUri.replace('file://', ''));
            } else if (entry.workspaceUri) {
              workspaces.push(entry.workspaceUri.replace('file://', ''));
            }
          }
        }
      }
    } catch (error) {
      console.debug(`Error reading recently opened file ${location}:`, error);
    }
  }
  
  return workspaces;
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
