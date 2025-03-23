/**
 * MCP Server for Claude Task Reader
 * Implements MCP capabilities for Claude Desktop to access VS Code extension conversations
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getVSCodeTasksDirectory } from './utils/paths.js';
import { listTasks, getTask, getTaskSummary, getConversationHistory, searchConversations, findCodeDiscussions } from './services/index.js';
import { createRequire } from 'module';

// Create a require function
const require = createRequire(import.meta.url);

// Use require to import CommonJS modules
const zodToJsonSchemaModule = require('zod-to-json-schema');
const zodToJsonSchema = zodToJsonSchemaModule.default || zodToJsonSchemaModule;

// Schema definitions for MCP tools
const GetLastNMessagesSchema = z.object({
    task_id: z.string().describe('Task ID (timestamp) of the conversation'),
    limit: z.number()
        .optional()
        .describe('Maximum number of messages to retrieve (default: 50, max: 100)')
        .default(50)
        .transform(val => Math.min(val, 100))
});

const GetMessagesSinceSchema = z.object({
    task_id: z.string().describe('Task ID (timestamp) of the conversation'),
    since: z.number().describe('Timestamp to retrieve messages from'),
    limit: z.number()
        .optional()
        .describe('Maximum number of messages to retrieve (default: 50, max: 100)')
        .default(50)
        .transform(val => Math.min(val, 100))
});

const GetConversationSummarySchema = z.object({
    task_id: z.string().describe('Task ID (timestamp) of the conversation')
});

const FindCodeDiscussionsSchema = z.object({
    task_id: z.string().describe('Task ID (timestamp) of the conversation'),
    filename: z.string().optional().describe('Filename to filter discussions by (optional)')
});

const ListRecentTasksSchema = z.object({
    limit: z.number()
        .optional()
        .describe('Maximum number of tasks to retrieve (default: 10, max: 50)')
        .default(10)
        .transform(val => Math.min(val, 50))
});

const GetTaskByIdSchema = z.object({
    task_id: z.string().describe('Task ID (timestamp) of the conversation')
});

const SearchConversationsSchema = z.object({
    search_term: z.string().describe('Term to search for'),
    limit: z.number()
        .optional()
        .describe('Maximum number of results (default: 20, max: 50)')
        .default(20)
        .transform(val => Math.min(val, 50)),
    max_tasks_to_search: z.number()
        .optional()
        .describe('Maximum number of tasks to search (default: 10, max: 20)')
        .default(10)
        .transform(val => Math.min(val, 20))
});

// New schema for context search
const SearchByContextSchema = z.object({
    context_term: z.string().describe('The project or topic to search for'),
    time_range: z.object({
        start: z.number().optional().describe('Start timestamp for filtering messages'),
        end: z.number().optional().describe('End timestamp for filtering messages')
    }).optional().describe('Optional time range filter'),
    context_lines: z.number()
        .optional()
        .describe('How many messages before/after to include')
        .default(3)
        .transform(val => Math.min(val, 10)),
    max_results: z.number()
        .optional()
        .describe('Maximum number of results to return')
        .default(20)
        .transform(val => Math.min(val, 50))
});

// Convert Zod schema to JSON Schema
function convertZodToJsonSchema(zodSchema) {
    try {
        return zodToJsonSchema(zodSchema, {
            $refStrategy: 'none',
            definitionPath: 'definitions'
        });
    } catch (error) {
        console.error('Error converting Zod schema to JSON Schema:', error);
        // Return a simple schema as fallback
        return {
            type: 'object',
            properties: {},
            required: []
        };
    }
}

/**
 * Start the MCP server
 */
