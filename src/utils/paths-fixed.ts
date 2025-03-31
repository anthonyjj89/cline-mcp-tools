/**
 * Path utility functions for the Claude Task Reader MCP Server
 * Provides platform-specific path resolution and file access with fallback logic
 * Fixed version with improved error handling and diagnostic logging
 */

import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { config, getActiveTasksFallbackPaths } from '../config.js';
import { 
  logError, 
  logWarning, 
  logInfo, 
  logDebug, 
  LogLevel 
} from './diagnostic-logger.js';

/**
 * Get the platform-specific path to the VS Code extension tasks directory
 * @param taskId Optional task ID to check for existence
 * @returns Array containing the absolute path to the VS Code extension tasks directory
 */
export function getVSCodeTasksDirectory(taskId?: string): string[] {
  const homedir = os.homedir();
  logDebug('Getting VS Code tasks directory', { homedir, taskId });
  
  // Define path for standard Cline extension based on platform
  const getPath = () => {
    switch (process.platform) {
      case 'win32':
        const winPath = [
          // Standard Cline path - use path.resolve for absolute path
          path.resolve(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
        ];
        logDebug('Windows tasks paths', winPath);
        return winPath;
      case 'darwin':
        const macPath = [
          // Standard Cline path - use path.resolve for absolute path
          path.resolve(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
        ];
        logDebug('macOS tasks paths', macPath);
        return macPath;
      case 'linux':
        const linuxPath = [
          // Standard Cline path - use path.resolve for absolute path
          path.resolve(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
        ];
        logDebug('Linux tasks paths', linuxPath);
        return linuxPath;
      default:
        const errorMsg = `Unsupported platform: ${process.platform}`;
        logError(errorMsg);
        throw new Error(errorMsg);
    }
  };
  
  const paths = getPath();
  
  // Check if paths exist and log results
  for (const p of paths) {
    const exists = fs.existsSync(p);
    logDebug(`Tasks directory exists check: ${p}`, { exists });
  }
  
  return paths;
}

/**
 * Find a task across all possible paths
 * @param taskId Task ID to find
 * @returns Object containing the task directory and base path, or null if not found
 */
export async function findTaskAcrossPaths(taskId: string): Promise<{ taskDir: string, basePath: string } | null> {
  logDebug(`Finding task across paths: ${taskId}`);
  const allPaths = getVSCodeTasksDirectory();
  
  for (const basePath of allPaths) {
    const taskDir = path.join(basePath, taskId);
    logDebug(`Checking task directory: ${taskDir}`);
    
    try {
      if (await fs.pathExists(taskDir)) {
        logInfo(`Found task directory: ${taskDir}`);
        return { taskDir, basePath };
      }
    } catch (error) {
      logWarning(`Error checking if task directory exists: ${taskDir}`, error);
    }
  }
  
  logWarning(`Task not found in any path: ${taskId}`);
  return null; // Task not found in any path
}

/**
 * Get the appropriate tasks directory for a specific task
 * @param taskId Task ID to find
 * @returns The base path where the task exists, or the first existing path if not found
 */
export async function getTasksDirectoryForTask(taskId: string): Promise<string> {
  logDebug(`Getting tasks directory for task: ${taskId}`);
  const taskLocation = await findTaskAcrossPaths(taskId);
  
  if (taskLocation) {
    logInfo(`Found tasks directory for task: ${taskId} at ${taskLocation.basePath}`);
    return taskLocation.basePath;
  }
  
  // If task not found, return the first existing path
  const allPaths = getVSCodeTasksDirectory();
  
  // Check if any of the paths exist
  for (const p of allPaths) {
    try {
      if (await fs.pathExists(p)) {
        logInfo(`Task ${taskId} not found, using existing path: ${p}`);
        return p;
      }
    } catch (error) {
      logWarning(`Error checking if path exists: ${p}`, error);
    }
  }
  
  // If no paths exist, return the first path and log a warning
  logWarning(`No existing paths found for task: ${taskId}, using first path: ${allPaths[0]}`);
  return allPaths[0];
}

/**
 * Get the absolute path to a task directory
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the task directory
 */
export function getTaskDirectory(tasksDir: string, taskId: string): string {
  const taskDir = path.resolve(tasksDir, taskId);
  logDebug(`Task directory: ${taskDir}`);
  return taskDir;
}

/**
 * Get the absolute path to a task's API conversation history file
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the API conversation history file
 */
export function getApiConversationFilePath(tasksDir: string, taskId: string): string {
  const filePath = path.resolve(tasksDir, taskId, 'api_conversation_history.json');
  logDebug(`API conversation file path: ${filePath}`);
  return filePath;
}

/**
 * Get the absolute path to a task's UI messages file
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the UI messages file
 */
export function getUiMessagesFilePath(tasksDir: string, taskId: string): string {
  const filePath = path.resolve(tasksDir, taskId, 'ui_messages.json');
  logDebug(`UI messages file path: ${filePath}`);
  return filePath;
}

/**
 * Check if a task directory exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the task directory exists, false otherwise
 */
export async function taskExists(tasksDir: string, taskId: string): Promise<boolean> {
  const taskDir = getTaskDirectory(tasksDir, taskId);
  logDebug(`Checking if task directory exists: ${taskDir}`);
  
  try {
    const exists = await fs.pathExists(taskDir);
    logDebug(`Task directory exists: ${exists}`);
    return exists;
  } catch (error) {
    logWarning(`Error checking if task directory exists: ${taskDir}`, error);
    return false;
  }
}

/**
 * Check if a task's API conversation history file exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the API conversation history file exists, false otherwise
 */
export async function apiConversationFileExists(tasksDir: string, taskId: string): Promise<boolean> {
  const filePath = getApiConversationFilePath(tasksDir, taskId);
  logDebug(`Checking if API conversation file exists: ${filePath}`);
  
  try {
    const exists = await fs.pathExists(filePath);
    logDebug(`API conversation file exists: ${exists}`);
    return exists;
  } catch (error) {
    logWarning(`Error checking if API conversation file exists: ${filePath}`, error);
    return false;
  }
}

/**
 * Check if a task's UI messages file exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the UI messages file exists, false otherwise
 */
export async function uiMessagesFileExists(tasksDir: string, taskId: string): Promise<boolean> {
  const filePath = getUiMessagesFilePath(tasksDir, taskId);
  logDebug(`Checking if UI messages file exists: ${filePath}`);
  
  try {
    const exists = await fs.pathExists(filePath);
    logDebug(`UI messages file exists: ${exists}`);
    return exists;
  } catch (error) {
    logWarning(`Error checking if UI messages file exists: ${filePath}`, error);
    return false;
  }
}

/**
 * Format file size in human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get the platform-specific path to the VS Code extension crash reports directory
 * @returns Array containing the absolute path to the VS Code extension crash reports directory
 */
export function getCrashReportsDirectories(): string[] {
  const homedir = os.homedir();
  logDebug('Getting crash reports directories', { homedir });
  
  // Define path for standard Cline extension based on platform
  const getPath = () => {
    switch (process.platform) {
      case 'win32':
        const winPath = [
          // Standard Cline path - use path.resolve for absolute path
          path.resolve(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
        ];
        logDebug('Windows crash reports paths', winPath);
        return winPath;
      case 'darwin':
        const macPath = [
          // Standard Cline path - use path.resolve for absolute path
          path.resolve(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
        ];
        logDebug('macOS crash reports paths', macPath);
        return macPath;
      case 'linux':
        const linuxPath = [
          // Standard Cline path - use path.resolve for absolute path
          path.resolve(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
        ];
        logDebug('Linux crash reports paths', linuxPath);
        return linuxPath;
      default:
        const errorMsg = `Unsupported platform: ${process.platform}`;
        logError(errorMsg);
        throw new Error(errorMsg);
    }
  };
  
  const paths = getPath();
  
  // Check if paths exist and log results
  for (const p of paths) {
    const exists = fs.existsSync(p);
    logDebug(`Crash reports directory exists check: ${p}`, { exists });
  }
  
  return paths;
}

/**
 * Get the appropriate crash reports directory
 * @returns The crash reports directory path
 */
export function getCrashReportsDirectory(): string {
  const dirs = getCrashReportsDirectories();
  logDebug(`Using crash reports directory: ${dirs[0]}`);
  return dirs[0];
}

/**
 * Get the dismissed crash reports directory
 * @returns The dismissed crash reports directory path
 */
export function getDismissedCrashReportsDirectory(): string {
  const dir = path.resolve(getCrashReportsDirectory(), 'Dismissed');
  logDebug(`Dismissed crash reports directory: ${dir}`);
  return dir;
}

/**
 * Check if a path is within the standard Cline extension
 * @param dirPath Directory path to check
 * @returns True if the path is within the standard Cline extension, false otherwise
 */
export function isStandardClineExtensionPath(dirPath: string): boolean {
  const isStandard = dirPath.includes('saoudrizwan.claude-dev');
  logDebug(`Checking if path is standard Cline extension: ${dirPath}`, { isStandard });
  return isStandard;
}

/**
 * Read the active tasks file with fallback paths
 * @returns Promise resolving to the active tasks data
 */
export async function getActiveTasksData(): Promise<{ 
  activeTasks: Array<{
    id: string;
    label: string;
    lastActivated: number;
    source?: string;
    extensionType?: string;
  }> 
}> {
  logInfo('Getting active tasks data');
  
  // Get all fallback paths
  const fallbackPaths = getActiveTasksFallbackPaths();
  
  // Try each path in order
  for (const activeTasksPath of fallbackPaths) {
    logDebug(`Trying active tasks path: ${activeTasksPath}`);
    
    try {
      // Check if file exists
      const exists = await fs.pathExists(activeTasksPath);
      logDebug(`Active tasks file exists at ${activeTasksPath}: ${exists}`);
      
      if (exists) {
        // Read the file
        const content = await fs.readFile(activeTasksPath, 'utf8');
        logDebug(`Read active tasks file: ${activeTasksPath}`, { size: content.length });
        
        // Log truncated content for debugging
        const truncated = content.length > 200 
          ? content.substring(0, 200) + '... [truncated]' 
          : content;
        logDebug(`File content (truncated): ${truncated}`);
        
        try {
          // Parse the JSON
          const parsed = JSON.parse(content);
          logInfo(`Successfully parsed active tasks JSON from ${activeTasksPath}`);
          logDebug(`Active tasks count: ${parsed.activeTasks?.length || 0}`);
          
          if (parsed.activeTasks && parsed.activeTasks.length > 0) {
            logDebug(`First active task: ${JSON.stringify(parsed.activeTasks[0])}`);
          }
          
          return parsed;
        } catch (parseError) {
          logWarning(`Error parsing active tasks JSON from ${activeTasksPath}`, parseError);
        }
      }
    } catch (error) {
      logWarning(`Error reading active tasks file: ${activeTasksPath}`, error);
    }
  }
  
  // If all paths fail, return empty array
  logWarning('No active tasks found in any location');
  return { activeTasks: [] };
}

/**
 * Get active task by ID or label
 * @param taskId Optional task ID to find
 * @param label Optional label (A, B, C, D) to find
 * @returns The active task if found, undefined otherwise
 */
export async function getActiveTask(taskId?: string, label?: string): Promise<{
  id: string;
  label: string;
  lastActivated: number;
  source?: string;
  extensionType?: string;
} | undefined> {
  logDebug('Getting active task', { taskId, label });
  
  const activeTasksData = await getActiveTasksData();
  
  if (!activeTasksData.activeTasks || activeTasksData.activeTasks.length === 0) {
    logWarning('No active tasks found');
    return undefined;
  }
  
  // If taskId is provided, find by ID
  if (taskId) {
    const task = activeTasksData.activeTasks.find(task => task.id === taskId);
    if (task) {
      logInfo(`Found active task by ID: ${taskId}`, task);
    } else {
      logWarning(`Active task not found by ID: ${taskId}`);
    }
    return task;
  }
  
  // If label is provided, find by label
  if (label) {
    const task = activeTasksData.activeTasks.find(task => task.label === label);
    if (task) {
      logInfo(`Found active task by label: ${label}`, task);
    } else {
      logWarning(`Active task not found by label: ${label}`);
    }
    return task;
  }
  
  // If neither is provided, return the most recently activated task
  const sortedTasks = [...activeTasksData.activeTasks].sort((a, b) => b.lastActivated - a.lastActivated);
  const task = sortedTasks[0];
  logInfo('Found most recently activated task', task);
  return task;
}

/**
 * Ensure the crash reports directories exist
 * @returns Object containing the created directories
 */
export async function ensureCrashReportsDirectories(): Promise<{ 
  crashReportsDir: string; 
  dismissedDir: string; 
  created: boolean;
}> {
  logDebug('Ensuring crash reports directories exist');
  
  const crashReportsDir = getCrashReportsDirectory();
  const dismissedDir = getDismissedCrashReportsDirectory();
  
  let created = false;
  
  // Create the directories if they don't exist
  try {
    if (!await fs.pathExists(crashReportsDir)) {
      logInfo(`Creating crash reports directory: ${crashReportsDir}`);
      await fs.mkdirp(crashReportsDir);
      created = true;
    }
    
    if (!await fs.pathExists(dismissedDir)) {
      logInfo(`Creating dismissed crash reports directory: ${dismissedDir}`);
      await fs.mkdirp(dismissedDir);
      created = true;
    }
  } catch (error) {
    logError('Error creating crash reports directories', error);
    throw error;
  }
  
  return { crashReportsDir, dismissedDir, created };
}
