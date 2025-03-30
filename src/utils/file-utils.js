"use strict";
/**
 * File utilities for the Cline Chat Reader MCP Server
 * Handles file operations with error handling and retries
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
exports.FileErrorCode = void 0;
exports.clearMessageCache = clearMessageCache;
exports.readWithRetry = readWithRetry;
exports.getCachedMessages = getCachedMessages;
exports.cacheMessages = cacheMessages;
exports.readConversationMessages = readConversationMessages;
exports.readConversationMessagesWithTimeout = readConversationMessagesWithTimeout;
var fs_extra_1 = require("fs-extra");
var config_js_1 = require("../config.js");
var active_task_js_1 = require("./active-task.js");
var message_utils_js_1 = require("./message-utils.js");
/**
 * Error codes for file operations
 */
var FileErrorCode;
(function (FileErrorCode) {
    FileErrorCode["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
    FileErrorCode["READ_ERROR"] = "READ_ERROR";
    FileErrorCode["PARSE_ERROR"] = "PARSE_ERROR";
    FileErrorCode["WRITE_ERROR"] = "WRITE_ERROR";
    FileErrorCode["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
})(FileErrorCode || (exports.FileErrorCode = FileErrorCode = {}));
// In-memory cache for messages
var messageCache = {};
/**
 * Clear message cache
 */
function clearMessageCache() {
    Object.keys(messageCache).forEach(function (key) {
        delete messageCache[key];
    });
    (0, active_task_js_1.logInfo)('Message cache cleared');
}
/**
 * Read a file with retry logic
 * @param filePath Path to the file to read
 * @returns File content as string
 */
function readWithRetry(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var retries, lastError, _loop_1, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    retries = 0;
                    lastError = null;
                    _loop_1 = function () {
                        var _b, error_1, delay_1;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 2, , 4]);
                                    _b = {};
                                    return [4 /*yield*/, fs_extra_1.default.readFile(filePath, 'utf8')];
                                case 1: return [2 /*return*/, (_b.value = _c.sent(), _b)];
                                case 2:
                                    error_1 = _c.sent();
                                    lastError = error_1;
                                    retries++;
                                    // Log retry attempt
                                    (0, active_task_js_1.logWarning)("Retry ".concat(retries, "/").concat(config_js_1.config.errorHandling.maxRetries, " reading file: ").concat(filePath));
                                    delay_1 = config_js_1.config.errorHandling.baseRetryDelay * Math.pow(2, retries - 1);
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                case 3:
                                    _c.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1:
                    if (!(retries < config_js_1.config.errorHandling.maxRetries)) return [3 /*break*/, 3];
                    return [5 /*yield**/, _loop_1()];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    return [3 /*break*/, 1];
                case 3: throw new Error("Failed to read file after ".concat(config_js_1.config.errorHandling.maxRetries, " retries: ").concat(lastError === null || lastError === void 0 ? void 0 : lastError.message));
            }
        });
    });
}
/**
 * Get cached messages for a file if available and not expired
 * @param filePath Path to the conversation file
 * @returns Cached messages or null if not available
 */
function getCachedMessages(filePath) {
    var cached = messageCache[filePath];
    if (cached && Date.now() - cached.timestamp < config_js_1.config.cache.expirationTime) {
        return cached.messages;
    }
    return null;
}
/**
 * Cache messages for a file
 * @param filePath Path to the conversation file
 * @param messages Messages to cache
 */
function cacheMessages(filePath, messages) {
    messageCache[filePath] = {
        messages: messages,
        timestamp: Date.now()
    };
}
/**
 * Read conversation messages from a file
 * @param filePath Path to the conversation file
 * @param limit Maximum number of messages to retrieve
 * @returns Array of messages
 */
function readConversationMessages(filePath, limit) {
    return __awaiter(this, void 0, void 0, function () {
        var cachedMessages, stats, content_1, messages_1, validMessages_1, content, messages, validMessages, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, fs_extra_1.default.pathExists(filePath)];
                case 1:
                    // Check if file exists
                    if (!(_a.sent())) {
                        (0, active_task_js_1.logError)(FileErrorCode.FILE_NOT_FOUND, "Conversation file not found: ".concat(filePath));
                        return [2 /*return*/, []];
                    }
                    cachedMessages = getCachedMessages(filePath);
                    if (cachedMessages) {
                        (0, active_task_js_1.logInfo)("Using cached messages for ".concat(filePath));
                        return [2 /*return*/, cachedMessages.slice(-limit)];
                    }
                    return [4 /*yield*/, fs_extra_1.default.stat(filePath)];
                case 2:
                    stats = _a.sent();
                    if (!(stats.size < config_js_1.config.messages.smallFileThreshold)) return [3 /*break*/, 4];
                    return [4 /*yield*/, readWithRetry(filePath)];
                case 3:
                    content_1 = _a.sent();
                    messages_1 = (0, message_utils_js_1.parseConversationContent)(content_1, limit);
                    validMessages_1 = (0, message_utils_js_1.filterInvalidMessages)(messages_1);
                    // Cache messages
                    cacheMessages(filePath, validMessages_1);
                    return [2 /*return*/, validMessages_1];
                case 4:
                    // For large files, use a more efficient approach
                    // This is a simplified implementation - in a real-world scenario,
                    // you would use a streaming JSON parser or read the file in chunks from the end
                    (0, active_task_js_1.logWarning)("Large file detected (".concat(stats.size, " bytes): ").concat(filePath));
                    return [4 /*yield*/, readWithRetry(filePath)];
                case 5:
                    content = _a.sent();
                    messages = (0, message_utils_js_1.parseConversationContent)(content, limit);
                    validMessages = (0, message_utils_js_1.filterInvalidMessages)(messages);
                    // Cache messages
                    cacheMessages(filePath, validMessages);
                    return [2 /*return*/, validMessages];
                case 6:
                    error_2 = _a.sent();
                    (0, active_task_js_1.logError)(FileErrorCode.READ_ERROR, "Error reading conversation file: ".concat(filePath), error_2);
                    return [2 /*return*/, []];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Read conversation messages with timeout
 * @param filePath Path to the conversation file
 * @param limit Maximum number of messages to retrieve
 * @param timeoutMs Timeout in milliseconds
 * @returns Array of messages
 */
function readConversationMessagesWithTimeout(filePath_1, limit_1) {
    return __awaiter(this, arguments, void 0, function (filePath, limit, timeoutMs) {
        var timeoutPromise, error_3;
        if (timeoutMs === void 0) { timeoutMs = 5000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    timeoutPromise = new Promise(function (_, reject) {
                        setTimeout(function () {
                            reject(new Error("Timeout reading conversation file: ".concat(filePath)));
                        }, timeoutMs);
                    });
                    return [4 /*yield*/, Promise.race([
                            readConversationMessages(filePath, limit),
                            timeoutPromise
                        ])];
                case 1: 
                // Race the file reading against the timeout
                return [2 /*return*/, _a.sent()];
                case 2:
                    error_3 = _a.sent();
                    if (error_3.message.includes('Timeout')) {
                        (0, active_task_js_1.logError)(FileErrorCode.TIMEOUT_ERROR, "Timeout reading conversation file: ".concat(filePath));
                    }
                    else {
                        (0, active_task_js_1.logError)(FileErrorCode.READ_ERROR, "Error reading conversation file: ".concat(filePath), error_3);
                    }
                    // Return empty array on error
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
