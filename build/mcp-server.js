/**
 * MCP Server for Claude Task Reader
 * Implements MCP capabilities for Claude Desktop to access VS Code extension conversations
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
// Import VS Code monitoring tools
import { GetVSCodeWorkspacesSchema, AnalyzeWorkspaceSchema, GetFileHistorySchema, AnalyzeCloneActivitySchema } from './vscode-monitoring.js';
import { getVSCodeWorkspaces, getRecentlyModifiedFiles } from './utils/vscode-tracker.js';
import { getRecentChanges, getFileHistory, findGitRepository, getGitDiff, getUnpushedCommits, getUncommittedChanges } from './utils/git-analyzer.js';
import { getWorkspaceSettings, getWorkspaceInfo, getLaunchConfigurations, getRecommendedExtensions } from './utils/vscode-settings.js';
import { formatTimestamps, getCurrentTime } from './utils/time-utils.js';
import { z } from 'zod';
import { getVSCodeTasksDirectory, getApiConversationFilePath, getTasksDirectoryForTask } from './utils/paths.js';
import { listTasks, getTask, getTaskSummary, getConversationHistory, searchConversations, findCodeDiscussions } from './services/index.js';
import { analyzeConversation } from './utils/conversation-analyzer-simple.js';
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
const AnalyzeConversationSchema = z.object({
    task_id: z.string().describe('Task ID (timestamp) of the conversation'),
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
const SendExternalAdviceSchema = z.object({
    content: z.string().describe('Advice content to send to the user'),
    title: z.string().optional().describe('Title for the advice notification'),
    type: z.enum(['info', 'warning', 'tip', 'task']).default('info').describe('Type of advice'),
    priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Priority level of the advice'),
    expiresAfter: z.number().optional().describe('Time in minutes after which the advice should expire'),
    relatedFiles: z.array(z.string()).optional().describe('Paths to files related to this advice'),
    task_id: z.string().describe('Task ID (timestamp) of the conversation to send advice to')
});
/**
 * Initialize the MCP server
 */
export async function initMcpServer(tasksDir) {
    // Create server instance
    const server = new Server({
        name: 'claude-task-reader',
        version: '0.1.0',
    }, {
        capabilities: {
            tools: {
                listChanged: false
            }
        }
    });
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
                },
                {
                    name: 'analyze_conversation',
                    description: 'Analyze a conversation to extract key information, topics, and patterns',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            task_id: {
                                type: 'string',
                                description: 'Task ID (timestamp) of the conversation'
                            },
                            minutes_back: {
                                type: 'number',
                                description: 'Only analyze messages from the last X minutes (optional)'
                            }
                        },
                        required: ['task_id']
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
                                description: 'Task ID (timestamp) of the conversation to send advice to'
                            }
                        },
                        required: ['content', 'task_id']
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
                case 'send_external_advice':
                    return await handleSendExternalAdvice(tasksDir, args);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        }
        catch (error) {
            console.error(`Error executing tool ${name}:`, error);
            // Return formatted error
            if (error instanceof McpError) {
                throw error;
            }
            if (error instanceof z.ZodError) {
                throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${error.errors
                    .map((e) => `${e.path.join(".")}: ${e.message}`)
                    .join(", ")}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error.message}`,
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
async function handleGetLastNMessages(tasksDir, args) {
    const { task_id, limit } = GetLastNMessagesSchema.parse(args);
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = await getTasksDirectoryForTask(task_id);
    // Get conversation messages
    const messages = await getConversationHistory(specificTasksDir, task_id, { limit });
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
async function handleGetMessagesSince(tasksDir, args) {
    const { task_id, since, limit } = GetMessagesSinceSchema.parse(args);
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = await getTasksDirectoryForTask(task_id);
    // Get messages since timestamp
    const messages = await getConversationHistory(specificTasksDir, task_id, { since, limit });
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    task_id,
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
async function handleGetConversationSummary(tasksDir, args) {
    const { task_id } = GetConversationSummarySchema.parse(args);
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = await getTasksDirectoryForTask(task_id);
    // Get conversation summary
    const summary = await getTaskSummary(specificTasksDir, task_id);
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
async function handleFindCodeDiscussions(tasksDir, args) {
    const { task_id, filename } = FindCodeDiscussionsSchema.parse(args);
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = await getTasksDirectoryForTask(task_id);
    // Find code discussions
    const discussions = await findCodeDiscussions(specificTasksDir, task_id, filename || null);
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
async function handleListRecentTasks(tasksDir, args) {
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
    const taskDetails = await Promise.all(limitedTasks.map(async (task) => {
        // Get the appropriate tasks directory for this specific task
        const specificTasksDir = await getTasksDirectoryForTask(task.id);
        return await getTask(specificTasksDir, task.id);
    }));
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
async function handleGetTaskById(tasksDir, args) {
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
async function handleSearchConversations(tasksDir, args) {
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
async function handleGetVSCodeWorkspaces(args) {
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
async function handleAnalyzeWorkspace(args) {
    const { workspacePath, hoursBack } = AnalyzeWorkspaceSchema.parse(args);
    // Check if the workspace exists
    if (!fs.existsSync(workspacePath)) {
        throw new McpError(ErrorCode.InvalidParams, `Workspace path does not exist: ${workspacePath}`);
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
    const filesByType = {};
    recentFiles.forEach(file => {
        const ext = file.extension || 'unknown';
        if (!filesByType[ext])
            filesByType[ext] = [];
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
async function handleGetFileHistory(args) {
    const { filePath } = GetFileHistorySchema.parse(args);
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        throw new McpError(ErrorCode.InvalidParams, `File does not exist: ${filePath}`);
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
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to get file info: ${error.message}`);
    }
}
/**
 * Handle analyze_cline_activity tool call
 */
