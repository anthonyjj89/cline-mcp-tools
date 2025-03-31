/**
 * Conversation service for the Claude Task Reader MCP Server
 * Uses direct paths from active_tasks.json instead of path resolution
 */
import fs from 'fs-extra';
import { getApiConversationFilePath } from '../utils/paths.js';
import { streamJsonArray, searchJsonArray } from '../utils/json-streaming.js';
import { readJsonArray, searchJsonArrayDirect } from '../utils/json-fallback.js';
import { getActiveTasksDataWithCache } from '../utils/active-task.js';
/**
 * Get conversation history for a task with filtering options
 * @param taskId Task ID
 * @param options Filter options (limit, since, search)
 * @param filterFn Optional custom filter function
 * @returns Promise resolving to the filtered conversation messages
 */
export async function getConversationHistory(taskId, options = {}, filterFn) {
    try {
        const { activeTasks } = await getActiveTasksDataWithCache();
        const task = activeTasks.find((t) => t.id === taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        // Get standard path for conversation file
        const tasksDir = '/Users/ant/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks';
        const conversationPath = getApiConversationFilePath(tasksDir, taskId);
        if (!fs.existsSync(conversationPath)) {
            throw new Error(`api_conversation_history.json not found at ${conversationPath}`);
        }
        try {
            // Try streaming first (original method)
            return await streamJsonArray(conversationPath, options, filterFn);
        }
        catch (error) {
            const streamError = error;
            console.warn(`Streaming failed, falling back to direct read: ${streamError.message}`);
            // Fallback to direct reading if streaming fails
            return await readJsonArray(conversationPath, options, filterFn);
        }
    }
    catch (error) {
        console.error(`Error getting conversation history for task ${taskId}:`, error);
        throw new Error(`Failed to get conversation history: ${error.message}`);
    }
}
/**
 * Search across tasks for specific terms in conversations
 * @param searchTerm Term to search for
 * @param options Search options (limit, maxTasksToSearch)
 * @returns Promise resolving to search results with context
 */
export async function searchConversations(searchTerm, options = {}) {
    try {
        if (!searchTerm) {
            throw new Error('Search term is required');
        }
        const limit = options.limit || 20;
        const maxTasksToSearch = options.maxTasksToSearch || 10;
        const { activeTasks } = await getActiveTasksDataWithCache();
        const recentTasks = activeTasks
            .sort((a, b) => b.lastActivated - a.lastActivated)
            .slice(0, maxTasksToSearch);
        const results = [];
        // Search each task's conversation history
        for (const task of recentTasks) {
            if (results.length >= limit)
                break;
            try {
                if (!task.conversationPath || !fs.existsSync(task.conversationPath)) {
                    continue;
                }
                let searchResults;
                try {
                    // Try streaming search first
                    searchResults = await searchJsonArray(task.conversationPath, searchTerm, 100, // Context length
                    limit - results.length // How many more results we need
                    );
                }
                catch (error) {
                    const streamError = error;
                    console.warn(`Streaming search failed, falling back to direct search: ${streamError.message}`);
                    // Fallback to direct search
                    searchResults = await searchJsonArrayDirect(task.conversationPath, searchTerm, 100, limit - results.length);
                }
                // Convert to our SearchResult format
                const formattedResults = searchResults.map(({ item, snippet }) => ({
                    taskId: task.id,
                    timestamp: item.timestamp,
                    role: item.role,
                    snippet,
                    message: item
                }));
                results.push(...formattedResults);
            }
            catch (error) {
                console.warn(`Error searching task ${task.id}:`, error);
                // Continue with next task
            }
        }
        return results;
    }
    catch (error) {
        console.error(`Error searching conversations:`, error);
        throw new Error(`Failed to search conversations: ${error.message}`);
    }
}
/**
 * Find code-related discussions in a conversation
 * @param taskId Task ID
 * @param filename Optional filename to filter discussions by
 * @returns Promise resolving to code-related messages
 */
export async function findCodeDiscussions(taskId, filename = null) {
    try {
        // Get conversation history
        const messages = await getConversationHistory(taskId, {
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
