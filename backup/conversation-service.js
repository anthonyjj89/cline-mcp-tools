/**
 * Conversation service for the Claude Task Reader MCP Server
 * Provides functionality for retrieving and filtering conversation messages
 */
import fs from 'fs-extra';
import { getApiConversationFilePath, getUiMessagesFilePath, apiConversationFileExists, uiMessagesFileExists } from '../utils/paths.js';
import { streamJsonArray, searchJsonArray } from '../utils/json-streaming.js';
/**
 * Get conversation history for a task with filtering options
 * @param tasksDir Path to the VS Code extension tasks directory
 * @param taskId Task ID
 * @param options Filter options (limit, since, search)
 * @param filterFn Optional custom filter function
 * @returns Promise resolving to the filtered conversation messages
 */
export async function getConversationHistory(tasksDir, taskId, options = {}, filterFn) {
    try {
        // Check if conversation file exists
        if (!await apiConversationFileExists(tasksDir, taskId)) {
            throw new Error(`Conversation file not found for task ${taskId}`);
        }
        // Get the file path
        const apiFilePath = getApiConversationFilePath(tasksDir, taskId);
        // Stream and filter the JSON file
        const messages = await streamJsonArray(apiFilePath, options, filterFn);
        return messages;
    }
    catch (error) {
        console.error(`Error getting conversation history for task ${taskId}:`, error);
        throw new Error(`Failed to get conversation history: ${error.message}`);
    }
}
/**
 * Get UI messages for a task
 * @param tasksDir Path to the VS Code extension tasks directory
 * @param taskId Task ID
 * @returns Promise resolving to the UI messages
 */
export async function getUiMessages(tasksDir, taskId) {
    try {
        // Check if UI messages file exists
        if (!await uiMessagesFileExists(tasksDir, taskId)) {
            throw new Error(`UI messages file not found for task ${taskId}`);
        }
        // Get the file path
        const uiFilePath = getUiMessagesFilePath(tasksDir, taskId);
        // For UI messages, which are typically smaller, we can read the entire file
        // If this becomes an issue with large files, we can implement streaming here too
        const data = await fs.readFile(uiFilePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error(`Error getting UI messages for task ${taskId}:`, error);
        throw new Error(`Failed to get UI messages: ${error.message}`);
    }
}
/**
 * Search across tasks for specific terms in conversations
 * @param tasksDir Path to the VS Code extension tasks directory
 * @param searchTerm Term to search for
 * @param options Search options (limit, maxTasksToSearch)
 * @returns Promise resolving to search results with context
 */
export async function searchConversations(tasksDir, searchTerm, options = {}) {
    try {
        if (!searchTerm) {
            throw new Error('Search term is required');
        }
        const limit = options.limit || 20;
        const maxTasksToSearch = options.maxTasksToSearch || 10;
        // Get list of tasks
        const tasks = await fs.readdir(tasksDir, { withFileTypes: true });
        const taskDirs = tasks
            .filter(dir => dir.isDirectory())
            .map(dir => dir.name)
            .sort()
            .reverse() // Newest first, assuming timestamp-based names
            .slice(0, maxTasksToSearch);
        const results = [];
        // Search each task's conversation history
        for (const taskId of taskDirs) {
            if (results.length >= limit)
                break;
            try {
                if (!await apiConversationFileExists(tasksDir, taskId)) {
                    continue;
                }
                const apiFilePath = getApiConversationFilePath(tasksDir, taskId);
                // Use searchJsonArray for efficient streaming search
                const searchResults = await searchJsonArray(apiFilePath, searchTerm, 100, // Context length
                limit - results.length // How many more results we need
                );
                // Convert to our SearchResult format
                const formattedResults = searchResults.map(({ item, snippet }) => ({
                    taskId,
                    timestamp: item.timestamp,
                    role: item.role,
                    snippet,
                    message: item
                }));
                results.push(...formattedResults);
            }
            catch (error) {
                console.warn(`Error searching task ${taskId}:`, error);
                // Continue with next task
            }
        }
        return { results };
    }
    catch (error) {
        console.error(`Error searching conversations:`, error);
        throw new Error(`Failed to search conversations: ${error.message}`);
    }
}
/**
 * Find code-related discussions in a conversation
 * @param tasksDir Path to the VS Code extension tasks directory
 * @param taskId Task ID
 * @param filename Optional filename to filter discussions by
 * @returns Promise resolving to code-related messages
 */
export async function findCodeDiscussions(tasksDir, taskId, filename = null) {
    try {
        // Get conversation history
        const messages = await getConversationHistory(tasksDir, taskId, {
            limit: 1000 // We need to process more messages to find code discussions
        });
        // Filter for messages containing code blocks or file mentions
        const codeDiscussions = messages.filter(message => {
            if (!message.content)
                return false;
            const content = typeof message.content === 'string'
                ? message.content
                : JSON.stringify(message.content);
            // Check for code blocks
            const hasCodeBlock = content.includes('```');
            // Check for file mentions
            const hasFileMention = content.includes('.js') ||
                content.includes('.ts') ||
                content.includes('.py') ||
                content.includes('.java') ||
                content.includes('.c') ||
                content.includes('.cpp') ||
                content.includes('.html') ||
                content.includes('.css');
            // If filename is provided, check if it's mentioned
            const mentionsSpecificFile = filename
                ? content.includes(filename)
                : true;
            return (hasCodeBlock || hasFileMention) && mentionsSpecificFile;
        });
        return codeDiscussions;
    }
    catch (error) {
        console.error(`Error finding code discussions for task ${taskId}:`, error);
        throw new Error(`Failed to find code discussions: ${error.message}`);
    }
}
