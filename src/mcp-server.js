"use strict";
/**
 * MCP Server for Cline Chat Reader
 * Implements four essential tools with fixed message limits
 *
 * 1. read_last_messages - Retrieve 20 most recent conversation messages
 * 2. read_last_40_messages - Retrieve 40 most recent conversation messages
 * 3. get_active_task - Get active conversations
 * 4. send_external_advice - Send notifications between agents
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMcpServer = initMcpServer;
exports.startMcpServer = startMcpServer;
var index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
var zod_1 = require("zod");
var config_js_1 = require("./config.js");
var active_task_js_1 = require("./utils/active-task.js");
var file_utils_js_1 = require("./utils/file-utils.js");
var message_utils_js_1 = require("./utils/message-utils.js");
/**
 * Error codes for MCP server operations
 */
var ServerErrorCode;
(function (ServerErrorCode) {
    ServerErrorCode["UNKNOWN_TOOL"] = "UNKNOWN_TOOL";
    ServerErrorCode["INVALID_ARGUMENTS"] = "INVALID_ARGUMENTS";
    ServerErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ServerErrorCode || (ServerErrorCode = {}));
/**
 * Schema for read_last_messages tool
 */
var ReadLastMessagesSchema = zod_1.z.object({
    task_id: zod_1.z.union([
        zod_1.z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
        zod_1.z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
        zod_1.z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
    ]).optional()
});
/**
 * Schema for read_last_40_messages tool
 */
var ReadLast40MessagesSchema = zod_1.z.object({
    task_id: zod_1.z.union([
        zod_1.z.string().describe('Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.'),
        zod_1.z.literal('ACTIVE_A').describe('Explicitly request the conversation marked as Active A'),
        zod_1.z.literal('ACTIVE_B').describe('Explicitly request the conversation marked as Active B')
    ]).optional()
});
/**
 * Schema for get_active_task tool
 */
var GetActiveTaskSchema = zod_1.z.object({
    label: zod_1.z.enum(['A', 'B']).optional().describe('Optional label (A, B) to filter by')
});
/**
 * Schema for send_external_advice tool
 */
var SendExternalAdviceSchema = zod_1.z.object({
    target_task_id: zod_1.z.string().describe('Task ID of the target conversation'),
    message: zod_1.z.string().min(1).max(10000).describe('The advice message to send'),
    source_task_id: zod_1.z.string().optional().describe('Task ID of the source conversation')
});
/**
 * Handle read_last_messages tool call
 * @param args Tool arguments
 * @returns Tool response
 */
function handleReadLastMessages(args) {
    return __awaiter(this, void 0, void 0, function () {
        var task_id, activeTask, apiFilePath, messages, transformedMessages, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    task_id = ReadLastMessagesSchema.parse(args).task_id;
                    return [4 /*yield*/, (0, active_task_js_1.getActiveTaskWithCache)(task_id)];
                case 1:
                    activeTask = _a.sent();
                    if (!activeTask) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: active_task_js_1.ActiveTaskErrorCode.TASK_NOT_FOUND,
                                            error: "No active conversation found.",
                                            recommendation: "Please open VS Code and mark a conversation as active."
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    return [4 /*yield*/, (0, active_task_js_1.getApiConversationFilePath)(activeTask.id)];
                case 2:
                    apiFilePath = _a.sent();
                    return [4 /*yield*/, (0, file_utils_js_1.readConversationMessagesWithTimeout)(apiFilePath, config_js_1.config.messages.defaultLimit, config_js_1.config.errorHandling.timeout)];
                case 3:
                    messages = _a.sent();
                    // If no messages found, return error
                    if (messages.length === 0) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: file_utils_js_1.FileErrorCode.FILE_NOT_FOUND,
                                            error: "No messages found for task ".concat(activeTask.id, "."),
                                            recommendation: "The conversation may be empty or the file may be corrupted."
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    transformedMessages = (0, message_utils_js_1.standardizeMessageContent)(messages);
                    return [2 /*return*/, {
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
                        }];
                case 4:
                    error_1 = _a.sent();
                    // Handle errors with proper error codes
                    if (error_1 instanceof zod_1.z.ZodError) {
                        (0, active_task_js_1.logError)(ServerErrorCode.INVALID_ARGUMENTS, "Invalid arguments for read_last_messages: ".concat(error_1.message));
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: ServerErrorCode.INVALID_ARGUMENTS,
                                            error: "Invalid arguments: ".concat(error_1.errors.map(function (e) { return "".concat(e.path.join('.'), ": ").concat(e.message); }).join(', '))
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    (0, active_task_js_1.logError)(ServerErrorCode.INTERNAL_ERROR, "Error in read_last_messages: ".concat(error_1.message));
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        error_code: ServerErrorCode.INTERNAL_ERROR,
                                        error: "Error: ".concat(error_1.message)
                                    }, null, 2),
                                },
                            ],
                            isError: true,
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Handle read_last_40_messages tool call
 * @param args Tool arguments
 * @returns Tool response
 */
function handleReadLast40Messages(args) {
    return __awaiter(this, void 0, void 0, function () {
        var task_id, activeTask, apiFilePath, messages, transformedMessages, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    task_id = ReadLast40MessagesSchema.parse(args).task_id;
                    return [4 /*yield*/, (0, active_task_js_1.getActiveTaskWithCache)(task_id)];
                case 1:
                    activeTask = _a.sent();
                    if (!activeTask) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: active_task_js_1.ActiveTaskErrorCode.TASK_NOT_FOUND,
                                            error: "No active conversation found.",
                                            recommendation: "Please open VS Code and mark a conversation as active."
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    return [4 /*yield*/, (0, active_task_js_1.getApiConversationFilePath)(activeTask.id)];
                case 2:
                    apiFilePath = _a.sent();
                    return [4 /*yield*/, (0, file_utils_js_1.readConversationMessagesWithTimeout)(apiFilePath, config_js_1.config.messages.extendedLimit, config_js_1.config.errorHandling.timeout)];
                case 3:
                    messages = _a.sent();
                    // If no messages found, return error
                    if (messages.length === 0) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: file_utils_js_1.FileErrorCode.FILE_NOT_FOUND,
                                            error: "No messages found for task ".concat(activeTask.id, "."),
                                            recommendation: "The conversation may be empty or the file may be corrupted."
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    transformedMessages = (0, message_utils_js_1.standardizeMessageContent)(messages);
                    return [2 /*return*/, {
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
                        }];
                case 4:
                    error_2 = _a.sent();
                    // Handle errors with proper error codes
                    if (error_2 instanceof zod_1.z.ZodError) {
                        (0, active_task_js_1.logError)(ServerErrorCode.INVALID_ARGUMENTS, "Invalid arguments for read_last_40_messages: ".concat(error_2.message));
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: ServerErrorCode.INVALID_ARGUMENTS,
                                            error: "Invalid arguments: ".concat(error_2.errors.map(function (e) { return "".concat(e.path.join('.'), ": ").concat(e.message); }).join(', '))
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    (0, active_task_js_1.logError)(ServerErrorCode.INTERNAL_ERROR, "Error in read_last_40_messages: ".concat(error_2.message));
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        error_code: ServerErrorCode.INTERNAL_ERROR,
                                        error: "Error: ".concat(error_2.message)
                                    }, null, 2),
                                },
                            ],
                            isError: true,
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Handle get_active_task tool call
 * @param args Tool arguments
 * @returns Tool response
 */
function handleGetActiveTask(args) {
    return __awaiter(this, void 0, void 0, function () {
        var label, activeTasks, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    label = GetActiveTaskSchema.parse(args).label;
                    return [4 /*yield*/, (0, active_task_js_1.getAllActiveTasksWithCache)(label)];
                case 1:
                    activeTasks = _a.sent();
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        active_tasks: activeTasks,
                                        count: activeTasks.length,
                                        message: activeTasks.length === 0 ?
                                            (label ? "No conversation marked as Active ".concat(label, " was found.") : 'No active conversations found.') :
                                            undefined
                                    }, null, 2),
                                },
                            ],
                        }];
                case 2:
                    error_3 = _a.sent();
                    // Handle errors with proper error codes
                    if (error_3 instanceof zod_1.z.ZodError) {
                        (0, active_task_js_1.logError)(ServerErrorCode.INVALID_ARGUMENTS, "Invalid arguments for get_active_task: ".concat(error_3.message));
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: ServerErrorCode.INVALID_ARGUMENTS,
                                            error: "Invalid arguments: ".concat(error_3.errors.map(function (e) { return "".concat(e.path.join('.'), ": ").concat(e.message); }).join(', '))
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    (0, active_task_js_1.logError)(ServerErrorCode.INTERNAL_ERROR, "Error in get_active_task: ".concat(error_3.message));
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        error_code: ServerErrorCode.INTERNAL_ERROR,
                                        error: "Error: ".concat(error_3.message)
                                    }, null, 2),
                                },
                            ],
                            isError: true,
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Handle send_external_advice tool call
 * @param args Tool arguments
 * @returns Tool response
 */
