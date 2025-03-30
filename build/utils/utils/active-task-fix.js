"use strict";
/**
 * Active task utilities with caching for the Cline Chat Reader MCP Server
 * Fixed version with improved error handling and detailed logging
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
exports.LogLevel = exports.ActiveTaskErrorCode = void 0;
exports.setLogLevel = setLogLevel;
exports.getLogLevel = getLogLevel;
exports.logError = logError;
exports.logWarning = logWarning;
exports.logInfo = logInfo;
exports.logDebug = logDebug;
exports.clearActiveTaskCache = clearActiveTaskCache;
exports.checkActiveTasksFile = checkActiveTasksFile;
exports.getActiveTasksDataWithCache = getActiveTasksDataWithCache;
exports.getActiveTaskWithCache = getActiveTaskWithCache;
exports.getAllActiveTasksWithCache = getAllActiveTasksWithCache;
exports.getTasksDirectoryForTask = getTasksDirectoryForTask;
exports.validateTaskExists = validateTaskExists;
exports.getApiConversationFilePath = getApiConversationFilePath;
exports.writeAdviceToTask = writeAdviceToTask;
var config_js_1 = require("../config.js");
var fs = require("fs-extra");
var path = require("path");
var pathUtils = require("./paths.js");
var fs_1 = require("fs");
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
 * Log levels for controlling verbosity
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARNING"] = 1] = "WARNING";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Current log level - change this to control verbosity
// Default to INFO in production, can be overridden
var CURRENT_LOG_LEVEL = LogLevel.INFO;
/**
 * Set the current log level
 * @param level New log level
 */
function setLogLevel(level) {
    CURRENT_LOG_LEVEL = level;
}
/**
 * Get the current log level
 * @returns Current log level
 */
function getLogLevel() {
    return CURRENT_LOG_LEVEL;
}
/**
 * Format context for logging
 * @param context Context object
 * @returns Formatted context string or empty string
 */
function formatContext(context) {
    if (!context)
        return '';
    try {
        // For objects, stringify with truncation
        if (typeof context === 'object') {
            // Handle Error objects specially
            if (context instanceof Error) {
                return " ".concat(context.name, ": ").concat(context.message).concat(context.stack ? "\n".concat(context.stack) : '');
            }
            var json = JSON.stringify(context);
            if (json.length > 200) {
                return " ".concat(json.substring(0, 200), "... [truncated]");
            }
            return " ".concat(json);
        }
        // For other types, convert to string
        return " ".concat(String(context));
    }
    catch (error) {
        return " [Error formatting context: ".concat(error, "]");
    }
}
/**
 * Log error with code and context
 * @param code Error code
 * @param message Error message
 * @param context Optional context information
 */
function logError(code, message, context) {
    if (CURRENT_LOG_LEVEL >= LogLevel.ERROR) {
        console.error("ERROR [".concat(code, "]: ").concat(message).concat(formatContext(context)));
    }
}
/**
 * Log warning message
 * @param message Warning message
 * @param context Optional context information
 */
function logWarning(message, context) {
    if (CURRENT_LOG_LEVEL >= LogLevel.WARNING) {
        console.error("WARN: ".concat(message).concat(formatContext(context)));
    }
}
/**
 * Log info message
 * @param message Info message
 * @param context Optional context information
 */
function logInfo(message, context) {
    if (CURRENT_LOG_LEVEL >= LogLevel.INFO) {
        console.error("INFO: ".concat(message).concat(formatContext(context)));
    }
}
/**
 * Log debug message
 * @param message Debug message
 * @param context Optional context information
 */
