/**
 * Message utilities for the Cline Chat Reader MCP Server
 * Handles message transformation and standardization
 */

import { Message } from '../models/task.js';
import { logError, logWarning } from './active-task.js';

/**
 * Error codes for message operations
 */
export enum MessageErrorCode {
  PARSE_ERROR = 'PARSE_ERROR',
  TRANSFORM_ERROR = 'TRANSFORM_ERROR',
  INVALID_FORMAT = 'INVALID_FORMAT'
}

/**
 * Format message content for Claude Desktop
 * Handles different content formats (string, object, array)
 * @param content Message content in any format
 * @returns Formatted content as string
 */
export function formatMessageContent(content: any): string {
  try {
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      // Handle array of content blocks (common in Claude responses)
      return content.map(item => {
        if (item.type === 'text') {
          return item.text;
        } else if (item.type === 'image' && item.source) {
          return `[Image: ${item.source.substring(0, 50)}...]`;
        } else {
          return JSON.stringify(item);
        }
      }).join('\n');
    } else if (content && typeof content === 'object') {
      // Handle object content
      return JSON.stringify(content);
    } else {
      // Handle null, undefined, or other types
      return String(content);
    }
  } catch (error) {
    logError(MessageErrorCode.TRANSFORM_ERROR, 'Error formatting message content:', error);
    return String(content || '');
  }
}

/**
 * Standardize message content for Claude Desktop compatibility
 * @param messages Array of messages
 * @returns Transformed messages with standardized content
 */
export function standardizeMessageContent(messages: Message[]): Message[] {
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
  } catch (error) {
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
export function parseConversationContent(content: string, limit: number): Message[] {
  try {
    // Try to parse as JSON
    const data = JSON.parse(content);
    
    // Extract messages based on the file format
    let messages: Message[] = [];
    
    if (Array.isArray(data)) {
      // Direct array of messages
      messages = data;
    } else if (data.messages && Array.isArray(data.messages)) {
      // Object with messages property
      messages = data.messages;
    } else if (data.conversation && Array.isArray(data.conversation)) {
      // Object with conversation property
      messages = data.conversation;
    }
    
    // Sort messages by timestamp if available
    messages.sort((a, b) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampA - timestampB;
    });
    
    // Return the most recent messages up to the limit
    return messages.slice(-limit);
  } catch (error) {
    logError(MessageErrorCode.PARSE_ERROR, 'Error parsing conversation content:', error);
    return [];
  }
}

/**
 * Validate message format
 * @param message Message to validate
 * @returns True if the message is valid, false otherwise
 */
export function validateMessageFormat(message: any): boolean {
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
export function filterInvalidMessages(messages: any[]): Message[] {
  const validMessages: Message[] = [];
  
  for (const message of messages) {
    if (validateMessageFormat(message)) {
      validMessages.push(message);
    } else {
      logWarning('Filtered invalid message:', message);
    }
  }
  
  return validMessages;
}
