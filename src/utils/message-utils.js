"use strict";
/**
 * Message utilities for the Cline Chat Reader MCP Server
 * Handles message transformation and standardization
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageErrorCode = void 0;
exports.formatMessageContent = formatMessageContent;
exports.standardizeMessageContent = standardizeMessageContent;
exports.parseConversationContent = parseConversationContent;
exports.validateMessageFormat = validateMessageFormat;
exports.filterInvalidMessages = filterInvalidMessages;
var active_task_js_1 = require("./active-task.js");
/**
 * Error codes for message operations
 */
var MessageErrorCode;
(function (MessageErrorCode) {
    MessageErrorCode["PARSE_ERROR"] = "PARSE_ERROR";
    MessageErrorCode["TRANSFORM_ERROR"] = "TRANSFORM_ERROR";
    MessageErrorCode["INVALID_FORMAT"] = "INVALID_FORMAT";
})(MessageErrorCode || (exports.MessageErrorCode = MessageErrorCode = {}));
/**
 * Format message content for Claude Desktop
 * Handles different content formats (string, object, array)
 * @param content Message content in any format
 * @returns Formatted content as string
 */
function formatMessageContent(content) {
    try {
        if (typeof content === 'string') {
            return content;
        }
        else if (Array.isArray(content)) {
            // Handle array of content blocks (common in Claude responses)
            return content.map(function (item) {
                if (item.type === 'text') {
                    return item.text;
                }
                else if (item.type === 'image' && item.source) {
                    return "[Image: ".concat(item.source.substring(0, 50), "...]");
                }
                else {
                    return JSON.stringify(item);
                }
            }).join('\n');
        }
        else if (content && typeof content === 'object') {
            // Handle object content
            return JSON.stringify(content);
        }
        else {
            // Handle null, undefined, or other types
            return String(content);
        }
    }
    catch (error) {
        (0, active_task_js_1.logError)(MessageErrorCode.TRANSFORM_ERROR, 'Error formatting message content:', error);
        return String(content || '');
    }
}
/**
 * Standardize message content for Claude Desktop compatibility
 * @param messages Array of messages
 * @returns Transformed messages with standardized content
 */
function standardizeMessageContent(messages) {
    try {
        return messages.map(function (message) {
            // Create a copy of the message to avoid modifying the original
            var transformedMessage = __assign({}, message);
            // Format the content if it's not a string
            if (typeof message.content !== 'string') {
                transformedMessage.content = formatMessageContent(message.content);
            }
            return transformedMessage;
        });
    }
    catch (error) {
        (0, active_task_js_1.logError)(MessageErrorCode.TRANSFORM_ERROR, 'Error standardizing message content:', error);
        return messages; // Return original messages on error
    }
}
/**
 * Parse conversation content and extract messages
 * @param content File content as string
 * @param limit Maximum number of messages to retrieve
 * @returns Array of messages
 */
function parseConversationContent(content, limit) {
    try {
        // Try to parse as JSON
        var data = JSON.parse(content);
        // Extract messages based on the file format
        var messages = [];
        if (Array.isArray(data)) {
            // Direct array of messages
            messages = data;
        }
        else if (data.messages && Array.isArray(data.messages)) {
            // Object with messages property
            messages = data.messages;
        }
        else if (data.conversation && Array.isArray(data.conversation)) {
            // Object with conversation property
            messages = data.conversation;
        }
        // Sort messages by timestamp if available
        messages.sort(function (a, b) {
            var timestampA = a.timestamp || 0;
            var timestampB = b.timestamp || 0;
            return timestampA - timestampB;
        });
        // Return the most recent messages up to the limit
        return messages.slice(-limit);
    }
    catch (error) {
        (0, active_task_js_1.logError)(MessageErrorCode.PARSE_ERROR, 'Error parsing conversation content:', error);
        return [];
    }
}
/**
 * Validate message format
 * @param message Message to validate
 * @returns True if the message is valid, false otherwise
 */
function validateMessageFormat(message) {
    // Check if the message has a role property
    if (!message || !message.role) {
        return false;
    }
    // Check if the role is valid
    if (message.role !== 'human' && message.role !== 'assistant' && message.role !== 'system') {
        return false;
    }
    // Check if the message has a content property
    if (message.content === undefined) {
        return false;
    }
    return true;
}
/**
 * Filter invalid messages from an array
 * @param messages Array of messages
 * @returns Filtered array of valid messages
 */
function filterInvalidMessages(messages) {
    var validMessages = [];
    for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
        var message = messages_1[_i];
        if (validateMessageFormat(message)) {
            validMessages.push(message);
        }
        else {
            (0, active_task_js_1.logWarning)('Filtered invalid message:', message);
        }
    }
    return validMessages;
}
