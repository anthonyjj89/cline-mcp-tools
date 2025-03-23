/**
 * Path utility functions for the Claude Task Reader MCP Server
 * Provides platform-specific path resolution and file access
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
/**
 * Get the platform-specific path to the VS Code extension tasks directory
 * @returns The absolute path to the VS Code extension tasks directory
 */
export function getVSCodeTasksDirectory() {
    const homedir = os.homedir();
    switch (process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
        case 'darwin':
            return path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
        case 'linux':
            return path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
        default:
            throw new Error(`Unsupported platform: ${process.platform}`);
    }
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
