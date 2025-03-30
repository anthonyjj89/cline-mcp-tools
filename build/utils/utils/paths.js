"use strict";
/**
 * Path utility functions for the Claude Task Reader MCP Server
 * Provides platform-specific path resolution and file access
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
exports.getVSCodeTasksDirectory = getVSCodeTasksDirectory;
exports.findTaskAcrossPaths = findTaskAcrossPaths;
exports.getTasksDirectoryForTask = getTasksDirectoryForTask;
exports.getTaskDirectory = getTaskDirectory;
exports.getApiConversationFilePath = getApiConversationFilePath;
exports.getUiMessagesFilePath = getUiMessagesFilePath;
exports.taskExists = taskExists;
exports.apiConversationFileExists = apiConversationFileExists;
exports.uiMessagesFileExists = uiMessagesFileExists;
exports.formatFileSize = formatFileSize;
exports.getCrashReportsDirectories = getCrashReportsDirectories;
exports.getCrashReportsDirectory = getCrashReportsDirectory;
exports.getDismissedCrashReportsDirectory = getDismissedCrashReportsDirectory;
exports.isStandardClineExtensionPath = isStandardClineExtensionPath;
exports.getActiveTasksData = getActiveTasksData;
exports.getActiveTask = getActiveTask;
exports.ensureCrashReportsDirectories = ensureCrashReportsDirectories;
var os_1 = require("os");
var path_1 = require("path");
var fs_extra_1 = require("fs-extra");
var config_js_1 = require("../config.js");
/**
 * Get the platform-specific path to the VS Code extension tasks directory
 * @param taskId Optional task ID to check for existence
 * @returns Array containing the absolute path to the VS Code extension tasks directory
 */
function getVSCodeTasksDirectory(taskId) {
    var homedir = os_1.default.homedir();
    // Define path for standard Cline extension based on platform
    var getPath = function () {
        switch (process.platform) {
            case 'win32':
                return [
                    // Standard Cline path
                    path_1.default.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
                ];
            case 'darwin':
                return [
                    // Standard Cline path
                    path_1.default.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
                ];
            case 'linux':
                return [
                    // Standard Cline path
                    path_1.default.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks')
                ];
            default:
                throw new Error("Unsupported platform: ".concat(process.platform));
        }
    };
    return getPath();
}
/**
 * Find a task across all possible paths
 * @param taskId Task ID to find
 * @returns Object containing the task directory and base path, or null if not found
 */
function findTaskAcrossPaths(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var allPaths, _i, allPaths_1, basePath, taskDir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    allPaths = getVSCodeTasksDirectory();
                    _i = 0, allPaths_1 = allPaths;
                    _a.label = 1;
                case 1:
                    if (!(_i < allPaths_1.length)) return [3 /*break*/, 4];
                    basePath = allPaths_1[_i];
                    taskDir = path_1.default.join(basePath, taskId);
                    return [4 /*yield*/, fs_extra_1.default.pathExists(taskDir)];
                case 2:
                    if (_a.sent()) {
                        return [2 /*return*/, { taskDir: taskDir, basePath: basePath }];
                    }
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, null]; // Task not found in any path
            }
        });
    });
}
/**
 * Get the appropriate tasks directory for a specific task
 * @param taskId Task ID to find
 * @returns The base path where the task exists, or the first existing path if not found
 */
function getTasksDirectoryForTask(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var taskLocation, allPaths;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, findTaskAcrossPaths(taskId)];
                case 1:
                    taskLocation = _a.sent();
                    if (taskLocation) {
                        return [2 /*return*/, taskLocation.basePath];
                    }
                    allPaths = getVSCodeTasksDirectory();
                    return [2 /*return*/, allPaths[0]];
            }
        });
    });
}
/**
 * Get the absolute path to a task directory
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the task directory
 */
function getTaskDirectory(tasksDir, taskId) {
    return path_1.default.join(tasksDir, taskId);
}
/**
 * Get the absolute path to a task's API conversation history file
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the API conversation history file
 */
function getApiConversationFilePath(tasksDir, taskId) {
    return path_1.default.join(tasksDir, taskId, 'api_conversation_history.json');
}
/**
 * Get the absolute path to a task's UI messages file
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns The absolute path to the UI messages file
 */
function getUiMessagesFilePath(tasksDir, taskId) {
    return path_1.default.join(tasksDir, taskId, 'ui_messages.json');
}
/**
 * Check if a task directory exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the task directory exists, false otherwise
 */
