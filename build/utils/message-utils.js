/**
 * Message utilities for the Cline Chat Reader MCP Server
 * Handles message transformation and standardization
 */
import { logError, logWarning } from './active-task.js';
import { parseJsonWithRepair } from './json-repair.js';
/**
 * Error codes for message operations
 */
export var MessageErrorCode;
(function (MessageErrorCode) {
    MessageErrorCode["PARSE_ERROR"] = "PARSE_ERROR";
    MessageErrorCode["TRANSFORM_ERROR"] = "TRANSFORM_ERROR";
    MessageErrorCode["INVALID_FORMAT"] = "INVALID_FORMAT";
})(MessageErrorCode || (MessageErrorCode = {}));
/**
 * Format message content for Claude Desktop
 * Handles different content formats (string, object, array)
 * @param content Message content in any format
 * @returns Formatted content as string
 */
export function formatMessageContent(content) {
    try {
        if (typeof content === 'string') {
            return content;
        }
        else if (Array.isArray(content)) {
            // Handle array of content blocks (common in Claude responses)
            return content.map(item => {
                if (item.type === 'text') {
                    return item.text;
                }
                else if (item.type === 'image' && item.source) {
                    return `[Image: ${item.source.substring(0, 50)}...]`;
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
        logError(MessageErrorCode.TRANSFORM_ERROR, 'Error formatting message content:', error);
        return String(content || '');
    }
}
/**
 * Standardize message content for Claude Desktop compatibility
 * @param messages Array of messages
 * @returns Transformed messages with standardized content
 */
export function standardizeMessageContent(messages) {
    try {
        return messages.map(message => {
            // Create a copy of the message to avoid modifying the original
            const transformedMessage = { ...message };
            // Format the content if it's not a string
            if (typeof message.content !== 'string') {
                transformedMessage.content = formatMessageContent(message.content);
            }
            return transformedMessage;
        });
    }
    catch (error) {
        logError(MessageErrorCode.TRANSFORM_ERROR, 'Error standardizing message content:', error);
        return messages; // Return original messages on error
    }
}
/**
 * Parse conversation content and extract messages
 * @param content File content as string
 * @param limit Maximum number of messages to retrieve
 * @returns Array of messages
 */
export function parseConversationContent(content, limit, isUiFormat = false) {
    // First try direct parse
    let data = parseJsonWithRepair(content);
    if (!data) {
        logError(MessageErrorCode.PARSE_ERROR, 'Failed to parse conversation content even after repair');
        return [];
    }
    let messages = [];
    if (isUiFormat) {
        // Handle UI messages format - array of objects with text property
        if (Array.isArray(data)) {
            messages = data.map(item => ({
                role: item.say === 'text' ? 'human' : 'assistant',
                content: item.text || '',
                timestamp: item.ts
            }));
        }
    }
    else {
        // Handle API format
        if (Array.isArray(data)) {
            messages = data;
        }
        else if (data.messages && Array.isArray(data.messages)) {
            messages = data.messages;
        }
        else if (data.conversation && Array.isArray(data.conversation)) {
            messages = data.conversation;
        }
    }
    // Sort messages by timestamp if available
    messages.sort((a, b) => {
        const timestampA = a.timestamp || 0;
        const timestampB = b.timestamp || 0;
        return timestampA - timestampB;
    });
    // Return the most recent messages up to the limit
    return messages.slice(-limit);
}
/**
 * Validate message format
 * @param message Message to validate
 * @returns True if the message is valid, false otherwise
 */
export function validateMessageFormat(message) {
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
export function filterInvalidMessages(messages) {
    const validMessages = [];
    for (const message of messages) {
        if (validateMessageFormat(message)) {
            validMessages.push(message);
        }
        else {
            logWarning('Filtered invalid message:', message);
        }
    }
    return validMessages;
}
