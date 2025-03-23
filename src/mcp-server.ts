/**
 * MCP Server for Claude Task Reader
 * Implements MCP capabilities for Claude Desktop to access VS Code extension conversations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getVSCodeTasksDirectory } from './utils/paths.js';
import {
  listTasks,
  getTask,
  getLatestTask,
  getTaskSummary,
  getConversationHistory,
  getUiMessages,
  searchConversations,
  findCodeDiscussions
} from './services/index.js';
import { Message } from './models/task.js';

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

/**
 * Initialize the MCP server
 */
export async function initMcpServer(tasksDir: string): Promise<Server> {
  // Create server instance
  const server = new Server(
    {
      name: 'claude-task-reader',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {
          listChanged: false
        }
      }
    }
  );

  // List MCP tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'get_last_n_messages',
          description: 'Retrieve the last N messages from a conversation',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of messages to retrieve (default: 50, max: 100)',
                default: 50
              }
            },
            required: ['task_id']
          }
        },
        {
          name: 'get_messages_since',
          description: 'Retrieve messages after a specific timestamp',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation'
              },
              since: {
                type: 'number',
                description: 'Timestamp to retrieve messages from'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of messages to retrieve (default: 50, max: 100)',
                default: 50
              }
            },
            required: ['task_id', 'since']
          }
        },
        {
          name: 'get_conversation_summary',
          description: 'Generate a concise summary of the conversation',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation'
              }
            },
            required: ['task_id']
          }
        },
        {
          name: 'find_code_discussions',
          description: 'Identify discussions about specific code files or snippets',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation'
              },
              filename: {
                type: 'string',
                description: 'Filename to filter discussions by (optional)'
              }
            },
            required: ['task_id']
          }
        },
        {
          name: 'list_recent_tasks',
          description: 'List the most recent tasks/conversations',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of tasks to retrieve (default: 10, max: 50)',
                default: 10
              }
            }
          }
        },
        {
          name: 'get_task_by_id',
          description: 'Get a specific task by its ID',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation'
              }
            },
            required: ['task_id']
          }
        },
        {
          name: 'search_conversations',
          description: 'Search across conversations for specific terms or patterns',
          inputSchema: {
            type: 'object',
            properties: {
              search_term: {
                type: 'string',
                description: 'Term to search for'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 20, max: 50)',
                default: 20
              },
              max_tasks_to_search: {
                type: 'number',
                description: 'Maximum number of tasks to search (default: 10, max: 20)',
                default: 10
              }
            },
            required: ['search_term']
          }
        }
      ]
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case 'get_last_n_messages':
          return await handleGetLastNMessages(tasksDir, args);
        
        case 'get_messages_since':
          return await handleGetMessagesSince(tasksDir, args);
        
        case 'get_conversation_summary':
          return await handleGetConversationSummary(tasksDir, args);
        
        case 'find_code_discussions':
          return await handleFindCodeDiscussions(tasksDir, args);
        
        case 'list_recent_tasks':
          return await handleListRecentTasks(tasksDir, args);
        
        case 'get_task_by_id':
          return await handleGetTaskById(tasksDir, args);
        
        case 'search_conversations':
          return await handleSearchConversations(tasksDir, args);
        
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      
      // Return formatted error
      if (error instanceof McpError) {
        throw error;
      }
      
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid arguments: ${error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}`
        );
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Return the server instance
  return server;
}

/**
 * Handle get_last_n_messages tool call
 */
async function handleGetLastNMessages(tasksDir: string, args: unknown) {
  const { task_id, limit } = GetLastNMessagesSchema.parse(args);
  
  // Get conversation messages
  const messages = await getConversationHistory(tasksDir, task_id, { limit });
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id,
          message_count: messages.length,
          messages
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle get_messages_since tool call
 */
async function handleGetMessagesSince(tasksDir: string, args: unknown) {
  const { task_id, since, limit } = GetMessagesSinceSchema.parse(args);
  
  // Get messages since timestamp
  const messages = await getConversationHistory(tasksDir, task_id, { since, limit });
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id,
          since: new Date(since).toISOString(),
          message_count: messages.length,
          messages
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle get_conversation_summary tool call
 */
async function handleGetConversationSummary(tasksDir: string, args: unknown) {
  const { task_id } = GetConversationSummarySchema.parse(args);
  
  // Get conversation summary
  const summary = await getTaskSummary(tasksDir, task_id);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(summary, null, 2),
      },
    ],
  };
}

/**
 * Handle find_code_discussions tool call
 */
async function handleFindCodeDiscussions(tasksDir: string, args: unknown) {
  const { task_id, filename } = FindCodeDiscussionsSchema.parse(args);
  
  // Find code discussions
  const discussions = await findCodeDiscussions(tasksDir, task_id, filename || null);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id,
          filename: filename || 'all',
          discussion_count: discussions.length,
          discussions
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle list_recent_tasks tool call
 */
async function handleListRecentTasks(tasksDir: string, args: unknown) {
  const { limit } = ListRecentTasksSchema.parse(args);
  
  // List tasks
  const allTasks = await listTasks(tasksDir);
  const limitedTasks = allTasks.slice(0, limit);
  
  // Get details for each task
  const taskDetails = await Promise.all(
    limitedTasks.map(async (task) => await getTask(tasksDir, task.id))
  );
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_count: taskDetails.length,
          tasks: taskDetails
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle get_task_by_id tool call
 */
async function handleGetTaskById(tasksDir: string, args: unknown) {
  const { task_id } = GetTaskByIdSchema.parse(args);
  
  // Get task details
  const task = await getTask(tasksDir, task_id);
  
  // Get a preview of the conversation
  const previewMessages = await getConversationHistory(tasksDir, task_id, { limit: 5 });
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          ...task,
          preview_messages: previewMessages
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle search_conversations tool call
 */
async function handleSearchConversations(tasksDir: string, args: unknown) {
  const { search_term, limit, max_tasks_to_search } = SearchConversationsSchema.parse(args);
  
  // Search conversations
  const results = await searchConversations(tasksDir, search_term, {
    limit,
    maxTasksToSearch: max_tasks_to_search
  });
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          search_term,
          result_count: results.length,
          results
        }, null, 2),
      },
    ],
  };
}

/**
 * Start the MCP server
 */
export async function startMcpServer() {
  try {
    // Get the VS Code tasks directory based on the current OS
    const tasksDir = getVSCodeTasksDirectory();
    
    // Initialize MCP server
    const server = await initMcpServer(tasksDir);
    
    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Claude Task Reader MCP server running on stdio');
    console.error(`Using VS Code tasks directory: ${tasksDir}`);
    
    // Handle process termination
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}