function taskExists(tasksDir, taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs_extra_1.default.access(getTaskDirectory(tasksDir, taskId))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_1 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if a task's API conversation history file exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the API conversation history file exists, false otherwise
 */
function apiConversationFileExists(tasksDir, taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs_extra_1.default.access(getApiConversationFilePath(tasksDir, taskId))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_2 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if a task's UI messages file exists
 * @param tasksDir Base tasks directory
 * @param taskId Task ID
 * @returns True if the UI messages file exists, false otherwise
 */
function uiMessagesFileExists(tasksDir, taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs_extra_1.default.access(getUiMessagesFilePath(tasksDir, taskId))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_3 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Format file size in human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return "".concat(parseFloat((bytes / Math.pow(k, i)).toFixed(2)), " ").concat(sizes[i]);
}
/**
 * Get the platform-specific path to the VS Code extension crash reports directory
 * @returns Array containing the absolute path to the VS Code extension crash reports directory
 */
function getCrashReportsDirectories() {
    var homedir = os_1.default.homedir();
    // Define path for standard Cline extension based on platform
    var getPath = function () {
        switch (process.platform) {
            case 'win32':
                return [
                    // Standard Cline path
                    path_1.default.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
                ];
            case 'darwin':
                return [
                    // Standard Cline path
                    path_1.default.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
                ];
            case 'linux':
                return [
                    // Standard Cline path
                    path_1.default.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'crashReports')
                ];
            default:
                throw new Error("Unsupported platform: ".concat(process.platform));
        }
    };
    return getPath();
}
/**
 * Get the appropriate crash reports directory
 * @returns The crash reports directory path
 */
function getCrashReportsDirectory() {
    return getCrashReportsDirectories()[0];
}
/**
 * Get the dismissed crash reports directory
 * @returns The dismissed crash reports directory path
 */
function getDismissedCrashReportsDirectory() {
    return path_1.default.join(getCrashReportsDirectory(), 'Dismissed');
}
/**
 * Check if a path is within the standard Cline extension
 * @param dirPath Directory path to check
 * @returns True if the path is within the standard Cline extension, false otherwise
 */
function isStandardClineExtensionPath(dirPath) {
    return dirPath.includes('saoudrizwan.claude-dev');
}
/**
 * Read the active tasks file for standard Cline
 * @returns Promise resolving to the active tasks data
 */
function getActiveTasksData() {
    return __awaiter(this, void 0, void 0, function () {
        var content, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, fs_extra_1.default.pathExists(config_js_1.config.paths.activeTasksFile)];
                case 1:
                    if (!_a.sent()) return [3 /*break*/, 3];
                    return [4 /*yield*/, fs_extra_1.default.readFile(config_js_1.config.paths.activeTasksFile, 'utf8')];
                case 2:
                    content = _a.sent();
                    return [2 /*return*/, JSON.parse(content)];
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_4 = _a.sent();
                    console.error('Error reading active tasks file:', error_4);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, { activeTasks: [] }];
            }
        });
    });
}
/**
 * Get active task by ID or label
 * @param taskId Optional task ID to find
 * @param label Optional label (A, B, C, D) to find
 * @returns The active task if found, undefined otherwise
 */
function getActiveTask(taskId, label) {
    return __awaiter(this, void 0, void 0, function () {
        var activeTasksData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getActiveTasksData()];
                case 1:
                    activeTasksData = _a.sent();
                    if (!activeTasksData.activeTasks || activeTasksData.activeTasks.length === 0) {
                        return [2 /*return*/, undefined];
                    }
                    // If taskId is provided, find by ID
                    if (taskId) {
                        return [2 /*return*/, activeTasksData.activeTasks.find(function (task) { return task.id === taskId; })];
                    }
                    // If label is provided, find by label
                    if (label) {
                        return [2 /*return*/, activeTasksData.activeTasks.find(function (task) { return task.label === label; })];
                    }
                    // If neither is provided, return the most recently activated task
                    return [2 /*return*/, activeTasksData.activeTasks.sort(function (a, b) { return b.lastActivated - a.lastActivated; })[0]];
            }
        });
    });
}
/**
 * Ensure the crash reports directories exist
 * @returns Object containing the created directories
 */
function ensureCrashReportsDirectories() {
    return __awaiter(this, void 0, void 0, function () {
        var crashReportsDir, dismissedDir, created;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    crashReportsDir = getCrashReportsDirectory();
                    dismissedDir = getDismissedCrashReportsDirectory();
                    created = false;
                    return [4 /*yield*/, fs_extra_1.default.pathExists(crashReportsDir)];
                case 1:
                    if (!!(_a.sent())) return [3 /*break*/, 3];
                    return [4 /*yield*/, fs_extra_1.default.mkdirp(crashReportsDir)];
                case 2:
                    _a.sent();
                    created = true;
                    _a.label = 3;
                case 3: return [4 /*yield*/, fs_extra_1.default.pathExists(dismissedDir)];
                case 4:
                    if (!!(_a.sent())) return [3 /*break*/, 6];
                    return [4 /*yield*/, fs_extra_1.default.mkdirp(dismissedDir)];
                case 5:
                    _a.sent();
                    created = true;
                    _a.label = 6;
                case 6: return [2 /*return*/, { crashReportsDir: crashReportsDir, dismissedDir: dismissedDir, created: created }];
            }
        });
    });
}
