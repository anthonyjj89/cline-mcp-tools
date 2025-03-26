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
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
// Import VS Code monitoring tools
import {
  GetVSCodeWorkspacesSchema,
  AnalyzeWorkspaceSchema,
  GetFileHistorySchema,
  AnalyzeCloneActivitySchema,
  registerVSCodeMonitoringTools
} from './vscode-monitoring.js';
import { getVSCodeWorkspaces, getRecentlyModifiedFiles } from './utils/vscode-tracker.js';
import { getRecentChanges, getFileHistory, findGitRepository, getGitDiff, getUnpushedCommits, getUncommittedChanges } from './utils/git-analyzer.js';
import { getWorkspaceSettings, getWorkspaceInfo, getLaunchConfigurations, getRecommendedExtensions } from './utils/vscode-settings.js';
import { formatTimestamps, formatHumanReadable, getCurrentTime } from './utils/time-utils.js';
import { z } from 'zod';
import { 
  getVSCodeTasksDirectory, 
  getApiConversationFilePath, 
  getTasksDirectoryForTask, 
  findTaskAcrossPaths,
  ensureCrashReportsDirectories,
  isUltraExtensionPath
} from './utils/paths.js';
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
import { analyzeConversation } from './utils/conversation-analyzer-simple.js';
import { recoverCrashedConversation, formatRecoveredContext } from './utils/crash-recovery.js';
import { Message } from './models/task.js';

// Schema definitions for MCP tools
const GetLastNMessagesSchema = z.object({
  task_id: z.union([
    z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
    z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
    z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
  ]).optional(),
  limit: z.number()
    .optional()
    .describe('Maximum number of messages to retrieve (default: 50, max: 100)')
    .default(50)
    .transform(val => Math.min(val, 100))
});

const GetMessagesSinceSchema = z.object({
  task_id: z.union([
    z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
    z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
    z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
  ]).optional(),
  since: z.number().describe('Timestamp to retrieve messages from'),
  limit: z.number()
    .optional()
    .describe('Maximum number of messages to retrieve (default: 50, max: 100)')
    .default(50)
    .transform(val => Math.min(val, 100))
});

const GetConversationSummarySchema = z.object({
  task_id: z.union([
    z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
    z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
    z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
  ]).optional()
});

