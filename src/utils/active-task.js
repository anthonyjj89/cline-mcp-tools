"use strict";
/**
 * Active task utilities with caching for the Cline Chat Reader MCP Server
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
exports.ActiveTaskErrorCode = void 0;
exports.logError = logError;
exports.logWarning = logWarning;
exports.logInfo = logInfo;
exports.clearActiveTaskCache = clearActiveTaskCache;
exports.getActiveTasksDataWithCache = getActiveTasksDataWithCache;
exports.getActiveTaskWithCache = getActiveTaskWithCache;
exports.getAllActiveTasksWithCache = getAllActiveTasksWithCache;
exports.getTasksDirectoryForTask = getTasksDirectoryForTask;
exports.validateTaskExists = validateTaskExists;
exports.getApiConversationFilePath = getApiConversationFilePath;
exports.writeAdviceToTask = writeAdviceToTask;
var config_js_1 = require("../config.js");
var fs_extra_1 = require("fs-extra");
var path_1 = require("path");
var os_1 = require("os");
// Cache for active tasks data
var activeTaskCache = new Map();
var CACHE_EXPIRY_MS = 30000; // 30 seconds
/**
 * Error codes for active task operations
 */
var ActiveTaskErrorCode;
(function (ActiveTaskErrorCode) {
    ActiveTaskErrorCode["TASK_NOT_FOUND"] = "TASK_NOT_FOUND";
    ActiveTaskErrorCode["FILE_READ_ERROR"] = "FILE_READ_ERROR";
    ActiveTaskErrorCode["INVALID_PARAMS"] = "INVALID_PARAMS";
})(ActiveTaskErrorCode || (exports.ActiveTaskErrorCode = ActiveTaskErrorCode = {}));
/**
 * Log error with code and context
 * @param code Error code
 * @param message Error message
 * @param context Optional context information
 */
function logError(code, message, context) {
    console.error("ERROR [".concat(code, "]: ").concat(message), context ? JSON.stringify(context) : '');
}
/**
 * Log warning message
 * @param message Warning message
 * @param context Optional context information
 */
function logWarning(message, context) {
    console.error("WARN: ".concat(message), context ? JSON.stringify(context) : '');
}
/**
 * Log info message
 * @param message Info message
 * @param context Optional context information
 */
function logInfo(message, context) {
    console.error("INFO: ".concat(message), context ? JSON.stringify(context) : '');
}
/**
 * Get cached active tasks data if available and not expired
 * @returns Cached active tasks data or null if not available
 */
function getCachedActiveTasksData() {
    var cached = activeTaskCache.get('activeTasks');
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
        return cached.data;
    }
    return null;
}
/**
 * Cache active tasks data
 * @param data Active tasks data to cache
 */
function cacheActiveTasksData(data) {
    activeTaskCache.set('activeTasks', {
        data: data,
        timestamp: Date.now()
    });
}
/**
 * Get cached active task by ID if available and not expired
 * @param taskId Task ID
 * @returns Cached active task or null if not available
 */
function getCachedActiveTask(taskId) {
    var cached = activeTaskCache.get("task:".concat(taskId));
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
        return cached.data;
    }
    return null;
}
/**
 * Cache active task
 * @param taskId Task ID
 * @param data Active task data to cache
 */
function cacheActiveTask(taskId, data) {
    activeTaskCache.set("task:".concat(taskId), {
        data: data,
        timestamp: Date.now()
    });
}
/**
 * Clear active task cache
 */
function clearActiveTaskCache() {
    activeTaskCache.clear();
    logInfo('Active task cache cleared');
}
/**
 * Get active tasks data with caching
 * @returns Promise resolving to active tasks data
 */
function getActiveTasksDataWithCache() {
    return __awaiter(this, void 0, void 0, function () {
        var cachedData, content, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    cachedData = getCachedActiveTasksData();
                    if (cachedData) {
                        return [2 /*return*/, cachedData];
                    }
                    return [4 /*yield*/, fs_extra_1.default.pathExists(config_js_1.config.paths.activeTasksFile)];
                case 1:
                    if (!_a.sent()) return [3 /*break*/, 3];
                    return [4 /*yield*/, fs_extra_1.default.readFile(config_js_1.config.paths.activeTasksFile, 'utf8')];
                case 2:
                    content = _a.sent();
                    data = JSON.parse(content);
                    // Cache the data
                    cacheActiveTasksData(data);
                    return [2 /*return*/, data];
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error reading active tasks file:', error_1);
                    return [3 /*break*/, 5];
                case 5: 
                // Return empty array if file doesn't exist or error occurs
                return [2 /*return*/, { activeTasks: [] }];
            }
        });
    });
}
/**
 * Get active task by ID or label with caching
 * @param taskIdOrLabel Task ID or label (A, B)
 * @returns Promise resolving to active task or undefined if not found
 */
