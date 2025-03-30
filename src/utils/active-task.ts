/**
 * Active task utilities with caching for the Cline Chat Reader MCP Server
 * Fixed version with improved error handling and detailed logging
 */

import { config } from '../config.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as pathUtils from './paths.js';

// Cache for active tasks data
const activeTaskCache = new Map<string, any>();
const CACHE_EXPIRY_MS = 30000; // 30 seconds

/**
 * Error codes for active task operations
 */
export enum ActiveTaskErrorCode {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  INVALID_PARAMS = 'INVALID_PARAMS'
}

/**
 * Log levels for controlling verbosity
 */
export enum LogLevel {
  ERROR = 0,
  WARNING = 1,
  INFO = 2,
  DEBUG = 3
}

// Current log level - change this to control verbosity
// Default to INFO in production, can be overridden
let CURRENT_LOG_LEVEL = LogLevel.INFO;

/**
 * Set the current log level
 * @param level New log level
 */
export function setLogLevel(level: LogLevel): void {
  CURRENT_LOG_LEVEL = level;
}

/**
 * Get the current log level
 * @returns Current log level
 */
export function getLogLevel(): LogLevel {
  return CURRENT_LOG_LEVEL;
}

/**
 * Format context for logging
 * @param context Context object
 * @returns Formatted context string or empty string
 */
function formatContext(context?: any): string {
  if (!context) return '';
  
  try {
    // For objects, stringify with truncation
    if (typeof context === 'object') {
      // Handle Error objects specially
      if (context instanceof Error) {
        return ` ${context.name}: ${context.message}${context.stack ? `\n${context.stack}` : ''}`;
      }
      
      const json = JSON.stringify(context);
      if (json.length > 200) {
        return ` ${json.substring(0, 200)}... [truncated]`;
      }
      return ` ${json}`;
    }
    
    // For other types, convert to string
    return ` ${String(context)}`;
  } catch (error) {
    return ` [Error formatting context: ${error}]`;
  }
}

/**
 * Log error with code and context
 * @param code Error code
 * @param message Error message
 * @param context Optional context information
 */
export function logError(code: string, message: string, context?: any) {
  if (CURRENT_LOG_LEVEL >= LogLevel.ERROR) {
    console.error(`ERROR [${code}]: ${message}${formatContext(context)}`);
  }
}

/**
 * Log warning message
 * @param message Warning message
 * @param context Optional context information
 */
export function logWarning(message: string, context?: any) {
  if (CURRENT_LOG_LEVEL >= LogLevel.WARNING) {
    console.error(`WARN: ${message}${formatContext(context)}`);
  }
}

/**
 * Log info message
 * @param message Info message
 * @param context Optional context information
 */
export function logInfo(message: string, context?: any) {
  if (CURRENT_LOG_LEVEL >= LogLevel.INFO) {
    console.error(`INFO: ${message}${formatContext(context)}`);
  }
}

/**
 * Log debug message
 * @param message Debug message
 * @param context Optional context information
 */
export function logDebug(message: string, context?: any) {
  if (CURRENT_LOG_LEVEL >= LogLevel.DEBUG) {
    console.error(`DEBUG: ${message}${formatContext(context)}`);
  }
}

/**
 * Get cached active tasks data if available and not expired
 * @returns Cached active tasks data or null if not available
 */
function getCachedActiveTasksData(): { activeTasks: Array<any> } | null {
  const cached = activeTaskCache.get('activeTasks');
  
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    return cached.data;
  }
  
  return null;
}

/**
 * Cache active tasks data
 * @param data Active tasks data to cache
 */
function cacheActiveTasksData(data: { activeTasks: Array<any> }): void {
  activeTaskCache.set('activeTasks', {
    data,
    timestamp: Date.now()
  });
}

/**
 * Get cached active task by ID if available and not expired
 * @param taskId Task ID
 * @returns Cached active task or null if not available
 */
function getCachedActiveTask(taskId: string): any | null {
  const cached = activeTaskCache.get(`task:${taskId}`);
  
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    return cached.data;
  }
  
  return null;
}

/**
 * Cache active task
 * @param taskId Task ID
 * @param data Active task data to cache
 */