export async function startMcpServer() {
    // Create the server instance
    const server = new Server(
        {
            name: 'claude-task-reader',
            version: '0.1.0'
        },
        {
            capabilities: {
                tools: {}
            }
        }
    );

    // Get the VS Code tasks directory
    const tasksDir = getVSCodeTasksDirectory();
    console.error(`Using VS Code tasks directory: ${tasksDir}`);

    // Set up request handlers for tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        // Convert all Zod schemas to JSON Schema
        const getLastNMessagesJsonSchema = convertZodToJsonSchema(GetLastNMessagesSchema);
        const getMessagesSinceJsonSchema = convertZodToJsonSchema(GetMessagesSinceSchema);
        const getConversationSummaryJsonSchema = convertZodToJsonSchema(GetConversationSummarySchema);
        const findCodeDiscussionsJsonSchema = convertZodToJsonSchema(FindCodeDiscussionsSchema);
        const listRecentTasksJsonSchema = convertZodToJsonSchema(ListRecentTasksSchema);
        const getTaskByIdJsonSchema = convertZodToJsonSchema(GetTaskByIdSchema);
        const searchConversationsJsonSchema = convertZodToJsonSchema(SearchConversationsSchema);
        const searchByContextJsonSchema = convertZodToJsonSchema(SearchByContextSchema);

        return {
            tools: [
                {
                    name: 'get_last_n_messages',
                    description: 'Retrieve the last N messages from a conversation',
                    inputSchema: getLastNMessagesJsonSchema
                },
                {
                    name: 'get_messages_since',
                    description: 'Retrieve messages after a specific timestamp',
                    inputSchema: getMessagesSinceJsonSchema
                },
                {
                    name: 'get_conversation_summary',
                    description: 'Generate a concise summary of the conversation',
                    inputSchema: getConversationSummaryJsonSchema
                },
                {
                    name: 'find_code_discussions',
                    description: 'Identify discussions about specific code files or snippets',
                    inputSchema: findCodeDiscussionsJsonSchema
                },
                {
                    name: 'list_recent_tasks',
                    description: 'List the most recent tasks/conversations',
                    inputSchema: listRecentTasksJsonSchema
                },
                {
                    name: 'get_task_by_id',
                    description: 'Get a specific task by its ID',
                    inputSchema: getTaskByIdJsonSchema
                },
                {
                    name: 'search_conversations',
                    description: 'Search across conversations for specific terms or patterns',
                    inputSchema: searchConversationsJsonSchema
                },
                {
                    name: 'search_by_context',
                    description: 'Search for conversations about specific topics with context',
                    inputSchema: searchByContextJsonSchema
                }
            ]
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            console.error(`Received tool call: ${request.params.name}`);
            console.error(`Arguments: ${JSON.stringify(request.params.arguments)}`);
            
            switch (request.params.name) {
                case 'get_last_n_messages':
                    return await handleGetLastNMessages(request.params.arguments, tasksDir);
                case 'get_messages_since':
                    return await handleGetMessagesSince(request.params.arguments, tasksDir);
                case 'get_conversation_summary':
                    return await handleGetConversationSummary(request.params.arguments, tasksDir);
                case 'find_code_discussions':
                    return await handleFindCodeDiscussions(request.params.arguments, tasksDir);
                case 'list_recent_tasks':
                    return await handleListRecentTasks(request.params.arguments, tasksDir);
                case 'get_task_by_id':
                    return await handleGetTaskById(request.params.arguments, tasksDir);
                case 'search_conversations':
                    return await handleSearchConversations(request.params.arguments, tasksDir);
                case 'search_by_context':
                    return await handleSearchByContext(request.params.arguments, tasksDir);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
        } catch (error) {
            console.error(`Error executing tool ${request.params.name}:`, error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });

    // Handle errors
    server.onerror = (error) => {
        console.error('MCP server error:', error);
    };

    // Connect to the transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Claude Task Reader MCP server running on stdio');

    return server;
}

/**
 * Handle the get_last_n_messages tool
 */
async function handleGetLastNMessages(args, tasksDir) {
    try {
        console.error(`Handling get_last_n_messages with args: ${JSON.stringify(args)}`);
        const { task_id, limit } = GetLastNMessagesSchema.parse(args);
        const messages = await getConversationHistory(tasksDir, task_id, { limit });
        console.error(`Retrieved ${messages.length} messages`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(messages, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error(`Error in get_last_n_messages: ${error.message}`);
        throw new Error(`Failed to get conversation history: ${error.message}`);
    }
}

/**
 * Handle the get_messages_since tool
 */
async function handleGetMessagesSince(args, tasksDir) {
    try {
        console.error(`Handling get_messages_since with args: ${JSON.stringify(args)}`);
        const { task_id, since, limit } = GetMessagesSinceSchema.parse(args);
        const messages = await getConversationHistory(tasksDir, task_id, { since, limit });
        console.error(`Retrieved ${messages.length} messages since ${since}`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(messages, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error(`Error in get_messages_since: ${error.message}`);
        throw new Error(`Failed to get messages since ${args.since}: ${error.message}`);
    }
}

/**
 * Handle the get_conversation_summary tool
 */
async function handleGetConversationSummary(args, tasksDir) {
    try {
        console.error(`Handling get_conversation_summary with args: ${JSON.stringify(args)}`);
        const { task_id } = GetConversationSummarySchema.parse(args);
        const summary = await getTaskSummary(tasksDir, task_id);
        
        // Add a note about the lastActivityTimestamp
        const summaryWithNote = {
            ...summary,
            note: "The lastActivityTimestamp represents the most recent activity in this task, based on the modification time of the conversation files. The timestamp is the creation time of the task."
        };
        
        console.error(`Generated summary for task ${task_id}`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(summaryWithNote, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error(`Error in get_conversation_summary: ${error.message}`);
        throw new Error(`Failed to generate task summary: ${error.message}`);
    }
}

/**
 * Handle the find_code_discussions tool
 */
async function handleFindCodeDiscussions(args, tasksDir) {
    try {
        console.error(`Handling find_code_discussions with args: ${JSON.stringify(args)}`);
        const { task_id, filename } = FindCodeDiscussionsSchema.parse(args);
        const discussions = await findCodeDiscussions(tasksDir, task_id, filename);
        console.error(`Found ${discussions.length} code discussions`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(discussions, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error(`Error in find_code_discussions: ${error.message}`);
        throw new Error(`Failed to find code discussions: ${error.message}`);
    }
}

/**
 * Handle the list_recent_tasks tool
 */
async function handleListRecentTasks(args, tasksDir) {
    try {
        console.error(`Handling list_recent_tasks with args: ${JSON.stringify(args)}`);
        const { limit } = ListRecentTasksSchema.parse(args);
        const tasks = await listTasks(tasksDir, limit);
        
        // Add a note about which timestamp to use for determining the "latest" task
        const tasksWithNote = {
            tasks,
            note: "Tasks are sorted by lastActivityTimestamp (most recent activity first). Use lastActivityTimestamp to determine which task is the 'latest' one, not the timestamp (which is the creation time)."
        };
        
        console.error(`Listed ${tasks.length} tasks`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(tasksWithNote, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error(`Error in list_recent_tasks: ${error.message}`);
        throw new Error(`Failed to list recent tasks: ${error.message}`);
    }
}

/**
 * Handle the get_task_by_id tool
 */
async function handleGetTaskById(args, tasksDir) {
    try {
        console.error(`Handling get_task_by_id with args: ${JSON.stringify(args)}`);
        const { task_id } = GetTaskByIdSchema.parse(args);
        const task = await getTask(tasksDir, task_id);
        const messages = await getConversationHistory(tasksDir, task_id, { limit: 10 });
        
        // Add a note about the lastActivityTimestamp
        const taskWithNote = {
            task,
            messages,
            note: "The lastActivityTimestamp represents the most recent activity in this task, based on the modification time of the conversation files. The timestamp is the creation time of the task."
        };
        
        console.error(`Retrieved task ${task_id} with ${messages.length} messages`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(taskWithNote, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error(`Error in get_task_by_id: ${error.message}`);
        throw new Error(`Failed to get task by ID: ${error.message}`);
    }
}

/**
 * Handle the search_conversations tool
 */
async function handleSearchConversations(args, tasksDir) {
    try {
        console.error(`Handling search_conversations with args: ${JSON.stringify(args)}`);
        const { search_term, limit, max_tasks_to_search } = SearchConversationsSchema.parse(args);
        
        // Call searchConversations with the correct parameters
        const results = await searchConversations(tasksDir, search_term, limit, max_tasks_to_search);
        
        // Add a note about how tasks are sorted
        const resultsWithNote = {
            ...results,
            note: "Tasks are searched in order of lastActivityTimestamp (most recent activity first), not by creation timestamp."
        };
        
        console.error(`Found ${results.results.length} results for search term "${search_term}"`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(resultsWithNote, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error(`Error in search_conversations: ${error.message}`);
        throw new Error(`Failed to search conversations: ${error.message}`);
    }
}

/**
 * Handle the search_by_context tool
 */
async function handleSearchByContext(args, tasksDir) {
    try {
        console.error(`Handling search_by_context with args: ${JSON.stringify(args)}`);
        const { context_term, time_range, context_lines, max_results } = SearchByContextSchema.parse(args);
        
        // First, search for conversations containing the context term
        const searchResults = await searchConversations(tasksDir, context_term, max_results, 20);
        console.error(`Found ${searchResults.results.length} initial results for context term "${context_term}"`);
        
        // Process each result to include context
        const resultsWithContext = [];
        
        for (const result of searchResults.results) {
            // Get the task ID from the result
            const taskId = result.taskId;
            
            // Get all messages for this task
            const allMessages = await getConversationHistory(tasksDir, taskId, { limit: 1000 });
            console.error(`Retrieved ${allMessages.length} messages for task ${taskId}`);
            
            // Find the index of the matching message
            const matchIndex = allMessages.findIndex(msg => {
                const content = typeof msg.content === 'string' 
                    ? msg.content 
                    : JSON.stringify(msg.content);
                return content.toLowerCase().includes(context_term.toLowerCase());
            });
            
            if (matchIndex !== -1) {
                // Apply time range filter if specified
                if (time_range) {
                    const { start, end } = time_range;
                    if (start && allMessages[matchIndex].timestamp < start) continue;
                    if (end && allMessages[matchIndex].timestamp > end) continue;
                }
                
                // Get context messages (messages before and after the match)
                const startIdx = Math.max(0, matchIndex - context_lines);
                const endIdx = Math.min(allMessages.length - 1, matchIndex + context_lines);
                
                // Extract the context messages
                const contextMessages = allMessages.slice(startIdx, endIdx + 1);
                
                // Add to results
                resultsWithContext.push({
                    task_id: taskId,
                    task_created: result.timestamp,
                    match_index: matchIndex,
                    context_messages: contextMessages,
                    context_range: {
                        start: startIdx,
                        end: endIdx,
                        total_messages: allMessages.length
                    }
                });
                
                // Stop if we've reached the maximum number of results
                if (resultsWithContext.length >= max_results) break;
            }
        }
        
        console.error(`Processed ${resultsWithContext.length} results with context`);
        
        // Add a note about how tasks are sorted
        const resultsWithContextAndNote = {
            context_term,
            result_count: resultsWithContext.length,
            results: resultsWithContext,
            note: "Tasks are searched in order of lastActivityTimestamp (most recent activity first), not by creation timestamp."
        };
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(resultsWithContextAndNote, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error(`Error in search_by_context: ${error.message}`);
        throw new Error(`Failed to search by context: ${error.message}`);
    }
}