function handleSendExternalAdvice(args) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, target_task_id, message, source_task_id, targetTaskExists, adviceId, advice, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    _a = SendExternalAdviceSchema.parse(args), target_task_id = _a.target_task_id, message = _a.message, source_task_id = _a.source_task_id;
                    return [4 /*yield*/, Promise.race([
                            (0, active_task_js_1.validateTaskExists)(target_task_id),
                            new Promise(function (_, reject) {
                                return setTimeout(function () { return reject(new Error('Timeout validating target task')); }, config_js_1.config.errorHandling.timeout);
                            })
                        ])];
                case 1:
                    targetTaskExists = _b.sent();
                    if (!targetTaskExists) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: active_task_js_1.ActiveTaskErrorCode.TASK_NOT_FOUND,
                                            error: "Target task ".concat(target_task_id, " not found.")
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    adviceId = "advice-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 8));
                    advice = {
                        id: adviceId,
                        content: message,
                        source_task_id: source_task_id,
                        timestamp: Date.now(),
                        read: false
                    };
                    // Write advice to target task
                    return [4 /*yield*/, (0, active_task_js_1.writeAdviceToTask)(target_task_id, advice)];
                case 2:
                    // Write advice to target task
                    _b.sent();
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: true,
                                        advice_id: adviceId,
                                        target_task_id: target_task_id
                                    }, null, 2),
                                },
                            ],
                        }];
                case 3:
                    error_4 = _b.sent();
                    // Handle timeout errors specifically
                    if (error_4.message.includes('Timeout')) {
                        (0, active_task_js_1.logError)(file_utils_js_1.FileErrorCode.TIMEOUT_ERROR, "Timeout in send_external_advice: ".concat(error_4.message));
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: file_utils_js_1.FileErrorCode.TIMEOUT_ERROR,
                                            error: "Operation timed out: ".concat(error_4.message)
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    // Handle validation errors
                    if (error_4 instanceof zod_1.z.ZodError) {
                        (0, active_task_js_1.logError)(ServerErrorCode.INVALID_ARGUMENTS, "Invalid arguments for send_external_advice: ".concat(error_4.message));
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            error_code: ServerErrorCode.INVALID_ARGUMENTS,
                                            error: "Invalid arguments: ".concat(error_4.errors.map(function (e) { return "".concat(e.path.join('.'), ": ").concat(e.message); }).join(', '))
                                        }, null, 2),
                                    },
                                ],
                                isError: true,
                            }];
                    }
                    // Handle other errors
                    (0, active_task_js_1.logError)(ServerErrorCode.INTERNAL_ERROR, "Error in send_external_advice: ".concat(error_4.message));
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        error_code: ServerErrorCode.INTERNAL_ERROR,
                                        error: "Error: ".concat(error_4.message)
                                    }, null, 2),
                                },
                            ],
                            isError: true,
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Initialize the MCP server
 * @returns Initialized MCP server
 */