function cacheActiveTask(taskId: string, data: any): void {
  activeTaskCache.set(`task:${taskId}`, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Clear active task cache
 */
export function clearActiveTaskCache(): void {
  activeTaskCache.clear();
  logInfo('Active task cache cleared');
}

/**
 * Check if active tasks file exists and is readable
 * @returns Promise resolving to true if the file exists and is readable, false otherwise
 */
export async function checkActiveTasksFile(): Promise<boolean> {
  try {
    // Log the path we're checking
    logDebug(`Checking active tasks file at: ${config.paths.activeTasksFile}`);
    
    // Check if file exists and is readable
    try {
      // Use fs-extra's pathExists
      const exists = await fs.pathExists(config.paths.activeTasksFile);
      if (!exists) {
        logError(ActiveTaskErrorCode.FILE_READ_ERROR, `Active tasks file does not exist: ${config.paths.activeTasksFile}`);
        return false;
      }
      
      // Try to read the file to confirm it's readable
      try {
        // Use fs.readFileSync from Node.js core fs module
        const nodeFs = await import('fs');
        nodeFs.readFileSync(config.paths.activeTasksFile, { encoding: 'utf8' });
        // If we get here, the file is readable
      } catch (readError) {
        logError(ActiveTaskErrorCode.FILE_READ_ERROR, `Active tasks file exists but is not readable: ${config.paths.activeTasksFile}`, readError);
        return false;
      }
    } catch (error) {
      logError(ActiveTaskErrorCode.FILE_READ_ERROR, `Error checking if active tasks file is readable: ${config.paths.activeTasksFile}`, error);
      return false;
    }
    
    // Check file stats
    try {
      const stats = await fs.stat(config.paths.activeTasksFile);
      logDebug(`Active tasks file stats: size=${stats.size}, mtime=${stats.mtime}`);
      
      if (stats.size === 0) {
        logError(ActiveTaskErrorCode.FILE_READ_ERROR, `Active tasks file is empty: ${config.paths.activeTasksFile}`);
        return false;
      }
    } catch (error) {
      logError(ActiveTaskErrorCode.FILE_READ_ERROR, `Error getting active tasks file stats: ${config.paths.activeTasksFile}`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    logError(ActiveTaskErrorCode.FILE_READ_ERROR, `Error checking active tasks file: ${config.paths.activeTasksFile}`, error);
    return false;
  }
}

/**
 * Get active tasks data with caching
 * @returns Promise resolving to active tasks data
 */
export async function getActiveTasksDataWithCache(): Promise<{ 
  activeTasks: Array<{
    id: string;
    label: string;
    lastActivated: number;
    source?: string;
    extensionType?: string;
  }> 
}> {
  try {
    // Check cache first
    const cachedData = getCachedActiveTasksData();
    if (cachedData) {
      logDebug('Using cached active tasks data');
      return cachedData;
    }
    
    // Check if file exists and is readable
    const isFileValid = await checkActiveTasksFile();
    if (!isFileValid) {
      return { activeTasks: [] };
    }
    
    // Read from file if not in cache
    try {
      logDebug(`Reading active tasks file: ${config.paths.activeTasksFile}`);
      const content = await fs.readFile(config.paths.activeTasksFile, 'utf8');
      
      if (!content || content.trim() === '') {
        logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Active tasks file is empty');
        return { activeTasks: [] };
      }
      
      logDebug(`Active tasks file content length: ${content.length}`);
      
      // Try to parse the JSON
      try {
        const data = JSON.parse(content);
        
        // Validate the data structure
        if (!data || typeof data !== 'object') {
          logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Invalid active tasks data: not an object');
          return { activeTasks: [] };
        }
        
        if (!data.activeTasks || !Array.isArray(data.activeTasks)) {
          logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Invalid active tasks data: activeTasks is not an array');
          return { activeTasks: [] };
        }
        
        // Cache the data
        cacheActiveTasksData(data);
        
        logInfo(`Found ${data.activeTasks.length} active tasks`);
        return data;
      } catch (error) {
        logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error parsing active tasks JSON', error);
        
        // Log the first 100 characters of the content to help debug
        if (content.length > 0) {
          logDebug(`First 100 chars of content: ${content.substring(0, 100)}...`);
        }
        
        return { activeTasks: [] };
      }
    } catch (error) {
      logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error reading active tasks file', error);
      return { activeTasks: [] };
    }
  } catch (error) {
    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Unexpected error in getActiveTasksDataWithCache', error);
    return { activeTasks: [] };
  }
}

/**
 * Get active task by ID or label with caching
 * @param taskIdOrLabel Task ID or label (A, B)
 * @returns Promise resolving to active task or undefined if not found
 */
export async function getActiveTaskWithCache(taskIdOrLabel?: string): Promise<{
  id: string;
  label: string;
  lastActivated: number;
  source?: string;
  extensionType?: string;
} | undefined> {
  try {
    // Handle special cases for ACTIVE_A and ACTIVE_B
    if (taskIdOrLabel === 'ACTIVE_A' || taskIdOrLabel === 'ACTIVE_B') {
      const label = taskIdOrLabel === 'ACTIVE_A' ? 'A' : 'B';
      
      // Check cache first for the label
      const cachedData = getCachedActiveTasksData();
      if (cachedData && cachedData.activeTasks) {
        const task = cachedData.activeTasks.find(t => t.label === label);
        if (task) {
          return task;
        }
      }
      
      // If not in cache, get from file
      const activeTasksData = await getActiveTasksDataWithCache();
      return activeTasksData.activeTasks.find(task => task.label === label);
    }
    
    // If taskIdOrLabel is a specific task ID
    if (taskIdOrLabel) {
      // Check cache first for the task ID
      const cachedTask = getCachedActiveTask(taskIdOrLabel);
      if (cachedTask) {
        return cachedTask;
      }
      
      // If not in cache, check if it's an active task
      const activeTasksData = await getActiveTasksDataWithCache();
      const task = activeTasksData.activeTasks.find(t => t.id === taskIdOrLabel);
      
      if (task) {
        // Cache the task
        cacheActiveTask(taskIdOrLabel, task);
        return task;
      }
      
      // If not an active task, return undefined
      return undefined;
    }
    
    // If no taskIdOrLabel provided, return the first active task (prioritize A then B)
    const activeTasksData = await getActiveTasksDataWithCache();
    
    if (activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      // Prioritize A, then B
      const task = activeTasksData.activeTasks.find(t => t.label === 'A') || 
                  activeTasksData.activeTasks.find(t => t.label === 'B') ||
                  activeTasksData.activeTasks[0];
      
      return task;
    }
  } catch (error) {
    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error getting active task', error);
  }
  
  // Return undefined if no active tasks found or error occurs
  return undefined;
}

/**
 * Get all active tasks with caching
 * @param label Optional label to filter by
 * @returns Promise resolving to array of active tasks
 */
export async function getAllActiveTasksWithCache(label?: string): Promise<Array<{
  id: string;
  label: string;
  lastActivated: number;
  source?: string;
  extensionType?: string;
}>> {
  try {
    const activeTasksData = await getActiveTasksDataWithCache();
    
    if (!activeTasksData.activeTasks || activeTasksData.activeTasks.length === 0) {
      return [];
    }
    
    // Filter by label if provided
    if (label) {
      return activeTasksData.activeTasks.filter(task => task.label === label);
    }
    
    // Return all active tasks
    return activeTasksData.activeTasks;
  } catch (error) {
    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error getting all active tasks', error);
    return [];
  }
}

/**
 * Get the VS Code tasks directory for a specific task
 * @param taskId Task ID
 * @returns Promise resolving to the tasks directory path
 */
export async function getTasksDirectoryForTask(taskId: string): Promise<string> {
  try {
    // Use the path utilities to find the task across all possible paths
    const taskLocation = await pathUtils.findTaskAcrossPaths(taskId);
    
    if (taskLocation) {
      return taskLocation.basePath;
    }
    
    // If task not found, throw an error
    throw new Error(`Task directory not found for task ID: ${taskId}`);
  } catch (error) {
    logError(ActiveTaskErrorCode.TASK_NOT_FOUND, `Task directory not found for task ID: ${taskId}`, error);
    throw error;
  }
}

/**
 * Check if a task exists
 * @param taskId Task ID
 * @returns Promise resolving to true if the task exists, false otherwise
 */
export async function validateTaskExists(taskId: string): Promise<boolean> {
  try {
    // Use the path utilities to find the task across all possible paths
    const taskLocation = await pathUtils.findTaskAcrossPaths(taskId);
    return !!taskLocation;
  } catch (error) {
    logError(ActiveTaskErrorCode.TASK_NOT_FOUND, `Error validating task existence: ${taskId}`, error);
    return false;
  }
}

/**
 * Get the API conversation file path for a task
 * @param taskId Task ID
 * @returns Promise resolving to the API conversation file path
 */
export async function getApiConversationFilePath(taskId: string): Promise<string> {
  try {
    // Use the path utilities to find the task across all possible paths
    const taskLocation = await pathUtils.findTaskAcrossPaths(taskId);
    
    if (taskLocation) {
      return pathUtils.getApiConversationFilePath(taskLocation.basePath, taskId);
    }
    
    // If task not found, throw an error
    throw new Error(`Task not found for API conversation file: ${taskId}`);
  } catch (error) {
    logError(ActiveTaskErrorCode.TASK_NOT_FOUND, `Error getting API conversation file path: ${taskId}`, error);
    throw error;
  }
}

/**
 * Write advice to a task
 * @param taskId Target task ID
 * @param advice Advice object
 */
export async function writeAdviceToTask(taskId: string, advice: any): Promise<void> {
  try {
    // Use the path utilities to find the task across all possible paths
    const taskLocation = await pathUtils.findTaskAcrossPaths(taskId);
    
    if (!taskLocation) {
      throw new Error(`Task not found for writing advice: ${taskId}`);
    }
    
    const taskDir = pathUtils.getTaskDirectory(taskLocation.basePath, taskId);
    const adviceDir = path.join(taskDir, 'external-advice');
    
    // Create advice directory if it doesn't exist
    await fs.mkdirp(adviceDir);
    
    // Create dismissed directory if it doesn't exist
    const dismissedDir = path.join(adviceDir, 'Dismissed');
    await fs.mkdirp(dismissedDir);
    
    // Write advice to file
    const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
    await fs.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
    
    logInfo(`Advice written to ${adviceFilePath}`);
  } catch (error) {
    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error writing advice to task', error);
    throw error;
  }
}