function logDebug(message, context) {
    if (CURRENT_LOG_LEVEL >= LogLevel.DEBUG) {
        console.error("DEBUG: ".concat(message).concat(formatContext(context)));
    }
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
 * Check if active tasks file exists and is readable
 * @returns Promise resolving to true if the file exists and is readable, false otherwise
 */
function checkActiveTasksFile() {
    return __awaiter(this, void 0, void 0, function () {
        var exists, readError_1, error_1, stats, error_2, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 12, , 13]);
                    // Log the path we're checking
                    logDebug("Checking active tasks file at: ".concat(config_js_1.config.paths.activeTasksFile));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, fs.pathExists(config_js_1.config.paths.activeTasksFile)];
                case 2:
                    exists = _a.sent();
                    if (!exists) {
                        logError(ActiveTaskErrorCode.FILE_READ_ERROR, "Active tasks file does not exist: ".concat(config_js_1.config.paths.activeTasksFile));
                        return [2 /*return*/, false];
                    }
                    logDebug("Active tasks file exists at: ".concat(config_js_1.config.paths.activeTasksFile));
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    // Use Node.js fs.promises to read the file
                    return [4 /*yield*/, fs_1.promises.readFile(config_js_1.config.paths.activeTasksFile, 'utf8')];
                case 4:
                    // Use Node.js fs.promises to read the file
                    _a.sent();
                    logDebug("Active tasks file is readable");
                    return [3 /*break*/, 6];
                case 5:
                    readError_1 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, "Active tasks file exists but is not readable: ".concat(config_js_1.config.paths.activeTasksFile), readError_1);
                    return [2 /*return*/, false];
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, "Error checking if active tasks file exists: ".concat(config_js_1.config.paths.activeTasksFile), error_1);
                    return [2 /*return*/, false];
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, fs.stat(config_js_1.config.paths.activeTasksFile)];
                case 9:
                    stats = _a.sent();
                    logDebug("Active tasks file stats: size=".concat(stats.size, ", mtime=").concat(stats.mtime));
                    if (stats.size === 0) {
                        logError(ActiveTaskErrorCode.FILE_READ_ERROR, "Active tasks file is empty: ".concat(config_js_1.config.paths.activeTasksFile));
                        return [2 /*return*/, false];
                    }
                    return [3 /*break*/, 11];
                case 10:
                    error_2 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, "Error getting active tasks file stats: ".concat(config_js_1.config.paths.activeTasksFile), error_2);
                    return [2 /*return*/, false];
                case 11: return [2 /*return*/, true];
                case 12:
                    error_3 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, "Error checking active tasks file: ".concat(config_js_1.config.paths.activeTasksFile), error_3);
                    return [2 /*return*/, false];
                case 13: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get active tasks data with caching
 * @returns Promise resolving to active tasks data
 */