function initMcpServer() {
    return __awaiter(this, void 0, void 0, function () {
        var server;
        var _this = this;
        return __generator(this, function (_a) {
            server = new index_js_1.Server({
                name: 'cline-chat-reader',
                version: config_js_1.config.version,
            }, {
                capabilities: {
                    resources: {},
                    tools: {},
                    prompts: {},
                },
            });
            // Handle resources/list requests (empty)
            server.setRequestHandler(types_js_1.ListResourcesRequestSchema, function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, {
                            resources: []
                        }];
                });
            }); });
            // Handle resource templates (empty)
            server.setRequestHandler(types_js_1.ListResourceTemplatesRequestSchema, function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, {
                            resourceTemplates: []
                        }];
                });
            }); });
            // Handle prompts/list requests (empty)
            server.setRequestHandler(types_js_1.ListPromptsRequestSchema, function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, {
                            prompts: []
                        }];
                });
            }); });
            // Define available tools
            server.setRequestHandler(types_js_1.ListToolsRequestSchema, function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, {
                            tools: [
                                {
                                    name: config_js_1.config.tools.readLastMessages,
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
                                    name: config_js_1.config.tools.readLast40Messages,
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
                                    name: config_js_1.config.tools.getActiveTask,
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
                                    name: config_js_1.config.tools.sendExternalAdvice,
                                    description: 'Send advice to another conversation',
                                    inputSchema: {
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
                                    }
                                }
                            ]
                        }];
                });
            }); });
            // Handle tool calls
            server.setRequestHandler(types_js_1.CallToolRequestSchema, function (request) { return __awaiter(_this, void 0, void 0, function () {
                var _a, name, args, _b, error_5;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = request.params, name = _a.name, args = _a.arguments;
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 12, , 13]);
                            _b = name;
                            switch (_b) {
                                case config_js_1.config.tools.readLastMessages: return [3 /*break*/, 2];
                                case config_js_1.config.tools.readLast40Messages: return [3 /*break*/, 4];
                                case config_js_1.config.tools.getActiveTask: return [3 /*break*/, 6];
                                case config_js_1.config.tools.sendExternalAdvice: return [3 /*break*/, 8];
                            }
                            return [3 /*break*/, 10];
                        case 2: return [4 /*yield*/, handleReadLastMessages(args)];
                        case 3: return [2 /*return*/, _c.sent()];
                        case 4: return [4 /*yield*/, handleReadLast40Messages(args)];
                        case 5: return [2 /*return*/, _c.sent()];
                        case 6: return [4 /*yield*/, handleGetActiveTask(args)];
                        case 7: return [2 /*return*/, _c.sent()];
                        case 8: return [4 /*yield*/, handleSendExternalAdvice(args)];
                        case 9: return [2 /*return*/, _c.sent()];
                        case 10: throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, "Unknown tool: ".concat(name));
                        case 11: return [3 /*break*/, 13];
                        case 12:
                            error_5 = _c.sent();
                            (0, active_task_js_1.logError)(ServerErrorCode.INTERNAL_ERROR, "Error executing tool ".concat(name, ":"), error_5);
                            // Return formatted error
                            if (error_5 instanceof types_js_1.McpError) {
                                throw error_5;
                            }
                            if (error_5 instanceof zod_1.z.ZodError) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, "Invalid arguments: ".concat(error_5.errors
                                    .map(function (e) { return "".concat(e.path.join("."), ": ").concat(e.message); })
                                    .join(", ")));
                            }
                            return [2 /*return*/, {
                                    content: [
                                        {
                                            type: 'text',
                                            text: JSON.stringify({
                                                error_code: ServerErrorCode.INTERNAL_ERROR,
                                                error: "Error: ".concat(error_5.message)
                                            }, null, 2),
                                        },
                                    ],
                                    isError: true,
                                }];
                        case 13: return [2 /*return*/];
                    }
                });
            }); });
            // Return the server instance
            return [2 /*return*/, server];
        });
    });
}
/**
 * Start the MCP server
 */