const FindCodeDiscussionsSchema = z.object({
  task_id: z.union([
    z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
    z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
    z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
  ]).optional(),
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

const AnalyzeConversationSchema = z.object({
  task_id: z.union([
    z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
    z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
    z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
  ]).optional(),
  minutes_back: z.number()
    .optional()
    .describe('Only analyze messages from the last X minutes (optional)')
});

const GetGitDiffSchema = z.object({
  filePath: z.string().describe('Path to the file to get diff for'),
  oldRef: z.string().optional().describe('Old Git reference (commit hash, branch, etc.)'),
  newRef: z.string().optional().describe('New Git reference (commit hash, branch, etc.)')
});

const GetUnpushedCommitsSchema = z.object({
  repoPath: z.string().describe('Path to the Git repository')
});

const GetUncommittedChangesSchema = z.object({
  repoPath: z.string().describe('Path to the Git repository')
});

const GetActiveTaskSchema = z.object({
  label: z.enum(['A', 'B']).optional()
    .describe('Filter by active label (A or B)'),
  task_id: z.string().optional()
    .describe('Check if this specific task ID is marked as active')
});

const RecoverCrashedChatSchema = z.object({
  task_id: z.string().describe('The ID of the crashed conversation to recover'),
  max_length: z.number()
    .optional()
    .describe('Maximum length of the summary')
    .default(2000),
  include_code_snippets: z.boolean()
    .optional()
    .describe('Whether to include code snippets in the summary')
    .default(true),
  save_to_crashreports: z.boolean()
    .optional()
    .describe('Whether to save the recovered context to the crash reports directory (Cline Ultra only)')
    .default(true)
});

const SendExternalAdviceSchema = z.object({
  content: z.string().describe('Advice content to send to the user'),
  title: z.string().optional().describe('Title for the advice notification'),
  type: z.enum(['info', 'warning', 'tip', 'task']).default('info').describe('Type of advice'),
  priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Priority level of the advice'),
  expiresAfter: z.number().optional().describe('Time in minutes after which the advice should expire'),
  relatedFiles: z.array(z.string()).optional().describe('Paths to files related to this advice'),
  task_id: z.string().optional().describe('Task ID (timestamp) of the conversation to send advice to. Required if active_label is not provided.'),
  active_label: z.enum(['A', 'B']).optional().describe('Label of the active conversation to send advice to (overrides task_id if specified). Required if task_id is not provided.')
}).refine(
  data => data.task_id !== undefined || data.active_label !== undefined,
  {
    message: "Either task_id or active_label must be provided",
    path: ["task_id"]
  }
);

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
        // VS Code monitoring tools
        {
          name: 'get_vscode_workspaces',
          description: 'Get a list of recently opened VS Code workspaces',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'analyze_workspace',
          description: 'Analyze a specific VS Code workspace',
          inputSchema: {
            type: 'object',
            properties: {
              workspacePath: {
                type: 'string',
                description: 'Path to the workspace to analyze'
              },
              hoursBack: {
                type: 'number',
                description: 'How many hours back to look for modified files (default: 24)',
                default: 24
              }
            },
            required: ['workspacePath']
          }
        },
        {
          name: 'get_file_history',
          description: 'Get Git history for a specific file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file to get history for'
              }
            },
            required: ['filePath']
          }
        },
        {
          name: 'analyze_cline_activity',
          description: 'Analyze recent VS Code activity across all workspaces',
          inputSchema: {
            type: 'object',
            properties: {
              hoursBack: {
                type: 'number',
                description: 'How many hours back to look for activity (default: 24)',
                default: 24
              }
            },
            required: []
          }
        },
        // Original tools
        {
          name: 'get_last_n_messages',
          description: 'Retrieve the last N messages from a conversation. If no task_id is provided, uses the active conversation.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of messages to retrieve (default: 50, max: 100)',
                default: 50
              }
            },
            required: []
          }
        },
        {
          name: 'get_messages_since',
          description: 'Retrieve messages after a specific timestamp. If no task_id is provided, uses the active conversation.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'
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
            required: ['since']
          }
        },
        {
          name: 'get_conversation_summary',
          description: 'Generate a concise summary of the conversation. If no task_id is provided, uses the active conversation.',
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
          name: 'find_code_discussions',
          description: 'Identify discussions about specific code files or snippets. If no task_id is provided, uses the active conversation.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'
              },
              filename: {
                type: 'string',
                description: 'Filename to filter discussions by (optional)'
              }
            },
            required: []
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
        },
        {
          name: 'analyze_conversation',
          description: 'Analyze a conversation to extract key information, topics, and patterns. If no task_id is provided, uses the active conversation.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'
              },
              minutes_back: {
                type: 'number',
                description: 'Only analyze messages from the last X minutes (optional)'
              }
            },
            required: []
          }
        },
        {
          name: 'get_git_diff',
          description: 'Get Git diff for a specific file between references or working directory and HEAD',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file to get diff for'
              },
              oldRef: {
                type: 'string',
                description: 'Old Git reference (commit hash, branch, etc.)'
              },
              newRef: {
                type: 'string',
                description: 'New Git reference (commit hash, branch, etc.)'
              }
            },
            required: ['filePath']
          }
        },
        {
          name: 'get_unpushed_commits',
          description: 'Get commits that exist locally but have not been pushed to the remote repository',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to the Git repository'
              }
            },
            required: ['repoPath']
          }
        },
        {
          name: 'get_uncommitted_changes',
          description: 'Get all uncommitted changes in a Git repository including modified, staged, and untracked files',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to the Git repository'
              }
            },
            required: ['repoPath']
          }
        },
        {
          name: 'get_active_task',
          description: 'Get the currently active task/conversation(s) as indicated by the user in VS Code',
          inputSchema: {
            type: 'object',
            properties: {
              label: {
                type: 'string',
                description: 'Filter by active label (A or B)',
                enum: ['A', 'B']
              },
              task_id: {
                type: 'string',
                description: 'Check if this specific task ID is marked as active'
              }
            }
          }
        },
        {
          name: 'send_external_advice',
          description: 'Send a recommendation or advice directly to the VS Code extension as a notification (NOTE: This feature only works with Cline Ultra, not with the standard Cline extension)',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Advice content to send to the user'
              },
              title: {
                type: 'string',
                description: 'Title for the advice notification'
              },
              type: {
                type: 'string',
                enum: ['info', 'warning', 'tip', 'task'],
                default: 'info',
                description: 'Type of advice'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                default: 'medium',
                description: 'Priority level of the advice'
              },
              expiresAfter: {
                type: 'number',
                description: 'Time in minutes after which the advice should expire'
              },
              relatedFiles: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Paths to files related to this advice'
              },
              task_id: {
                type: 'string',
                description: 'Task ID (timestamp) of the conversation to send advice to. Required if active_label is not provided.'
              },
              active_label: {
                type: 'string',
                enum: ['A', 'B'],
                description: 'Label of the active conversation to send advice to (overrides task_id if specified). Required if task_id is not provided.'
              }
            },
            required: ['content']
          }
        },
        {
          name: 'recover_crashed_chat',
          description: 'Recover context from a crashed conversation that cannot be reopened. Saves the recovered context to the crash reports directory in Cline Ultra for easy access.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'The ID of the crashed conversation to recover'
              },
              max_length: {
                type: 'number',
                description: 'Maximum length of the summary',
                default: 2000
              },
              include_code_snippets: {
                type: 'boolean',
                description: 'Whether to include code snippets in the summary',
                default: true
              },
              save_to_crashreports: {
                type: 'boolean',
                description: 'Whether to save the recovered context to the crash reports directory (Cline Ultra only)',
                default: true
              }
            },
            required: ['task_id']
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
        // VS Code monitoring tools
        case 'get_vscode_workspaces':
          return await handleGetVSCodeWorkspaces(args);
        
        case 'analyze_workspace':
          return await handleAnalyzeWorkspace(args);
        
        case 'get_file_history':
          return await handleGetFileHistory(args);
        
        case 'analyze_cline_activity':
          return await handleAnalyzeCloneActivity(args);
        
        // Original tools
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
        
        case 'analyze_conversation':
          return await handleAnalyzeConversation(tasksDir, args);
        
        case 'get_git_diff':
          return await handleGetGitDiff(args);
        
        case 'get_unpushed_commits':
          return await handleGetUnpushedCommits(args);
        
        case 'get_uncommitted_changes':
          return await handleGetUncommittedChanges(args);
        
        case 'get_active_task':
          return await handleGetActiveTask(args);
          
        case 'send_external_advice':
          return await handleSendExternalAdvice(tasksDir, args);
          
        case 'recover_crashed_chat':
          return await handleRecoverCrashedChat(tasksDir, args);
          
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
  
  // Initialize variables
  let targetTaskId: string | undefined = task_id;
  let isActiveTask = false;
  let activeLabel: string | null = null;
  let originalTaskId = task_id;
  
  // Check for special placeholder values
  const isRequestingActiveA = task_id === "ACTIVE_A";
  const isRequestingActiveB = task_id === "ACTIVE_B";
  
  // Get active tasks data
  const homedir = os.homedir();
  const ultraActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  const standardActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  let activeTasksData = null;
  
  // Try to read the active tasks file from both locations
  if (await fs.pathExists(ultraActivePath)) {
    try {
      const content = await fs.readFile(ultraActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading ultra active tasks file:', error);
    }
  }
  
  if (!activeTasksData && await fs.pathExists(standardActivePath)) {
    try {
      const content = await fs.readFile(standardActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading standard active tasks file:', error);
    }
  }
  
  // Handle case when no task_id is provided or special placeholder is used
  if (!task_id || isRequestingActiveA || isRequestingActiveB) {
    // Look for Active A first, then Active B (unless specifically requesting B)
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      let activeTask = null;
      
      if (isRequestingActiveB) {
        // If specifically requesting Active B, only look for B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = 'B';
        }
      } else {
        // Otherwise, prioritize A then fall back to B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                    activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = activeTask.label;
        }
      }
      
      if (activeTask) {
        targetTaskId = activeTask.id;
        isActiveTask = true;
      } else if (isRequestingActiveA || isRequestingActiveB) {
        // If specifically requesting an active task that doesn't exist
        const requestedLabel = isRequestingActiveA ? 'A' : 'B';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `No conversation marked as Active ${requestedLabel} was found.`,
                recommendation: "Please open VS Code and click the waving hand icon in a conversation to mark it as active."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    } else if (!task_id || isRequestingActiveA || isRequestingActiveB) {
      // No active tasks found when none was provided or specifically requested
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: "No active conversation found. Please open VS Code and click the waving hand icon in a conversation to mark it as Active A or B.",
              recommendation: "The user needs to mark a conversation as active in Cline Ultra."
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  } else {
    // A task_id was provided (not a special placeholder)
    // Check if the provided task_id is valid
    try {
      // Try to get the tasks directory for this task to see if it exists
      await getTasksDirectoryForTask(task_id);
    } catch (error) {
      // If task_id is invalid, fall back to active tasks
      if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
        // Prioritize Active A, then Active B
        const activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                          activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        
        if (activeTask) {
          targetTaskId = activeTask.id;
          isActiveTask = true;
          activeLabel = activeTask.label;
        } else {
          // No active tasks found and invalid task_id
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Task ID ${task_id} not found and no active conversations available.`,
                  recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } else {
        // No active tasks and invalid task_id
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Task ID ${task_id} not found.`,
                recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
    
    // Valid task_id provided, but still check for Active A to prioritize it
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      const activeATask = activeTasksData.activeTasks.find((t: any) => t.label === 'A');
      if (activeATask && activeATask.id !== task_id) {
        targetTaskId = activeATask.id;
        isActiveTask = true;
        activeLabel = 'A';
      }
    }
  }
  
  // Ensure we have a valid targetTaskId
  if (!targetTaskId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: "No valid task ID could be determined. Please provide a valid task ID or mark a conversation as active in VS Code.",
            recommendation: "The user needs to mark a conversation as active in Cline Ultra or provide a valid task ID."
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
  
  // Get the appropriate tasks directory for this specific task
  const specificTasksDir = await getTasksDirectoryForTask(targetTaskId);
  
  // Get conversation messages
  const messages = await getConversationHistory(specificTasksDir, targetTaskId, { limit });
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id: targetTaskId,
          original_task_id: originalTaskId !== targetTaskId ? originalTaskId : undefined,
          is_active_task: isActiveTask,
          active_label: activeLabel,
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
  
  // Initialize variables
  let targetTaskId: string | undefined = task_id;
  let isActiveTask = false;
  let activeLabel: string | null = null;
  let originalTaskId = task_id;
  
  // Check for special placeholder values
  const isRequestingActiveA = task_id === "ACTIVE_A";
  const isRequestingActiveB = task_id === "ACTIVE_B";
  
  // Get active tasks data
  const homedir = os.homedir();
  const ultraActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  const standardActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  let activeTasksData = null;
  
  // Try to read the active tasks file from both locations
  if (await fs.pathExists(ultraActivePath)) {
    try {
      const content = await fs.readFile(ultraActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading ultra active tasks file:', error);
    }
  }
  
  if (!activeTasksData && await fs.pathExists(standardActivePath)) {
    try {
      const content = await fs.readFile(standardActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading standard active tasks file:', error);
    }
  }
  
  // Handle case when no task_id is provided or special placeholder is used
  if (!task_id || isRequestingActiveA || isRequestingActiveB) {
    // Look for Active A first, then Active B (unless specifically requesting B)
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      let activeTask = null;
      
      if (isRequestingActiveB) {
        // If specifically requesting Active B, only look for B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = 'B';
        }
      } else {
        // Otherwise, prioritize A then fall back to B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                    activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = activeTask.label;
        }
      }
      
      if (activeTask) {
        targetTaskId = activeTask.id;
        isActiveTask = true;
      } else if (isRequestingActiveA || isRequestingActiveB) {
        // If specifically requesting an active task that doesn't exist
        const requestedLabel = isRequestingActiveA ? 'A' : 'B';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `No conversation marked as Active ${requestedLabel} was found.`,
                recommendation: "Please open VS Code and click the waving hand icon in a conversation to mark it as active."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    } else if (!task_id || isRequestingActiveA || isRequestingActiveB) {
      // No active tasks found when none was provided or specifically requested
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: "No active conversation found. Please open VS Code and click the waving hand icon in a conversation to mark it as Active A or B.",
              recommendation: "The user needs to mark a conversation as active in Cline Ultra."
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  } else {
    // A task_id was provided (not a special placeholder)
    // Check if the provided task_id is valid
    try {
      // Try to get the tasks directory for this task to see if it exists
      await getTasksDirectoryForTask(task_id);
    } catch (error) {
      // If task_id is invalid, fall back to active tasks
      if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
        // Prioritize Active A, then Active B
        const activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                          activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        
        if (activeTask) {
          targetTaskId = activeTask.id;
          isActiveTask = true;
          activeLabel = activeTask.label;
        } else {
          // No active tasks found and invalid task_id
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Task ID ${task_id} not found and no active conversations available.`,
                  recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } else {
        // No active tasks and invalid task_id
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Task ID ${task_id} not found.`,
                recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
    
    // Valid task_id provided, but still check for Active A to prioritize it
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      const activeATask = activeTasksData.activeTasks.find((t: any) => t.label === 'A');
      if (activeATask && activeATask.id !== task_id) {
        targetTaskId = activeATask.id;
        isActiveTask = true;
        activeLabel = 'A';
      }
    }
  }
  
  // Ensure we have a valid targetTaskId
  if (!targetTaskId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: "No valid task ID could be determined. Please provide a valid task ID or mark a conversation as active in VS Code.",
            recommendation: "The user needs to mark a conversation as active in Cline Ultra or provide a valid task ID."
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
  
  // Get the appropriate tasks directory for this specific task
  const specificTasksDir = await getTasksDirectoryForTask(targetTaskId);
  
  // Get messages since timestamp
  const messages = await getConversationHistory(specificTasksDir, targetTaskId, { since, limit });
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id: targetTaskId,
          original_task_id: originalTaskId !== targetTaskId ? originalTaskId : undefined,
          is_active_task: isActiveTask,
          active_label: activeLabel,
          since: formatTimestamps(since),
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
  
  // Initialize variables
  let targetTaskId: string | undefined = task_id;
  let isActiveTask = false;
  let activeLabel: string | null = null;
  let originalTaskId = task_id;
  
  // Check for special placeholder values
  const isRequestingActiveA = task_id === "ACTIVE_A";
  const isRequestingActiveB = task_id === "ACTIVE_B";
  
  // Get active tasks data
  const homedir = os.homedir();
  const ultraActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  const standardActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  let activeTasksData = null;
  
  // Try to read the active tasks file from both locations
  if (await fs.pathExists(ultraActivePath)) {
    try {
      const content = await fs.readFile(ultraActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading ultra active tasks file:', error);
    }
  }
  
  if (!activeTasksData && await fs.pathExists(standardActivePath)) {
    try {
      const content = await fs.readFile(standardActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading standard active tasks file:', error);
    }
  }
  
  // Handle case when no task_id is provided or special placeholder is used
  if (!task_id || isRequestingActiveA || isRequestingActiveB) {
    // Look for Active A first, then Active B (unless specifically requesting B)
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      let activeTask = null;
      
      if (isRequestingActiveB) {
        // If specifically requesting Active B, only look for B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = 'B';
        }
      } else {
        // Otherwise, prioritize A then fall back to B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                    activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = activeTask.label;
        }
      }
      
      if (activeTask) {
        targetTaskId = activeTask.id;
        isActiveTask = true;
      } else if (isRequestingActiveA || isRequestingActiveB) {
        // If specifically requesting an active task that doesn't exist
        const requestedLabel = isRequestingActiveA ? 'A' : 'B';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `No conversation marked as Active ${requestedLabel} was found.`,
                recommendation: "Please open VS Code and click the waving hand icon in a conversation to mark it as active."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    } else if (!task_id || isRequestingActiveA || isRequestingActiveB) {
      // No active tasks found when none was provided or specifically requested
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: "No active conversation found. Please open VS Code and click the waving hand icon in a conversation to mark it as Active A or B.",
              recommendation: "The user needs to mark a conversation as active in Cline Ultra."
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  } else {
    // A task_id was provided (not a special placeholder)
    // Check if the provided task_id is valid
    try {
      // Try to get the tasks directory for this task to see if it exists
      await getTasksDirectoryForTask(task_id);
    } catch (error) {
      // If task_id is invalid, fall back to active tasks
      if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
        // Prioritize Active A, then Active B
        const activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                          activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        
        if (activeTask) {
          targetTaskId = activeTask.id;
          isActiveTask = true;
          activeLabel = activeTask.label;
        } else {
          // No active tasks found and invalid task_id
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Task ID ${task_id} not found and no active conversations available.`,
                  recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } else {
        // No active tasks and invalid task_id
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Task ID ${task_id} not found.`,
                recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
    
    // Valid task_id provided, but still check for Active A to prioritize it
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      const activeATask = activeTasksData.activeTasks.find((t: any) => t.label === 'A');
      if (activeATask && activeATask.id !== task_id) {
        targetTaskId = activeATask.id;
        isActiveTask = true;
        activeLabel = 'A';
      }
    }
  }
  
  // Ensure we have a valid targetTaskId
  if (!targetTaskId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: "No valid task ID could be determined. Please provide a valid task ID or mark a conversation as active in VS Code.",
            recommendation: "The user needs to mark a conversation as active in Cline Ultra or provide a valid task ID."
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
  
  // Get the appropriate tasks directory for this specific task
  const specificTasksDir = await getTasksDirectoryForTask(targetTaskId);
  
  // Get conversation summary
  const summary = await getTaskSummary(specificTasksDir, targetTaskId);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          ...summary,
          task_id: targetTaskId,
          original_task_id: originalTaskId !== targetTaskId ? originalTaskId : undefined,
          is_active_task: isActiveTask,
          active_label: activeLabel
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle find_code_discussions tool call
 */
async function handleFindCodeDiscussions(tasksDir: string, args: unknown) {
  const { task_id, filename } = FindCodeDiscussionsSchema.parse(args);
  
  // Initialize variables
  let targetTaskId: string | undefined = task_id;
  let isActiveTask = false;
  let activeLabel: string | null = null;
  let originalTaskId = task_id;
  
  // Check for special placeholder values
  const isRequestingActiveA = task_id === "ACTIVE_A";
  const isRequestingActiveB = task_id === "ACTIVE_B";
  
  // Get active tasks data
  const homedir = os.homedir();
  const ultraActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  const standardActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  let activeTasksData = null;
  
  // Try to read the active tasks file from both locations
  if (await fs.pathExists(ultraActivePath)) {
    try {
      const content = await fs.readFile(ultraActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading ultra active tasks file:', error);
    }
  }
  
  if (!activeTasksData && await fs.pathExists(standardActivePath)) {
    try {
      const content = await fs.readFile(standardActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading standard active tasks file:', error);
    }
  }
  
  // Handle case when no task_id is provided or special placeholder is used
  if (!task_id || isRequestingActiveA || isRequestingActiveB) {
    // Look for Active A first, then Active B (unless specifically requesting B)
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      let activeTask = null;
      
      if (isRequestingActiveB) {
        // If specifically requesting Active B, only look for B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = 'B';
        }
      } else {
        // Otherwise, prioritize A then fall back to B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                    activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = activeTask.label;
        }
      }
      
      if (activeTask) {
        targetTaskId = activeTask.id;
        isActiveTask = true;
      } else if (isRequestingActiveA || isRequestingActiveB) {
        // If specifically requesting an active task that doesn't exist
        const requestedLabel = isRequestingActiveA ? 'A' : 'B';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `No conversation marked as Active ${requestedLabel} was found.`,
                recommendation: "Please open VS Code and click the waving hand icon in a conversation to mark it as active."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    } else if (!task_id || isRequestingActiveA || isRequestingActiveB) {
      // No active tasks found when none was provided or specifically requested
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: "No active conversation found. Please open VS Code and click the waving hand icon in a conversation to mark it as Active A or B.",
              recommendation: "The user needs to mark a conversation as active in Cline Ultra."
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  } else {
    // A task_id was provided (not a special placeholder)
    // Check if the provided task_id is valid
    try {
      // Try to get the tasks directory for this task to see if it exists
      await getTasksDirectoryForTask(task_id);
    } catch (error) {
      // If task_id is invalid, fall back to active tasks
      if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
        // Prioritize Active A, then Active B
        const activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                          activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        
        if (activeTask) {
          targetTaskId = activeTask.id;
          isActiveTask = true;
          activeLabel = activeTask.label;
        } else {
          // No active tasks found and invalid task_id
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Task ID ${task_id} not found and no active conversations available.`,
                  recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } else {
        // No active tasks and invalid task_id
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Task ID ${task_id} not found.`,
                recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
    
    // Valid task_id provided, but still check for Active A to prioritize it
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      const activeATask = activeTasksData.activeTasks.find((t: any) => t.label === 'A');
      if (activeATask && activeATask.id !== task_id) {
        targetTaskId = activeATask.id;
        isActiveTask = true;
        activeLabel = 'A';
      }
    }
  }
  
  // Ensure we have a valid targetTaskId
  if (!targetTaskId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: "No valid task ID could be determined. Please provide a valid task ID or mark a conversation as active in VS Code.",
            recommendation: "The user needs to mark a conversation as active in Cline Ultra or provide a valid task ID."
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
  
  // Get the appropriate tasks directory for this specific task
  const specificTasksDir = await getTasksDirectoryForTask(targetTaskId);
  
  // Find code discussions
  const discussions = await findCodeDiscussions(specificTasksDir, targetTaskId, filename || null);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id: targetTaskId,
          original_task_id: originalTaskId !== targetTaskId ? originalTaskId : undefined,
          is_active_task: isActiveTask,
          active_label: activeLabel,
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
  
  // Get both Cline Ultra and standard Cline paths
  const homedir = os.homedir();
  const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks');
  const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
  
  // List tasks from both directories
  const ultraTasks = await fs.pathExists(ultraPath) ? await listTasks(ultraPath) : [];
  const standardTasks = await fs.pathExists(standardPath) ? await listTasks(standardPath) : [];
  
  // Merge and sort tasks by timestamp
  const allTasks = [...ultraTasks, ...standardTasks].sort((a, b) => b.timestamp - a.timestamp);
  
  // Limit the number of tasks
  const limitedTasks = allTasks.slice(0, limit);
  
  // Get details for each task
  const taskDetails = await Promise.all(
    limitedTasks.map(async (task: any) => {
      // Get the appropriate tasks directory for this specific task
      const specificTasksDir = await getTasksDirectoryForTask(task.id);
      return await getTask(specificTasksDir, task.id);
    })
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
  
  // Get the appropriate tasks directory for this specific task
  const specificTasksDir = await getTasksDirectoryForTask(task_id);
  
  // Get task details
  const task = await getTask(specificTasksDir, task_id);
  
  // Get a preview of the conversation
  const previewMessages = await getConversationHistory(specificTasksDir, task_id, { limit: 5 });
  
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
  
  // Get both Cline Ultra and standard Cline paths
  const homedir = os.homedir();
  const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks');
  const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
  
  // Search in both directories
  const ultraResults = await fs.pathExists(ultraPath) ? 
    await searchConversations(ultraPath, search_term, {
      limit: limit * 2, // Double the limit since we'll merge and limit later
      maxTasksToSearch: Math.ceil(max_tasks_to_search / 2) // Split the max tasks between both directories
    }) : [];
  
  const standardResults = await fs.pathExists(standardPath) ? 
    await searchConversations(standardPath, search_term, {
      limit: limit * 2, // Double the limit since we'll merge and limit later
      maxTasksToSearch: Math.ceil(max_tasks_to_search / 2) // Split the max tasks between both directories
    }) : [];
  
  // Merge results and sort by timestamp (most recent first)
  const allResults = [...ultraResults, ...standardResults]
    .sort((a, b) => {
      // Sort by timestamp if available, otherwise keep original order
      const timestampA = a.message?.timestamp || 0;
      const timestampB = b.message?.timestamp || 0;
      return timestampB - timestampA;
    })
    .slice(0, limit); // Apply the final limit
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          search_term,
          result_count: allResults.length,
          results: allResults
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle get_vscode_workspaces tool call
 */
async function handleGetVSCodeWorkspaces(args: unknown) {
  const _ = GetVSCodeWorkspacesSchema.parse(args);
  
  // Get VS Code workspaces
  const workspaces = getVSCodeWorkspaces();
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          workspaces,
          count: workspaces.length
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle analyze_workspace tool call
 */
async function handleAnalyzeWorkspace(args: unknown) {
  const { workspacePath, hoursBack } = AnalyzeWorkspaceSchema.parse(args);
  
  // Check if the workspace exists
  if (!fs.existsSync(workspacePath)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Workspace path does not exist: ${workspacePath}`
    );
  }
  
  // Get workspace info
  const workspaceInfo = getWorkspaceInfo(workspacePath);
  
  // Get VS Code settings
  const settings = getWorkspaceSettings(workspacePath);
  
  // Get launch configurations
  const launchConfig = getLaunchConfigurations(workspacePath);
  
  // Get recommended extensions
  const extensions = getRecommendedExtensions(workspacePath);
  
  // Get Git info if it's a repo
  const gitInfo = await getRecentChanges(workspacePath);
  
  // Get recently modified files
  const recentFiles = getRecentlyModifiedFiles(workspacePath, hoursBack);
  
  // Group files by type for better analysis
  const filesByType: Record<string, any[]> = {};
  recentFiles.forEach(file => {
    const ext = file.extension || 'unknown';
    if (!filesByType[ext]) filesByType[ext] = [];
    filesByType[ext].push(file);
  });
  
  // Prepare the result
  const result = {
    workspace: workspaceInfo,
    settings,
    launchConfig,
    extensions,
    gitInfo,
    recentFiles: {
      count: recentFiles.length,
      byType: filesByType,
      mostRecent: recentFiles.slice(0, 10) // Just the 10 most recent
    }
  };
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * Handle get_file_history tool call
 */
async function handleGetFileHistory(args: unknown) {
  const { filePath } = GetFileHistorySchema.parse(args);
  
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `File does not exist: ${filePath}`
    );
  }
  
  // Try to find the Git repo that contains this file
  const repoPath = findGitRepository(filePath);
  
  if (repoPath) {
    // Get Git history for the file
    const history = await getFileHistory(repoPath, filePath);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(history, null, 2),
        },
      ],
    };
  }
  
  // If not in a Git repo, just return file info
  try {
    const stats = fs.statSync(filePath);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isGitRepo: false,
            fileInfo: {
              path: filePath,
              lastModified: formatTimestamps(stats.mtime),
              size: stats.size,
              created: formatTimestamps(stats.birthtime)
            }
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get file info: ${(error as Error).message}`
    );
  }
}

/**
 * Handle analyze_cline_activity tool call
 */
async function handleAnalyzeCloneActivity(args: unknown) {
  const { hoursBack } = AnalyzeCloneActivitySchema.parse(args);
  
  // Get all VS Code workspaces
  const workspaces = getVSCodeWorkspaces();
  
  const results = [];
  
  for (const workspace of workspaces) {
    // Skip if not a real path
    if (!fs.existsSync(workspace)) continue;
    
    // Get workspace info
    const workspaceInfo = getWorkspaceInfo(workspace);
    
    // Check if it's a Git repo
    const gitInfo = await getRecentChanges(workspace);
    
    // Get recently modified files
    const recentFiles = getRecentlyModifiedFiles(workspace, hoursBack);
    
    // Only include workspaces with recent activity
    if (recentFiles.length > 0 || (gitInfo.isGitRepo && gitInfo.commits && gitInfo.commits.length > 0)) {
      results.push({
        workspace: workspaceInfo,
        path: workspace,
        gitInfo,
        recentFileCount: recentFiles.length,
        mostRecentFiles: recentFiles.slice(0, 5).map(f => ({
          path: path.relative(workspace, f.path),
          lastModified: formatTimestamps(f.lastModified)
        }))
      });
    }
  }
  
  // Sort results by number of recent files (most active first)
  results.sort((a, b) => b.recentFileCount - a.recentFileCount);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          timestamp: getCurrentTime(),
          workspaceCount: results.length,
          workspaces: results
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle analyze_conversation tool call
 */
async function handleAnalyzeConversation(tasksDir: string, args: unknown) {
  const { task_id, minutes_back } = AnalyzeConversationSchema.parse(args);
  
  // Initialize variables
  let targetTaskId: string | undefined = task_id;
  let isActiveTask = false;
  let activeLabel: string | null = null;
  let originalTaskId = task_id;
  
  // Check for special placeholder values
  const isRequestingActiveA = task_id === "ACTIVE_A";
  const isRequestingActiveB = task_id === "ACTIVE_B";
  
  // Get active tasks data
  const homedir = os.homedir();
  const ultraActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  const standardActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  let activeTasksData = null;
  
  // Try to read the active tasks file from both locations
  if (await fs.pathExists(ultraActivePath)) {
    try {
      const content = await fs.readFile(ultraActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading ultra active tasks file:', error);
    }
  }
  
  if (!activeTasksData && await fs.pathExists(standardActivePath)) {
    try {
      const content = await fs.readFile(standardActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading standard active tasks file:', error);
    }
  }
  
  // Handle case when no task_id is provided or special placeholder is used
  if (!task_id || isRequestingActiveA || isRequestingActiveB) {
    // Look for Active A first, then Active B (unless specifically requesting B)
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      let activeTask = null;
      
      if (isRequestingActiveB) {
        // If specifically requesting Active B, only look for B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = 'B';
        }
      } else {
        // Otherwise, prioritize A then fall back to B
        activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                    activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        if (activeTask) {
          activeLabel = activeTask.label;
        }
      }
      
      if (activeTask) {
        targetTaskId = activeTask.id;
        isActiveTask = true;
      } else if (isRequestingActiveA || isRequestingActiveB) {
        // If specifically requesting an active task that doesn't exist
        const requestedLabel = isRequestingActiveA ? 'A' : 'B';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `No conversation marked as Active ${requestedLabel} was found.`,
                recommendation: "Please open VS Code and click the waving hand icon in a conversation to mark it as active."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    } else if (!task_id || isRequestingActiveA || isRequestingActiveB) {
      // No active tasks found when none was provided or specifically requested
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: "No active conversation found. Please open VS Code and click the waving hand icon in a conversation to mark it as Active A or B.",
              recommendation: "The user needs to mark a conversation as active in Cline Ultra."
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  } else {
    // A task_id was provided (not a special placeholder)
    // Check if the provided task_id is valid
    try {
      // Try to get the tasks directory for this task to see if it exists
      await getTasksDirectoryForTask(task_id);
    } catch (error) {
      // If task_id is invalid, fall back to active tasks
      if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
        // Prioritize Active A, then Active B
        const activeTask = activeTasksData.activeTasks.find((t: any) => t.label === 'A') || 
                          activeTasksData.activeTasks.find((t: any) => t.label === 'B');
        
        if (activeTask) {
          targetTaskId = activeTask.id;
          isActiveTask = true;
          activeLabel = activeTask.label;
        } else {
          // No active tasks found and invalid task_id
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Task ID ${task_id} not found and no active conversations available.`,
                  recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } else {
        // No active tasks and invalid task_id
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Task ID ${task_id} not found.`,
                recommendation: "Please provide a valid task ID or mark a conversation as active in Cline Ultra."
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
    
    // Valid task_id provided, but still check for Active A to prioritize it
    if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
      const activeATask = activeTasksData.activeTasks.find((t: any) => t.label === 'A');
      if (activeATask && activeATask.id !== task_id) {
        targetTaskId = activeATask.id;
        isActiveTask = true;
        activeLabel = 'A';
      }
    }
  }
  
  // Ensure we have a valid targetTaskId
  if (!targetTaskId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: "No valid task ID could be determined. Please provide a valid task ID or mark a conversation as active in VS Code.",
            recommendation: "The user needs to mark a conversation as active in Cline Ultra or provide a valid task ID."
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
  
  // Get the appropriate tasks directory for this specific task
  const specificTasksDir = await getTasksDirectoryForTask(targetTaskId);
  
  // Get the API conversation file path
  const apiFilePath = getApiConversationFilePath(specificTasksDir, targetTaskId);
  
  // Calculate timestamp for filtering if minutes_back is provided
  const since = minutes_back ? Date.now() - (minutes_back * 60 * 1000) : 0;
  
  // Analyze the conversation
  const analysis = await analyzeConversation(apiFilePath, since);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id: targetTaskId,
          original_task_id: originalTaskId !== targetTaskId ? originalTaskId : undefined,
          is_active_task: isActiveTask,
          active_label: activeLabel,
          time_window: minutes_back ? `last ${minutes_back} minutes` : 'all',
          time_info: minutes_back ? {
            since: formatTimestamps(since),
            now: getCurrentTime()
          } : null,
          analysis
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle get_git_diff tool call
 */
async function handleGetGitDiff(args: unknown) {
  const { filePath, oldRef, newRef } = GetGitDiffSchema.parse(args);
  
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `File does not exist: ${filePath}`
    );
  }
  
  // Try to find the Git repo that contains this file
  const repoPath = findGitRepository(filePath);
  
  if (!repoPath) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isGitRepo: false,
            error: 'File is not in a Git repository'
          }, null, 2),
        },
      ],
    };
  }
  
  // Get Git diff for the file
  const diff = await getGitDiff(repoPath, filePath, oldRef, newRef);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(diff, null, 2),
      },
    ],
  };
}

/**
 * Handle get_unpushed_commits tool call
 */
async function handleGetUnpushedCommits(args: unknown) {
  const { repoPath } = GetUnpushedCommitsSchema.parse(args);
  
  // Check if the repository exists
  if (!fs.existsSync(repoPath)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Repository path does not exist: ${repoPath}`
    );
  }
  
  // Get unpushed commits
  const unpushedInfo = await getUnpushedCommits(repoPath);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(unpushedInfo, null, 2),
      },
    ],
  };
}

/**
 * Handle get_uncommitted_changes tool call
 */
async function handleGetUncommittedChanges(args: unknown) {
  const { repoPath } = GetUncommittedChangesSchema.parse(args);
  
  // Check if the repository exists
  if (!fs.existsSync(repoPath)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Repository path does not exist: ${repoPath}`
    );
  }
  
  // Get uncommitted changes
  const uncommittedInfo = await getUncommittedChanges(repoPath);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(uncommittedInfo, null, 2),
      },
    ],
  };
}

/**
 * Handle get_active_task tool call
 */
async function handleGetActiveTask(args: unknown) {
  const { label, task_id } = GetActiveTaskSchema.parse(args);
  
  // Look for active_tasks.json file in both standard and Ultra paths
  const homedir = os.homedir();
  const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  // Try ultra path first, then standard path
  let activeTasksData = null;
  
  if (await fs.pathExists(ultraPath)) {
    try {
      const content = await fs.readFile(ultraPath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading ultra active tasks file:', error);
    }
  }
  
  if (!activeTasksData && await fs.pathExists(standardPath)) {
    try {
      const content = await fs.readFile(standardPath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading standard active tasks file:', error);
    }
  }
  
  // Check if a specific task_id is provided to check its active status
  if (task_id && activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
    const activeTask = activeTasksData.activeTasks.find((t: any) => t.id === task_id);
    
    if (activeTask) {
      // Task is active, get its details
      const tasksDir = await getTasksDirectoryForTask(activeTask.id);
      const task = await getTask(tasksDir, activeTask.id);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              is_active: true,
              active_label: activeTask.label,
              last_activated: formatTimestamps(activeTask.lastActivated),
              task_details: {
                ...task,
                active_label: activeTask.label,
                last_activated: formatTimestamps(activeTask.lastActivated)
              }
            }, null, 2),
          },
        ],
      };
    } else {
      // Task is not active
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              is_active: false,
              task_id,
              message: `The task with ID ${task_id} is not marked as active. The user can click the waving hand icon in Cline Ultra to mark it as active.`
            }, null, 2),
          },
        ],
      };
    }
  }
  
  // Handle regular active task listing (no specific task_id provided)
  if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
    // Filter by label if specified
    let filteredTasks = activeTasksData.activeTasks;
    if (label) {
      filteredTasks = activeTasksData.activeTasks.filter((task: any) => task.label === label);
    }
    
    if (filteredTasks.length > 0) {
      // Sort by lastActivated (most recent first)
      filteredTasks.sort((a: any, b: any) => b.lastActivated - a.lastActivated);
      
      // Get details for all active tasks
      const taskDetails = await Promise.all(
        filteredTasks.map(async (taskInfo: any) => {
          const tasksDir = await getTasksDirectoryForTask(taskInfo.id);
          const task = await getTask(tasksDir, taskInfo.id);
          return {
            ...task,
            active_label: taskInfo.label,
            last_activated: formatTimestamps(taskInfo.lastActivated)
          };
        })
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              active_tasks: taskDetails,
              count: taskDetails.length,
              filtered_by_label: label ? label : null
            }, null, 2),
          },
        ],
      };
    }
  }
  
  // If no active tasks are found, return an empty list with a helpful message
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          active_tasks: [],
          count: 0,
          message: "No conversations are currently marked as active in VS Code. The user can click the waving hand icon in Cline Ultra to mark a conversation as active."
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle send_external_advice tool call
 */