async function handleAnalyzeCloneActivity(args) {
    const { hoursBack } = AnalyzeCloneActivitySchema.parse(args);
    // Get all VS Code workspaces
    const workspaces = getVSCodeWorkspaces();
    const results = [];
    for (const workspace of workspaces) {
        // Skip if not a real path
        if (!fs.existsSync(workspace))
            continue;
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
async function handleAnalyzeConversation(tasksDir, args) {
    const { task_id, minutes_back } = AnalyzeConversationSchema.parse(args);
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = await getTasksDirectoryForTask(task_id);
    // Get the API conversation file path
    const apiFilePath = getApiConversationFilePath(specificTasksDir, task_id);
    // Calculate timestamp for filtering if minutes_back is provided
    const since = minutes_back ? Date.now() - (minutes_back * 60 * 1000) : 0;
    // Analyze the conversation
    const analysis = await analyzeConversation(apiFilePath, since);
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    task_id,
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
async function handleGetGitDiff(args) {
    const { filePath, oldRef, newRef } = GetGitDiffSchema.parse(args);
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        throw new McpError(ErrorCode.InvalidParams, `File does not exist: ${filePath}`);
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
async function handleGetUnpushedCommits(args) {
    const { repoPath } = GetUnpushedCommitsSchema.parse(args);
    // Check if the repository exists
    if (!fs.existsSync(repoPath)) {
        throw new McpError(ErrorCode.InvalidParams, `Repository path does not exist: ${repoPath}`);
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
async function handleGetUncommittedChanges(args) {
    const { repoPath } = GetUncommittedChangesSchema.parse(args);
    // Check if the repository exists
    if (!fs.existsSync(repoPath)) {
        throw new McpError(ErrorCode.InvalidParams, `Repository path does not exist: ${repoPath}`);
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
 * Handle send_external_advice tool call
 */
async function handleSendExternalAdvice(tasksDir, args) {
    const { content, title, type, priority, expiresAfter, relatedFiles, task_id } = SendExternalAdviceSchema.parse(args);
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = await getTasksDirectoryForTask(task_id);
    // Check if we're using the Ultra path
    const isUltra = specificTasksDir.includes('custom.claude-dev-ultra');
    // Get the task directory
    const taskDir = path.join(specificTasksDir, task_id);
    // Verify the task directory exists
    if (!fs.existsSync(taskDir)) {
        throw new McpError(ErrorCode.InvalidParams, `Task directory does not exist: ${taskDir}`);
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
    };
    // Create external advice directory within the specific task folder
    const adviceDir = path.join(taskDir, 'external-advice');
    await fs.mkdirp(adviceDir);
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
                    message: 'Advice sent successfully',
                    warning: isUltra ? null : 'NOTE: This advice was sent to standard Cline, but the External Advice feature only works with Cline Ultra.'
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
    }
    catch (error) {
        console.error('Error starting MCP server:', error);
        process.exit(1);
    }
}