function getActiveTasksDataWithCache() {
    return __awaiter(this, void 0, void 0, function () {
        var cachedData, isFileValid, content, data, error_4, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    cachedData = getCachedActiveTasksData();
                    if (cachedData) {
                        logDebug('Using cached active tasks data');
                        return [2 /*return*/, cachedData];
                    }
                    return [4 /*yield*/, checkActiveTasksFile()];
                case 1:
                    isFileValid = _a.sent();
                    if (!isFileValid) {
                        logWarning('Active tasks file is not valid, returning empty array');
                        return [2 /*return*/, { activeTasks: [] }];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    logDebug("Reading active tasks file: ".concat(config_js_1.config.paths.activeTasksFile));
                    return [4 /*yield*/, fs_1.promises.readFile(config_js_1.config.paths.activeTasksFile, 'utf8')];
                case 3:
                    content = _a.sent();
                    if (!content || content.trim() === '') {
                        logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Active tasks file is empty');
                        return [2 /*return*/, { activeTasks: [] }];
                    }
                    logDebug("Active tasks file content length: ".concat(content.length));
                    // Try to parse the JSON
                    try {
                        data = JSON.parse(content);
                        // Validate the data structure
                        if (!data || typeof data !== 'object') {
                            logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Invalid active tasks data: not an object');
                            return [2 /*return*/, { activeTasks: [] }];
                        }
                        if (!data.activeTasks || !Array.isArray(data.activeTasks)) {
                            logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Invalid active tasks data: activeTasks is not an array');
                            return [2 /*return*/, { activeTasks: [] }];
                        }
                        // Cache the data
                        cacheActiveTasksData(data);
                        logInfo("Found ".concat(data.activeTasks.length, " active tasks"));
                        // Log the active tasks for debugging
                        if (CURRENT_LOG_LEVEL >= LogLevel.DEBUG) {
                            data.activeTasks.forEach(function (task, index) {
                                logDebug("Active task ".concat(index + 1, ": id=").concat(task.id, ", label=").concat(task.label));
                            });
                        }
                        return [2 /*return*/, data];
                    }
                    catch (error) {
                        logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error parsing active tasks JSON', error);
                        // Log the first 100 characters of the content to help debug
                        if (content.length > 0) {
                            logDebug("First 100 chars of content: ".concat(content.substring(0, 100), "..."));
                        }
                        return [2 /*return*/, { activeTasks: [] }];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_4 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error reading active tasks file', error_4);
                    return [2 /*return*/, { activeTasks: [] }];
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_5 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Unexpected error in getActiveTasksDataWithCache', error_5);
                    return [2 /*return*/, { activeTasks: [] }];
                case 7: return [2 /*return*/];
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
        var label_1, cachedData, task_1, activeTasksData_1, task, cachedTask, activeTasksData_2, task, activeTasksData, task, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    logDebug("Getting active task with taskIdOrLabel: ".concat(taskIdOrLabel || 'undefined'));
                    if (!(taskIdOrLabel === 'ACTIVE_A' || taskIdOrLabel === 'ACTIVE_B')) return [3 /*break*/, 2];
                    label_1 = taskIdOrLabel === 'ACTIVE_A' ? 'A' : 'B';
                    logDebug("Looking for active task with label: ".concat(label_1));
                    cachedData = getCachedActiveTasksData();
                    if (cachedData && cachedData.activeTasks) {
                        task_1 = cachedData.activeTasks.find(function (t) { return t.label === label_1; });
                        if (task_1) {
                            logDebug("Found cached task with label ".concat(label_1, ": ").concat(task_1.id));
                            return [2 /*return*/, task_1];
                        }
                    }
                    return [4 /*yield*/, getActiveTasksDataWithCache()];
                case 1:
                    activeTasksData_1 = _a.sent();
                    // Log all active tasks for debugging
                    if (CURRENT_LOG_LEVEL >= LogLevel.DEBUG) {
                        logDebug("Active tasks data: ".concat(JSON.stringify(activeTasksData_1)));
                    }
                    task = activeTasksData_1.activeTasks.find(function (task) { return task.label === label_1; });
                    if (task) {
                        logDebug("Found task with label ".concat(label_1, ": ").concat(task.id));
                        return [2 /*return*/, task];
                    }
                    logWarning("No task found with label: ".concat(label_1));
                    return [2 /*return*/, undefined];
                case 2:
                    if (!taskIdOrLabel) return [3 /*break*/, 4];
                    logDebug("Looking for active task with ID: ".concat(taskIdOrLabel));
                    cachedTask = getCachedActiveTask(taskIdOrLabel);
                    if (cachedTask) {
                        logDebug("Found cached task with ID: ".concat(taskIdOrLabel));
                        return [2 /*return*/, cachedTask];
                    }
                    return [4 /*yield*/, getActiveTasksDataWithCache()];
                case 3:
                    activeTasksData_2 = _a.sent();
                    task = activeTasksData_2.activeTasks.find(function (t) { return t.id === taskIdOrLabel; });
                    if (task) {
                        // Cache the task
                        cacheActiveTask(taskIdOrLabel, task);
                        logDebug("Found and cached task with ID: ".concat(taskIdOrLabel));
                        return [2 /*return*/, task];
                    }
                    logWarning("No task found with ID: ".concat(taskIdOrLabel));
                    return [2 /*return*/, undefined];
                case 4:
                    // If no taskIdOrLabel provided, return the first active task (prioritize A then B)
                    logDebug("No taskIdOrLabel provided, looking for default active task");
                    return [4 /*yield*/, getActiveTasksDataWithCache()];
                case 5:
                    activeTasksData = _a.sent();
                    if (activeTasksData.activeTasks && activeTasksData.activeTasks.length > 0) {
                        task = activeTasksData.activeTasks.find(function (t) { return t.label === 'A'; }) ||
                            activeTasksData.activeTasks.find(function (t) { return t.label === 'B'; }) ||
                            activeTasksData.activeTasks[0];
                        if (task) {
                            logDebug("Found default active task: ".concat(task.id, " (label: ").concat(task.label, ")"));
                            return [2 /*return*/, task];
                        }
                    }
                    logWarning('No active tasks found');
                    return [3 /*break*/, 7];
                case 6:
                    error_6 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error getting active task', error_6);
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
        var activeTasksData, filteredTasks, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    logDebug("Getting all active tasks".concat(label ? " with label: ".concat(label) : ''));
                    return [4 /*yield*/, getActiveTasksDataWithCache()];
                case 1:
                    activeTasksData = _a.sent();
                    if (!activeTasksData.activeTasks || activeTasksData.activeTasks.length === 0) {
                        logWarning('No active tasks found');
                        return [2 /*return*/, []];
                    }
                    // Filter by label if provided
                    if (label) {
                        filteredTasks = activeTasksData.activeTasks.filter(function (task) { return task.label === label; });
                        logDebug("Found ".concat(filteredTasks.length, " tasks with label: ").concat(label));
                        return [2 /*return*/, filteredTasks];
                    }
                    // Return all active tasks
                    logDebug("Found ".concat(activeTasksData.activeTasks.length, " active tasks"));
                    return [2 /*return*/, activeTasksData.activeTasks];
                case 2:
                    error_7 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error getting all active tasks', error_7);
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
        var taskLocation, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    logDebug("Getting tasks directory for task: ".concat(taskId));
                    return [4 /*yield*/, pathUtils.findTaskAcrossPaths(taskId)];
                case 1:
                    taskLocation = _a.sent();
                    if (taskLocation) {
                        logDebug("Found task directory: ".concat(taskLocation.basePath));
                        return [2 /*return*/, taskLocation.basePath];
                    }
                    // If task not found, throw an error
                    logError(ActiveTaskErrorCode.TASK_NOT_FOUND, "Task directory not found for task ID: ".concat(taskId));
                    throw new Error("Task directory not found for task ID: ".concat(taskId));
                case 2:
                    error_8 = _a.sent();
                    logError(ActiveTaskErrorCode.TASK_NOT_FOUND, "Task directory not found for task ID: ".concat(taskId), error_8);
                    throw error_8;
                case 3: return [2 /*return*/];
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
        var taskLocation, exists, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    logDebug("Validating task exists: ".concat(taskId));
                    return [4 /*yield*/, pathUtils.findTaskAcrossPaths(taskId)];
                case 1:
                    taskLocation = _a.sent();
                    exists = !!taskLocation;
                    logDebug("Task ".concat(taskId, " exists: ").concat(exists));
                    return [2 /*return*/, exists];
                case 2:
                    error_9 = _a.sent();
                    logError(ActiveTaskErrorCode.TASK_NOT_FOUND, "Error validating task existence: ".concat(taskId), error_9);
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
        var taskLocation, filePath, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    logDebug("Getting API conversation file path for task: ".concat(taskId));
                    return [4 /*yield*/, pathUtils.findTaskAcrossPaths(taskId)];
                case 1:
                    taskLocation = _a.sent();
                    if (taskLocation) {
                        filePath = pathUtils.getApiConversationFilePath(taskLocation.basePath, taskId);
                        logDebug("Found API conversation file path: ".concat(filePath));
                        return [2 /*return*/, filePath];
                    }
                    // If task not found, throw an error
                    logError(ActiveTaskErrorCode.TASK_NOT_FOUND, "Task not found for API conversation file: ".concat(taskId));
                    throw new Error("Task not found for API conversation file: ".concat(taskId));
                case 2:
                    error_10 = _a.sent();
                    logError(ActiveTaskErrorCode.TASK_NOT_FOUND, "Error getting API conversation file path: ".concat(taskId), error_10);
                    throw error_10;
                case 3: return [2 /*return*/];
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
        var taskLocation, taskDir, adviceDir, dismissedDir, adviceFilePath, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    logDebug("Writing advice to task: ".concat(taskId));
                    return [4 /*yield*/, pathUtils.findTaskAcrossPaths(taskId)];
                case 1:
                    taskLocation = _a.sent();
                    if (!taskLocation) {
                        logError(ActiveTaskErrorCode.TASK_NOT_FOUND, "Task not found for writing advice: ".concat(taskId));
                        throw new Error("Task not found for writing advice: ".concat(taskId));
                    }
                    taskDir = pathUtils.getTaskDirectory(taskLocation.basePath, taskId);
                    adviceDir = path.join(taskDir, 'external-advice');
                    // Create advice directory if it doesn't exist
                    return [4 /*yield*/, fs.mkdirp(adviceDir)];
                case 2:
                    // Create advice directory if it doesn't exist
                    _a.sent();
                    dismissedDir = path.join(adviceDir, 'Dismissed');
                    return [4 /*yield*/, fs.mkdirp(dismissedDir)];
                case 3:
                    _a.sent();
                    adviceFilePath = path.join(adviceDir, "".concat(advice.id, ".json"));
                    return [4 /*yield*/, fs.writeFile(adviceFilePath, JSON.stringify(advice, null, 2), 'utf8')];
                case 4:
                    _a.sent();
                    logInfo("Advice written to ".concat(adviceFilePath));
                    return [3 /*break*/, 6];
                case 5:
                    error_11 = _a.sent();
                    logError(ActiveTaskErrorCode.FILE_READ_ERROR, 'Error writing advice to task', error_11);
                    throw error_11;
                case 6: return [2 /*return*/];
            }
        });
    });
}