async function handleSendExternalAdvice(tasksDir: string, args: unknown) {
  const { content, title, type, priority, expiresAfter, relatedFiles, task_id, active_label } = SendExternalAdviceSchema.parse(args);
  
  // First check if there are active tasks
  const homedir = os.homedir();
  const ultraActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'active_tasks.json');
  const standardActivePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
  
  let activeTasksData = null;
  
  // Try to read the active tasks file from both locations
  if (await fs.pathExists(ultraActivePath)) {
    try {
      const content = await fs.readFile(ultraActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading ultra active tasks file:', error);
    }
  }
  
  if (!activeTasksData && await fs.pathExists(standardActivePath)) {
    try {
      const content = await fs.readFile(standardActivePath, 'utf8');
      activeTasksData = JSON.parse(content);
    } catch (error) {
      console.error('Error reading standard active tasks file:', error);
    }
  }
  
  // Initialize targetTaskId with task_id (which might be undefined)
  let targetTaskId: string | undefined = task_id;
  let targetTaskLabel: string | null = null;
  
  // If active tasks exist and active_label is specified, try to find that active task
  if (activeTasksData && activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
    if (active_label) {
      // Find the task with the specified active label
      const matchingTask = activeTasksData.activeTasks.find((t: any) => t.label === active_label);
      if (matchingTask) {
        targetTaskId = matchingTask.id;
        targetTaskLabel = matchingTask.label;
      } else {
        // No task found with the specified label
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `No task marked as Active ${active_label} was found. Please open VS Code and click the waving hand icon in a conversation to mark it as active.`,
                recommendation: "The user needs to mark a conversation as active in VS Code by clicking the waving hand icon in the Cline Ultra extension."
              }, null, 2),
            },
          ],
        };
      }
    } else if (!targetTaskId) {
      // No label specified and no task_id, use Active A by default
      const activeATask = activeTasksData.activeTasks.find((t: any) => t.label === 'A');
      if (activeATask) {
        targetTaskId = activeATask.id;
        targetTaskLabel = activeATask.label;
      }
    }
  } else if (active_label) {
    // No active tasks found but active_label was specified
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `No active tasks found. Please open VS Code and click the waving hand icon in a conversation to mark it as Active ${active_label}.`,
            recommendation: "The user needs to mark a conversation as active in VS Code by clicking the waving hand icon in the Cline Ultra extension."
          }, null, 2),
        },
      ],
    };
  }
  
  // Ensure we have a valid targetTaskId
  if (!targetTaskId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: "No valid task ID could be determined. Please provide a valid task ID or mark a conversation as active in VS Code.",
            recommendation: "The user needs to mark a conversation as active in Cline Ultra or provide a valid task ID."
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
  
  // Get the appropriate tasks directory for this specific task
  const specificTasksDir = await getTasksDirectoryForTask(targetTaskId);
  
  // Check if we're using the Ultra path
  const isUltra = specificTasksDir.includes('custom.claude-dev-ultra');
  
  // Get the task directory
  const taskDir = path.join(specificTasksDir, targetTaskId);
  
  // Verify the task directory exists
  if (!fs.existsSync(taskDir)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Task directory does not exist: ${taskDir}`
    );
  }
  
  // Create external advice object
  const advice = {
    id: `advice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    title: title || 'Advice from Claude',
    type,
    priority,
    timestamp: Date.now(),
    expiresAt: expiresAfter ? Date.now() + (expiresAfter * 60 * 1000) : null,
    relatedFiles: relatedFiles || [],
    read: false
    // 'dismissed' field removed - now using folder-based approach instead
  };
  
  // Create external advice directory within the specific task folder
  const adviceDir = path.join(taskDir, 'external-advice');
  await fs.mkdirp(adviceDir);
  
  // Create Dismissed subdirectory for the folder-based approach
  const dismissedDir = path.join(adviceDir, 'Dismissed');
  await fs.mkdirp(dismissedDir);
  
  // Write advice to file
  const adviceFilePath = path.join(adviceDir, `${advice.id}.json`);
  await fs.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8');
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          adviceId: advice.id,
          message: targetTaskLabel ? `Advice sent to Active ${targetTaskLabel} conversation` : 'Advice sent successfully',
          targetTask: targetTaskId,
          activeLabel: targetTaskLabel,
          warning: isUltra ? null : 'NOTE: This advice was sent to standard Cline, but the External Advice feature only works with Cline Ultra.'
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle recover_crashed_chat tool call
 */
async function handleRecoverCrashedChat(tasksDir: string, args: unknown) {
  const { task_id, max_length, include_code_snippets, save_to_crashreports } = RecoverCrashedChatSchema.parse(args);
  
  try {
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = await getTasksDirectoryForTask(task_id);
    
    // Get the API conversation file path
    const apiFilePath = getApiConversationFilePath(specificTasksDir, task_id);
    
    // Attempt to recover the crashed conversation
    const recoveredContext = await recoverCrashedConversation(task_id, max_length, include_code_snippets);
    
    // Format the context as a message
    const formattedMessage = formatRecoveredContext(recoveredContext);
    
    // Check if we should save to crash reports directory (only for Ultra)
    let crashReportSaved = false;
    let crashReportId = '';
    let crashReportPath = '';
    
    if (save_to_crashreports && isUltraExtensionPath(specificTasksDir)) {
      try {
        // Ensure crash reports directories exist
        const { crashReportsDir, dismissedDir, created } = await ensureCrashReportsDirectories();
        
        // Create crash report object
        crashReportId = `crash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const crashReport = {
          id: crashReportId,
          task_id,
          timestamp: Date.now(),
          summary: recoveredContext.summary,
          main_topic: recoveredContext.main_topic,
          formatted_message: formattedMessage,
          read: false
        };
        
        // Save the report to the crash reports directory
        crashReportPath = path.join(crashReportsDir, `${crashReportId}.json`);
        await fs.writeFile(crashReportPath, JSON.stringify(crashReport, null, 2), 'utf8');
        crashReportSaved = true;
        
        console.log(`Crash report saved to ${crashReportPath}`);
      } catch (error) {
        console.error('Error saving crash report:', error);
      }
    }
    
    // Return a response with the formatted message and crash report info
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            task_id,
            main_topic: recoveredContext.main_topic,
            subtopics: recoveredContext.subtopics.slice(0, 5),
            summary: recoveredContext.summary,
            message_count: recoveredContext.message_count,
            formatted_message: formattedMessage,
            crash_report_saved: crashReportSaved,
            crash_report_id: crashReportId,
            crash_report_path: crashReportPath,
            instructions: crashReportSaved 
              ? "A crash report has been saved to the Cline Ultra extension. Open VS Code to view it."
              : "Copy this message to a new conversation to continue your work"
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Failed to recover crashed chat: ${(error as Error).message}`,
            task_id
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Start the MCP server
 */
export async function startMcpServer() {
  try {
    // Get the VS Code tasks directories based on the current OS
    // Note: We don't pass a task_id here since we're just starting up
    const tasksDirs = getVSCodeTasksDirectory();
    
    // Use the first available tasks directory
    const tasksDir = tasksDirs[0];
    
    // Initialize MCP server
    const server = await initMcpServer(tasksDir);
    
    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Claude Task Reader MCP server running on stdio');
    console.error(`Using VS Code tasks directories: ${tasksDirs.join(', ')}`);
    console.error('Supporting both Cline and Cline Ultra extensions');
    
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