function getActiveTaskWithCache(taskIdOrLabel) {
    return __awaiter(this, void 0, void 0, function () {
        var label_1, cachedData, task, activeTasksData_1, cachedTask, activeTasksData_2, task, activeTasksData, task, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    if (!(taskIdOrLabel === 'ACTIVE_A' || taskIdOrLabel === 'ACTIVE_B')) return [3 /*break*/, 2];
                    label_1 = taskIdOrLabel === 'ACTIVE_A' ? 'A' : 'B';
                    cachedData = getCachedActiveTasksData();
                    if (cachedData && cachedData.activeTasks) {
                        task = cachedData.activeTasks.find(function (t) { return t.label === label_1; });
                        if (task) {
                            return [2 /*return*/, task];
                        }
                    }
                    return [4 /*yield*/, getActiveTasksDataWithCache()];
                case 1:
                    activeTasksData_1 = _a.sent();
                    return [2 /*return*/, activeTasksData_1.activeTasks.find(function (task) { return task.label === label_1; })];
                case 2:
                    if (!taskIdOrLabel) return [3 /*break*/, 4];
                    cachedTask = getCachedActiveTask(taskIdOrLabel);
                    if (cachedTask) {
                        return [2 /*return*/, cachedTask];
                    }
                    return [4 /*yield*/, getActiveTasksDataWithCache()];
                case 3:
                    activeTasksData_2 = _a.sent();
                    task = activeTasksData_2.activeTasks.find(function (t) { return t.id === taskIdOrLabel; });
                    if (task) {
                        // Cache the task
                        cacheActiveTask(taskIdOrLabel, task);
                        return [2 /*return*/, task];
                    }
                    // If not an active task, return undefined
                    return [2 /*return*/, undefined];
                case 4: return [4 /*yield*/, getActiveTasksDataWithCache()];
                case 5:
                    activeTasksData = _a.sent();
                    if (activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
                        task = activeTasksData.activeTasks.find(function (t) { return t.label === 'A'; }) ||
                            activeTasksData.activeTasks.find(function (t) { return t.label === 'B'; }) ||
                            activeTasksData.activeTasks[0];
                        return [2 /*return*/, task];
                    }
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error getting active task:', error_2);
                    return [3 /*break*/, 7];
                case 7: 
                // Return undefined if no active tasks found or error occurs
                return [2 /*return*/, undefined];
            }
        });
    });
}
/**
 * Get all active tasks with caching
 * @param label Optional label to filter by
 * @returns Promise resolving to array of active tasks
 */
function getAllActiveTasksWithCache(label) {
    return __awaiter(this, void 0, void 0, function () {
        var activeTasksData, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, getActiveTasksDataWithCache()];
                case 1:
                    activeTasksData = _a.sent();
                    if (!activeTasksData.activeTasks || activeTasksData.activeTasks.length === 0) {
                        return [2 /*return*/, []];
                    }
                    // Filter by label if provided
                    if (label) {
                        return [2 /*return*/, activeTasksData.activeTasks.filter(function (task) { return task.label === label; })];
                    }
                    // Return all active tasks
                    return [2 /*return*/, activeTasksData.activeTasks];
                case 2:
                    error_3 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error getting all active tasks:', error_3);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get the VS Code tasks directory for a specific task
 * @param taskId Task ID
 * @returns Promise resolving to the tasks directory path
 */
function getTasksDirectoryForTask(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var homedir, tasksDir, taskDir, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    homedir = os_1.default.homedir();
                    tasksDir = path_1.default.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
                    taskDir = path_1.default.join(tasksDir, taskId);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fs_extra_1.default.access(taskDir)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, tasksDir];
                case 3:
                    error_4 = _a.sent();
                    throw new Error("Task directory not found: ".concat(taskDir));
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if a task exists
 * @param taskId Task ID
 * @returns Promise resolving to true if the task exists, false otherwise
 */
function validateTaskExists(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var tasksDir, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, getTasksDirectoryForTask(taskId)];
                case 1:
                    tasksDir = _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_5 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get the API conversation file path for a task
 * @param taskId Task ID
 * @returns Promise resolving to the API conversation file path
 */
function getApiConversationFilePath(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var tasksDir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getTasksDirectoryForTask(taskId)];
                case 1:
                    tasksDir = _a.sent();
                    return [2 /*return*/, path_1.default.join(tasksDir, taskId, 'api_conversation_history.json')];
            }
        });
    });
}
/**
 * Write advice to a task
 * @param taskId Target task ID
 * @param advice Advice object
 */
function writeAdviceToTask(taskId, advice) {
    return __awaiter(this, void 0, void 0, function () {
        var tasksDir, adviceDir, dismissedDir, adviceFilePath, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, getTasksDirectoryForTask(taskId)];
                case 1:
                    tasksDir = _a.sent();
                    adviceDir = path_1.default.join(tasksDir, taskId, 'external-advice');
                    // Create advice directory if it doesn't exist
                    return [4 /*yield*/, fs_extra_1.default.mkdirp(adviceDir)];
                case 2:
                    // Create advice directory if it doesn't exist
                    _a.sent();
                    dismissedDir = path_1.default.join(adviceDir, 'Dismissed');
                    return [4 /*yield*/, fs_extra_1.default.mkdirp(dismissedDir)];
                case 3:
                    _a.sent();
                    adviceFilePath = path_1.default.join(adviceDir, "".concat(advice.id, ".json"));
                    return [4 /*yield*/, fs_extra_1.default.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8')];
                case 4:
                    _a.sent();
                    logInfo("Advice written to ".concat(adviceFilePath));
                    return [3 /*break*/, 6];
                case 5:
                    error_6 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error writing advice to task:', error_6);
                    throw error_6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
