/**
 * MCP Server for Cline Chat Reader
 * Implements four essential tools with fixed message limits
 * 
 * 1. read_last_messages - Retrieve 20 most recent conversation messages
 * 2. read_last_40_messages - Retrieve 40 most recent conversation messages
 * 3. get_active_task - Get active conversations
 * 4. send_external_advice - Send notifications between agents
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  initDiagnosticLogger, 
  setLogLevel, 
  LogLevel, 
  logError, 
  logWarning, 
  logInfo, 
  logDebug 
} from './utils/diagnostic-logger.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs-extra';
import { config } from './config.js';
import { Message } from './models/task.js';
import { getTasksDirectoryForTask } from './utils/paths.js';
import { 
  getActiveTaskWithCache, 
  getAllActiveTasksWithCache,
  getApiConversationFilePath,
  validateTaskExists,
  writeAdviceToTask,
  ActiveTaskErrorCode
} from './utils/active-task-fixed.js';
import { 
  readConversationMessages,
  readConversationMessagesWithTimeout,
  FileErrorCode
} from './utils/file-utils.js';
import {
  standardizeMessageContent,
  MessageErrorCode,
  parseConversationContent
} from './utils/message-utils.js';

/**
 * Error codes for MCP server operations
 */
enum ServerErrorCode {
  UNKNOWN_TOOL = 'UNKNOWN_TOOL',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Schema for read_last_messages tool
 */
const ReadLastMessagesSchema = z.object({
  task_id: z.union([
    z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
    z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
    z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
  ]).optional()
});

/**
 * Schema for read_last_40_messages tool
 */
const ReadLast40MessagesSchema = z.object({
  task_id: z.union([
    z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
    z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
    z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
  ]).optional()
});

/**
 * Schema for get_active_task tool
 */
const GetActiveTaskSchema = z.object({
  label: z.enum(['A', 'B']).optional().describe('Optional label (A, B) to filter by')
});

/**
 * Schema for send_external_advice tool
 */
const SendExternalAdviceSchema = z.union([
  z.object({
    target_task_id: z.string().describe('Task ID of the target conversation'),
    message: z.string().min(1).max(10000).describe('The advice message to send'),
    source_task_id: z.string().optional().describe('Task ID of the source conversation')
  }),
  z.object({
    target_task_id: z.string().describe('Task ID of the target conversation'),
    title: z.string().min(1).max(200).describe('Message title/summary'),
    content: z.string().min(1).max(10000).describe('The advice message content'),
    type: z.enum(['info', 'warning', 'error']).default('info').describe('Message type'),
    priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Message priority'),
    source_task_id: z.string().optional().describe('Task ID of the source conversation')
  })
]);

/**
 * Handle read_last_messages tool call
 * @param args Tool arguments
 * @returns Tool response
 */
async function handleReadLastMessages(args: unknown): Promise<any> {
  try {
    // Parse and validate arguments
    const { task_id } = ReadLastMessagesSchema.parse(args);
    
    // Get active task with caching
    const activeTask = await getActiveTaskWithCache(task_id);
    if (!activeTask) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: ActiveTaskErrorCode.TASK_NOT_FOUND,
              error: `No active conversation found.`,
              recommendation: "Please open VS Code and mark a conversation as active."
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    const uiFilePath = path.join(path.dirname(await getApiConversationFilePath(activeTask.id)), 'ui_messages.json');
    let messages: Message[] = [];
    
    try {
      if (!await fs.pathExists(uiFilePath)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error_code: FileErrorCode.FILE_NOT_FOUND,
                error: `UI messages file not found for task ${activeTask.id}`,
                details: {
                  attempted_path: uiFilePath,
                  recommendation: "The conversation may not exist or may be corrupted."
                }
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const uiContent = await fs.readFile(uiFilePath, 'utf8');
      messages = parseConversationContent(uiContent, config.messages.defaultLimit, true);

      // If no messages found, return error
      if (messages.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error_code: FileErrorCode.FILE_NOT_FOUND,
                error: `No messages found in UI file for task ${activeTask.id}`,
                details: {
                  attempted_path: uiFilePath,
                  file_exists: await fs.pathExists(uiFilePath),
                  file_size: (await fs.stat(uiFilePath)).size,
                  recommendation: "The UI messages file exists but contains no messages."
                }
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      // Transform messages for Claude Desktop compatibility
      const transformedMessages = standardizeMessageContent(messages);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              task_id: activeTask.id,
              is_active_task: true,
              active_label: activeTask.label,
              message_count: transformedMessages.length,
              messages: transformedMessages
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorDetails: any = {
        attempted_path: uiFilePath,
        directory_exists: await fs.pathExists(path.dirname(uiFilePath)),
        raw_error: (error as Error).message
      };
      
      try {
        errorDetails.file_permissions = (await fs.stat(uiFilePath)).mode.toString(8);
      } catch (statError) {
        errorDetails.file_permissions = "unknown";
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: FileErrorCode.FILE_NOT_FOUND,
              error: `Failed to read messages for task ${activeTask.id}`,
              details: {
                ...errorDetails,
                recommendations: [
                  "Verify the file exists at the expected path", 
                  "Check file permissions and ownership",
                  "Ensure the file is valid JSON format"
                ]
              }
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    } catch (error) {
      // Handle outer errors (argument parsing, etc)
      if (error instanceof z.ZodError) {
        logError(ServerErrorCode.INVALID_ARGUMENTS, `Invalid arguments for read_last_messages: ${error.message}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error_code: ServerErrorCode.INVALID_ARGUMENTS,
                error: `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
      
      logError(ServerErrorCode.INTERNAL_ERROR, `Error in read_last_messages: ${(error as Error).message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: ServerErrorCode.INTERNAL_ERROR,
              error: `Error: ${(error as Error).message}`
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
}

/**
 * Handle read_last_40_messages tool call
 * @param args Tool arguments
 * @returns Tool response
 */
async function handleReadLast40Messages(args: unknown): Promise<any> {
  try {
    // Parse and validate arguments
    const { task_id } = ReadLast40MessagesSchema.parse(args);
    
    // Get active task with caching
    const activeTask = await getActiveTaskWithCache(task_id);
    if (!activeTask) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: ActiveTaskErrorCode.TASK_NOT_FOUND,
              error: `No active conversation found.`,
              recommendation: "Please open VS Code and mark a conversation as active."
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    // Get UI messages file path
    const uiFilePath = path.join(path.dirname(await getApiConversationFilePath(activeTask.id)), 'ui_messages.json');
    
    // Check if UI messages file exists
    if (!await fs.pathExists(uiFilePath)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: FileErrorCode.FILE_NOT_FOUND,
              error: `UI messages file not found for task ${activeTask.id}`,
              details: {
                attempted_path: uiFilePath,
                recommendation: "The conversation may not exist or may be corrupted."
              }
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Read and parse UI messages with 40 message limit
    const uiContent = await fs.readFile(uiFilePath, 'utf8');
    const messages = parseConversationContent(uiContent, config.messages.extendedLimit, true);

    if (messages.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: FileErrorCode.FILE_NOT_FOUND,
              error: `No messages found in UI file for task ${activeTask.id}`,
              details: {
                attempted_path: uiFilePath,
                file_size: (await fs.stat(uiFilePath)).size,
                recommendation: "The conversation file exists but contains no messages."
              }
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    // Transform messages for Claude Desktop compatibility
    const transformedMessages = standardizeMessageContent(messages);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            task_id: activeTask.id,
            is_active_task: true,
            active_label: activeTask.label,
            message_count: transformedMessages.length,
            messages: transformedMessages
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    // Handle errors with proper error codes
    if (error instanceof z.ZodError) {
      logError(ServerErrorCode.INVALID_ARGUMENTS, `Invalid arguments for read_last_40_messages: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: ServerErrorCode.INVALID_ARGUMENTS,
              error: `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    logError(ServerErrorCode.INTERNAL_ERROR, `Error in read_last_40_messages: ${(error as Error).message}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error_code: ServerErrorCode.INTERNAL_ERROR,
            error: `Error: ${(error as Error).message}`
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get_active_task tool call
 * @param args Tool arguments
 * @returns Tool response
 */
async function handleGetActiveTask(args: unknown): Promise<any> {
  try {
    // Parse and validate arguments
    const { label } = GetActiveTaskSchema.parse(args);
    
    // Get active tasks with caching
    const activeTasks = await getAllActiveTasksWithCache(label);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            active_tasks: activeTasks,
            count: activeTasks.length,
            message: activeTasks.length === 0 ? 
              (label ? `No conversation marked as Active ${label} was found.` : 'No active conversations found.') : 
              undefined
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    // Handle errors with proper error codes
    if (error instanceof z.ZodError) {
      logError(ServerErrorCode.INVALID_ARGUMENTS, `Invalid arguments for get_active_task: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: ServerErrorCode.INVALID_ARGUMENTS,
              error: `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    logError(ServerErrorCode.INTERNAL_ERROR, `Error in get_active_task: ${(error as Error).message}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error_code: ServerErrorCode.INTERNAL_ERROR,
            error: `Error: ${(error as Error).message}`
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle send_external_advice tool call
 * @param args Tool arguments
 * @returns Tool response
 */
async function handleSendExternalAdvice(args: unknown): Promise<any> {
  try {
    // Type definitions for message formats
    type SimpleMessage = {
      message: string;
      target_task_id: string;
      source_task_id?: string;
    };

    type StructuredMessage = {
      content: string;
      title: string;
      type: 'info' | 'warning' | 'error';
      priority: 'low' | 'medium' | 'high';
      target_task_id: string;
      source_task_id?: string;
    };

    // Parse and validate arguments
    const parsedArgs = SendExternalAdviceSchema.parse(args) as SimpleMessage | StructuredMessage;
    const { target_task_id, source_task_id } = parsedArgs;
    
    // Handle both message formats
    const isSimpleMessage = (msg: any): msg is SimpleMessage => 'message' in msg;
    const message = isSimpleMessage(parsedArgs) ? parsedArgs.message : parsedArgs.content;
    
    // Validate target task exists with timeout
    const targetTaskExists = await Promise.race([
      validateTaskExists(target_task_id),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout validating target task')), config.errorHandling.timeout)
      )
    ]);
    
    if (!targetTaskExists) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: ActiveTaskErrorCode.TASK_NOT_FOUND,
              error: `Target task ${target_task_id} not found.`
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    // Generate advice ID
    const adviceId = `advice-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    
    // Create advice object - handle both formats
    const advice = isSimpleMessage(parsedArgs)
      ? {
          id: adviceId,
          content: parsedArgs.message,
          source_task_id: source_task_id,
          timestamp: Date.now(),
          read: false
        }
      : {
          id: adviceId,
          content: parsedArgs.content,
          title: parsedArgs.title,
          type: parsedArgs.type,
          priority: parsedArgs.priority,
          source_task_id: source_task_id,
          timestamp: Date.now(),
          read: false
        };
    
    // Log the target task directory path
    const tasksDir = await getTasksDirectoryForTask(target_task_id);
    const taskDir = path.join(tasksDir, target_task_id);
    logDebug(`[send_external_advice] Writing to task directory: ${taskDir}`);
    
    // Write advice to target task
    await writeAdviceToTask(target_task_id, advice);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            advice_id: adviceId,
            target_task_id
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    // Handle timeout errors specifically
    if ((error as Error).message.includes('Timeout')) {
      logError(FileErrorCode.TIMEOUT_ERROR, `Timeout in send_external_advice: ${(error as Error).message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: FileErrorCode.TIMEOUT_ERROR,
              error: `Operation timed out: ${(error as Error).message}`
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logError(ServerErrorCode.INVALID_ARGUMENTS, `Invalid arguments for send_external_advice: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error_code: ServerErrorCode.INVALID_ARGUMENTS,
              error: `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    // Handle other errors
    logError(ServerErrorCode.INTERNAL_ERROR, `Error in send_external_advice: ${(error as Error).message}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error_code: ServerErrorCode.INTERNAL_ERROR,
            error: `Error: ${(error as Error).message}`
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Initialize the MCP server
 * @returns Initialized MCP server
 */
export async function initMcpServer(): Promise<Server> {
  // Create a new MCP server
  const server = new Server(
    {
      name: 'cline-chat-reader',
      version: config.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    }
  );

  // Handle resources/list requests (empty)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: []
    };
  });

  // Handle resource templates (empty)
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
      resourceTemplates: []
    };
  });

  // Handle prompts/list requests (empty)
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: []
    };
  });

  // Define available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: config.tools.readLastMessages,
          description: 'Retrieve the last 20 messages from a conversation. If no task_id is provided, uses the active conversation.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'
              }
            },
            required: []
          }
        },
        {
          name: config.tools.readLast40Messages,
          description: 'Retrieve the last 40 messages from a conversation for more context. If no task_id is provided, uses the active conversation.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'
              }
            },
            required: []
          }
        },
        {
          name: config.tools.getActiveTask,
          description: 'Get the active task(s)',
          inputSchema: {
            type: 'object',
            properties: {
              label: {
                type: 'string',
                description: 'Optional label (A, B) to filter by'
              }
            },
            required: []
          }
        },
        {
          name: config.tools.sendExternalAdvice,
          description: 'Send advice to another conversation (supports both simple and structured formats)',
          inputSchema: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  target_task_id: {
                    type: 'string',
                    description: 'Task ID of the target conversation'
                  },
                  message: {
                    type: 'string',
                    description: 'The advice message to send'
                  },
                  source_task_id: {
                    type: 'string',
                    description: 'Task ID of the source conversation'
                  }
                },
                required: ['target_task_id', 'message']
              },
              {
                type: 'object',
                properties: {
                  target_task_id: {
                    type: 'string',
                    description: 'Task ID of the target conversation'
                  },
                  title: {
                    type: 'string',
                    description: 'Message title/summary'
                  },
                  content: {
                    type: 'string',
                    description: 'The advice message content'
                  },
                  type: {
                    type: 'string',
                    enum: ['info', 'warning', 'error'],
                    description: 'Message type'
                  },
                  priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Message priority'
                  },
                  source_task_id: {
                    type: 'string',
                    description: 'Task ID of the source conversation'
                  }
                },
                required: ['target_task_id', 'title', 'content']
              }
            ]
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
        case config.tools.readLastMessages:
          return await handleReadLastMessages(args);
          
        case config.tools.readLast40Messages:
          return await handleReadLast40Messages(args);
          
        case config.tools.getActiveTask:
          return await handleGetActiveTask(args);
          
        case config.tools.sendExternalAdvice:
          return await handleSendExternalAdvice(args);
          
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error) {
      logError(`Error executing tool ${name} (${ServerErrorCode.INTERNAL_ERROR}): ${(error as Error).message}`, error);
      
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
            text: JSON.stringify({
              error_code: ServerErrorCode.INTERNAL_ERROR,
              error: `Error: ${(error as Error).message}`
            }, null, 2),
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
 * Start the MCP server
 */
export async function startMcpServer() {
  try {
    // Initialize diagnostic logger
    const logLevel = process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : LogLevel.INFO;
    initDiagnosticLogger(logLevel);
    logInfo(`Starting MCP server with log level ${LogLevel[logLevel]} (${logLevel})`);
    
    // Initialize MCP server
    const server = await initMcpServer();
    
    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logInfo('Cline Chat Reader MCP server running on stdio');
    logInfo(`Version: ${config.version}`);
    logInfo('Supporting four essential tools:');
    logInfo(`- ${config.tools.readLastMessages}`);
    logInfo(`- ${config.tools.readLast40Messages}`);
    logInfo(`- ${config.tools.getActiveTask}`);
    logInfo(`- ${config.tools.sendExternalAdvice}`);
    
    // Handle process termination
    process.on('SIGINT', async () => {
      logInfo('Shutting down server...');
      process.exit(0);
    });
  } catch (error) {
    logError(`Error starting MCP server (${ServerErrorCode.INTERNAL_ERROR}): ${(error as Error).message}`, error);
    process.exit(1);
  }
}
