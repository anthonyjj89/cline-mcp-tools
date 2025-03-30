/**
 * Path utility functions for the Claude Task Reader MCP Server
 * Provides platform-specific path resolution and file access
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { config } from '../config.js';
/**
 * Get the platform-specific path to the VS Code extension tasks directory
 * @param taskId Optional task ID to check for existence
 * @returns Array containing the absolute path to the VS Code extension tasks directory
 */
export function getVSCodeTasksDirectory(taskId) {
    const homedir = os.homedir();
    // Define path for standard Cline extension based on platform
    const getPath = () => {
        switch (process.platform) {
            case 'win32':
                return [
                    // Standard Cline path
                    path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
                ];
            case 'darwin':
                return [
                    // Standard Cline path
                    path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
                ];
            case 'linux':
                return [
                    // Standard Cline path
                    path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
                ];
            default:
                throw new Error(`Unsupported platform: ${process.platform}`);
        }
    };
    return getPath();
}
/**
 * Find a task across all possible paths
 * @param taskId Task ID to find
 * @returns Object containing the task directory and base path, or null if not found
 */
export async function findTaskAcrossPaths(taskId) {
    const allPaths = getVSCodeTasksDirectory();
    for (const basePath of allPaths) {
        const taskDir = path.join(basePath, taskId);
        if (await fs.pathExists(taskDir)) {
            return { taskDir, basePath };
        }
    }
    return null; // Task not found in any path
}
/**
 * Get the appropriate tasks directory for a specific task
 * @param taskId Task ID to find
 * @returns The base path where the task exists, or the first existing path if not found
 */
export async function getTasksDirectoryForTask(taskId) {
    const taskLocation = await findTaskAcrossPaths(taskId);
    if (taskLocation) {
        return taskLocation.basePath;
    }
    // If task not found, return the first existing path
    const allPaths = getVSCodeTasksDirectory();
    return allPaths[0];
}
/**
 * Get the absolute path to a task directory
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the task directory
 */
export function getTaskDirectory(tasksDir, taskId) {
    return path.join(tasksDir, taskId);
}
/**
 * Get the absolute path to a task's API conversation history file
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the API conversation history file
 */
export function getApiConversationFilePath(tasksDir, taskId) {
    return path.join(tasksDir, taskId, 'api_conversation_history.json');
}
/**
 * Get the absolute path to a task's UI messages file
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the UI messages file
 */
export function getUiMessagesFilePath(tasksDir, taskId) {
    return path.join(tasksDir, taskId, 'ui_messages.json');
}
/**
 * Check if a task directory exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the task directory exists, false otherwise
 */
export async function taskExists(tasksDir, taskId) {
    try {
        await fs.access(getTaskDirectory(tasksDir, taskId));
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if a task's API conversation history file exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the API conversation history file exists, false otherwise
 */
export async function apiConversationFileExists(tasksDir, taskId) {
    try {
        await fs.access(getApiConversationFilePath(tasksDir, taskId));
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if a task's UI messages file exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the UI messages file exists, false otherwise
 */
export async function uiMessagesFileExists(tasksDir, taskId) {
    try {
        await fs.access(getUiMessagesFilePath(tasksDir, taskId));
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Format file size in human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
/**
 * Get the platform-specific path to the VS Code extension crash reports directory
 * @returns Array containing the absolute path to the VS Code extension crash reports directory
 */
export function getCrashReportsDirectories() {
    const homedir = os.homedir();
    // Define path for standard Cline extension based on platform
    const getPath = () => {
        switch (process.platform) {
            case 'win32':
                return [
                    // Standard Cline path
                    path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
                ];
            case 'darwin':
                return [
                    // Standard Cline path
                    path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
                ];
            case 'linux':
                return [
                    // Standard Cline path
                    path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
                ];
            default:
                throw new Error(`Unsupported platform: ${process.platform}`);
        }
    };
    return getPath();
}
/**
 * Get the appropriate crash reports directory
 * @returns The crash reports directory path
 */
export function getCrashReportsDirectory() {
    return getCrashReportsDirectories()[0];
}
/**
 * Get the dismissed crash reports directory
 * @returns The dismissed crash reports directory path
 */
export function getDismissedCrashReportsDirectory() {
    return path.join(getCrashReportsDirectory(), 'Dismissed');
}
/**
 * Check if a path is within the standard Cline extension
 * @param dirPath Directory path to check
 * @returns True if the path is within the standard Cline extension, false otherwise
 */
export function isStandardClineExtensionPath(dirPath) {
    return dirPath.includes('saoudrizwan.claude-dev');
}
/**
 * Read the active tasks file for standard Cline
 * @returns Promise resolving to the active tasks data
 */
export async function getActiveTasksData() {
    try {
        if (await fs.pathExists(config.paths.activeTasksFile)) {
            const content = await fs.readFile(config.paths.activeTasksFile, 'utf8');
            return JSON.parse(content);
        }
    }
    catch (error) {
        console.error('Error reading active tasks file:', error);
    }
    return { activeTasks: [] };
}
/**
 * Get active task by ID or label
 * @param taskId Optional task ID to find
 * @param label Optional label (A, B, C, D) to find
 * @returns The active task if found, undefined otherwise
 */
export async function getActiveTask(taskId, label) {
    const activeTasksData = await getActiveTasksData();
    if (!activeTasksData.activeTasks || activeTasksData.activeTasks.length === 0) {
        return undefined;
    }
    // If taskId is provided, find by ID
    if (taskId) {
        return activeTasksData.activeTasks.find(task => task.id === taskId);
    }
    // If label is provided, find by label
    if (label) {
        return activeTasksData.activeTasks.find(task => task.label === label);
    }
    // If neither is provided, return the most recently activated task
    return activeTasksData.activeTasks.sort((a, b) => b.lastActivated - a.lastActivated)[0];
}
/**
 * Ensure the crash reports directories exist
 * @returns Object containing the created directories
 */
export async function ensureCrashReportsDirectories() {
    const crashReportsDir = getCrashReportsDirectory();
    const dismissedDir = getDismissedCrashReportsDirectory();
    let created = false;
    // Create the directories if they don't exist
    if (!await fs.pathExists(crashReportsDir)) {
        await fs.mkdirp(crashReportsDir);
        created = true;
    }
    if (!await fs.pathExists(dismissedDir)) {
        await fs.mkdirp(dismissedDir);
        created = true;
    }
    return { crashReportsDir, dismissedDir, created };
}