function startMcpServer() {
    return __awaiter(this, void 0, void 0, function () {
        var server, transport, error_6;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, initMcpServer()];
                case 1:
                    server = _a.sent();
                    transport = new stdio_js_1.StdioServerTransport();
                    return [4 /*yield*/, server.connect(transport)];
                case 2:
                    _a.sent();
                    (0, active_task_js_1.logInfo)('Cline Chat Reader MCP server running on stdio');
                    (0, active_task_js_1.logInfo)("Version: ".concat(config_js_1.config.version));
                    (0, active_task_js_1.logInfo)('Supporting four essential tools:');
                    (0, active_task_js_1.logInfo)("- ".concat(config_js_1.config.tools.readLastMessages));
                    (0, active_task_js_1.logInfo)("- ".concat(config_js_1.config.tools.readLast40Messages));
                    (0, active_task_js_1.logInfo)("- ".concat(config_js_1.config.tools.getActiveTask));
                    (0, active_task_js_1.logInfo)("- ".concat(config_js_1.config.tools.sendExternalAdvice));
                    // Handle process termination
                    process.on('SIGINT', function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            (0, active_task_js_1.logInfo)('Shutting down server...');
                            process.exit(0);
                            return [2 /*return*/];
                        });
                    }); });
                    return [3 /*break*/, 4];
                case 3:
                    error_6 = _a.sent();
                    (0, active_task_js_1.logError)(ServerErrorCode.INTERNAL_ERROR, 'Error starting MCP server:', error_6);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
