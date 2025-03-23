/**
 * Task service for the Claude Task Reader MCP Server
 * Provides functionality for listing and retrieving VS Code extension tasks
 */
import fs from 'fs-extra';
import { getTaskDirectory, getApiConversationFilePath, getUiMessagesFilePath, formatFileSize } from '../utils/paths.js';
import { countJsonArrayItems } from '../utils/json-streaming.js';
// Import from the index file to avoid circular dependencies
import { getConversationHistory } from './index.js';
/**
 * List all tasks in the VS Code extension tasks directory
 * @param tasksDir Path to the VS Code extension tasks directory
 * @returns Promise resolving to an array of task IDs and timestamps
 */
export async function listTasks(tasksDir) {
    try {
        // Make sure tasks directory exists
        if (!await fs.pathExists(tasksDir)) {
            return [];
        }
        
        // Read all directories in the tasks directory
        const dirs = await fs.readdir(tasksDir, { withFileTypes: true });
        
        // Filter for directories only and get task info with last activity timestamp
        const taskDirsPromises = dirs
            .filter(dir => dir.isDirectory())
            .map(async (dir) => {
                const id = dir.name;
                const creationTimestamp = parseInt(id, 10) || 0; // Convert directory name to timestamp
                
                // Get the modification times of the conversation files
                const apiFilePath = getApiConversationFilePath(tasksDir, id);
                const uiFilePath = getUiMessagesFilePath(tasksDir, id);
                
                let lastActivityTimestamp = creationTimestamp;
                
                try {
                    // Check if API conversation file exists and get its modification time
                    if (await fs.pathExists(apiFilePath)) {
                        const apiStats = await fs.stat(apiFilePath);
                        const apiMtime = apiStats.mtime.getTime();
                        lastActivityTimestamp = Math.max(lastActivityTimestamp, apiMtime);
                    }
                    
                    // Check if UI messages file exists and get its modification time
                    if (await fs.pathExists(uiFilePath)) {
                        const uiStats = await fs.stat(uiFilePath);
                        const uiMtime = uiStats.mtime.getTime();
                        lastActivityTimestamp = Math.max(lastActivityTimestamp, uiMtime);
                    }
                } catch (e) {
                    // If there's an error accessing the files, just use the creation timestamp
                    console.warn(`Error accessing files for task ${id}:`, e);
                }
                
                return { 
                    id, 
                    timestamp: creationTimestamp,
                    lastActivityTimestamp 
                };
            });
        
        // Wait for all promises to resolve
        const taskDirs = await Promise.all(taskDirsPromises);
        
        // Sort by last activity timestamp descending (newest first)
        taskDirs.sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp);
        
        // Return objects with id, timestamp, and lastActivityTimestamp
        return taskDirs.map(({ id, timestamp, lastActivityTimestamp }) => ({ 
            id, 
            timestamp,
            lastActivityTimestamp 
        }));
    }
    catch (error) {
        console.error('Error listing tasks:', error);
        throw new Error(`Failed to list tasks: ${error.message}`);
    }
}
/**
 * Get details for a specific task
 * @param tasksDir Path to the VS Code extension tasks directory
 * @param taskId Task ID
 * @returns Promise resolving to task metadata
 */
export async function getTask(tasksDir, taskId) {
    try {
        // Validate task directory exists
        const taskDir = getTaskDirectory(tasksDir, taskId);
        await fs.access(taskDir);
        // Get file stats for timestamp information
        const stats = await fs.stat(taskDir);
        // Check for api_conversation_history.json and ui_messages.json
        const apiFilePath = getApiConversationFilePath(tasksDir, taskId);
        const uiFilePath = getUiMessagesFilePath(tasksDir, taskId);
        let apiFileExists = false;
        let uiFileExists = false;
        try {
            await fs.access(apiFilePath);
            apiFileExists = true;
        }
        catch (e) {
            // File doesn't exist
        }
        try {
            await fs.access(uiFilePath);
            uiFileExists = true;
        }
        catch (e) {
            // File doesn't exist
        }
        // Get file sizes if they exist
        let apiFileSize = 0;
        let uiFileSize = 0;
        if (apiFileExists) {
            const apiStats = await fs.stat(apiFilePath);
            apiFileSize = apiStats.size;
        }
        if (uiFileExists) {
            const uiStats = await fs.stat(uiFilePath);
            uiFileSize = uiStats.size;
        }
        // Calculate the lastActivityTimestamp
        let lastActivityTimestamp = parseInt(taskId, 10) || 0;
        
        if (apiFileExists) {
            const apiMtime = apiStats.mtime.getTime();
            lastActivityTimestamp = Math.max(lastActivityTimestamp, apiMtime);
        }
        
        if (uiFileExists) {
            const uiMtime = uiStats.mtime.getTime();
            lastActivityTimestamp = Math.max(lastActivityTimestamp, uiMtime);
        }
        
        // Return task metadata
        return {
            id: taskId,
            timestamp: parseInt(taskId, 10) || 0,
            lastActivityTimestamp,
            created: stats.birthtime,
            modified: stats.mtime,
            hasApiConversation: apiFileExists,
            hasUiMessages: uiFileExists,
            apiFileSize: formatFileSize(apiFileSize),
            uiFileSize: formatFileSize(uiFileSize),
            apiFileSizeBytes: apiFileSize,
            uiFileSizeBytes: uiFileSize
        };
    }
    catch (error) {
        console.error(`Error getting task ${taskId}:`, error);
        throw new Error(`Failed to get task ${taskId}: ${error.message}`);
    }
}
/**
 * Get the latest task
 * @param tasksDir Path to the VS Code extension tasks directory
 * @returns Promise resolving to the latest task metadata
 */
export async function getLatestTask(tasksDir) {
    try {
        const tasks = await listTasks(tasksDir);
        if (tasks.length === 0) {
            throw new Error('No tasks found');
        }
        // Get the most recent task (first in the sorted list)
        const latestTask = tasks[0];
        // Get full task details
        return await getTask(tasksDir, latestTask.id);
    }
    catch (error) {
        console.error('Error getting latest task:', error);
        throw new Error(`Failed to get latest task: ${error.message}`);
    }
}
/**
 * Generate a summary of a task's conversation
 * @param tasksDir Path to the VS Code extension tasks directory
 * @param taskId Task ID
 * @returns Promise resolving to a task summary
 */
export async function getTaskSummary(tasksDir, taskId) {
    try {
        // Get task details
        const task = await getTask(tasksDir, taskId);
        // Initial summary with task metadata
        const summary = {
            ...task,
            totalMessages: 0,
            totalHumanMessages: 0,
            totalAssistantMessages: 0,
            previewMessages: [],
            duration: task.modified && task.created ?
                new Date(task.modified).getTime() - new Date(task.created).getTime() :
                null,
            sampleFirst: null,
            sampleLast: null
        };
        // If no API conversation, return the basic summary
        if (!task.hasApiConversation) {
            return summary;
        }
        // Get a sample of the conversation (first and last few messages)
        const previewMessages = await getConversationHistory(tasksDir, taskId, { limit: 10 });
        summary.previewMessages = previewMessages;
        if (previewMessages.length > 0) {
            summary.sampleFirst = previewMessages[0];
            summary.sampleLast = previewMessages[previewMessages.length - 1];
        }
        // Count the total messages
        const apiFilePath = getApiConversationFilePath(tasksDir, taskId);
        const totalMessages = await countJsonArrayItems(apiFilePath);
        summary.totalMessages = totalMessages;
        // Count message types by scanning the file
        // We'll implement this using our conversation service to filter by role
        const humanMessages = await getConversationHistory(tasksDir, taskId, {
            limit: Number.MAX_SAFE_INTEGER
        }, (message) => message.role === 'human');
        const assistantMessages = await getConversationHistory(tasksDir, taskId, {
            limit: Number.MAX_SAFE_INTEGER
        }, (message) => message.role === 'assistant');
        summary.totalHumanMessages = humanMessages.length;
        summary.totalAssistantMessages = assistantMessages.length;
        return summary;
    }
    catch (error) {
        console.error(`Error generating summary for task ${taskId}:`, error);
        throw new Error(`Failed to generate task summary: ${error.message}`);
    }
}
