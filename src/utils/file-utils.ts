/**
 * File utilities for the Cline Chat Reader MCP Server
 * Handles file operations with error handling and retries
 */

import * as fs from 'fs-extra';
import { config } from '../config.js';
import { Message } from '../models/task.js';
import { logError, logWarning, logInfo } from './active-task.js';
import { parseConversationContent, filterInvalidMessages } from './message-utils.js';

/**
 * Error codes for file operations
 */
export enum FileErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  READ_ERROR = 'READ_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  WRITE_ERROR = 'WRITE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

/**
 * Cache for storing recently read messages
 */
interface MessageCache {
  [filePath: string]: {
    messages: Message[];
    timestamp: number;
  };
}

// In-memory cache for messages
const messageCache: MessageCache = {};

/**
 * Clear message cache
 */
export function clearMessageCache(): void {
  Object.keys(messageCache).forEach(key => {
    delete messageCache[key];
  });
  logInfo('Message cache cleared');
}

/**
 * Read a file with retry logic
 * @param filePath Path to the file to read
 * @returns File content as string
 */
export async function readWithRetry(filePath: string): Promise<string> {
  let retries = 0;
  let lastError: Error | null = null;
  
  while (retries < config.errorHandling.maxRetries) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      lastError = error as Error;
      retries++;
      
      // Log retry attempt
      logWarning(`Retry ${retries}/${config.errorHandling.maxRetries} reading file: ${filePath}`);
      
      // Exponential backoff
      const delay = config.errorHandling.baseRetryDelay * Math.pow(2, retries - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed to read file after ${config.errorHandling.maxRetries} retries: ${lastError?.message}`);
}

/**
 * Get cached messages for a file if available and not expired
 * @param filePath Path to the conversation file
 * @returns Cached messages or null if not available
 */
export function getCachedMessages(filePath: string): Message[] | null {
  const cached = messageCache[filePath];
  
  if (cached && Date.now() - cached.timestamp < config.cache.expirationTime) {
    return cached.messages;
  }
  
  return null;
}

/**
 * Cache messages for a file
 * @param filePath Path to the conversation file
 * @param messages Messages to cache
 */
export function cacheMessages(filePath: string, messages: Message[]): void {
  messageCache[filePath] = {
    messages,
    timestamp: Date.now()
  };
}

/**
 * Read conversation messages from a file
 * @param filePath Path to the conversation file
 * @param limit Maximum number of messages to retrieve
 * @returns Array of messages
 */
export async function readConversationMessages(filePath: string, limit: number): Promise<Message[]> {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      logError(FileErrorCode.FILE_NOT_FOUND, `Conversation file not found: ${filePath}`);
      return [];
    }
    
    // Check cache first
    const cachedMessages = getCachedMessages(filePath);
    if (cachedMessages) {
      logInfo(`Using cached messages for ${filePath}`);
      return cachedMessages.slice(-limit);
    }
    
    // Check file size
    const stats = await fs.stat(filePath);
    
    // For small files, read the entire file at once
    if (stats.size < config.messages.smallFileThreshold) {
      const content = await readWithRetry(filePath);
      const messages = parseConversationContent(content, limit);
      
      // Filter invalid messages
      const validMessages = filterInvalidMessages(messages);
      
      // Cache messages
      cacheMessages(filePath, validMessages);
      
      return validMessages;
    }
    
    // For large files, use a more efficient approach
    // This is a simplified implementation - in a real-world scenario,
    // you would use a streaming JSON parser or read the file in chunks from the end
    logWarning(`Large file detected (${stats.size} bytes): ${filePath}`);
    const content = await readWithRetry(filePath);
    const messages = parseConversationContent(content, limit);
    
    // Filter invalid messages
    const validMessages = filterInvalidMessages(messages);
    
    // Cache messages
    cacheMessages(filePath, validMessages);
    
    return validMessages;
  } catch (error) {
    logError(FileErrorCode.READ_ERROR, `Error reading conversation file: ${filePath}`, error);
    return [];
  }
}

/**
 * Read conversation messages with timeout
 * @param filePath Path to the conversation file
 * @param limit Maximum number of messages to retrieve
 * @param timeoutMs Timeout in milliseconds
 * @returns Array of messages
 */
export async function readConversationMessagesWithTimeout(
  filePath: string, 
  limit: number, 
  timeoutMs: number = 5000
): Promise<Message[]> {
  try {
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise<Message[]>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout reading conversation file: ${filePath}`));
      }, timeoutMs);
    });
    
    // Race the file reading against the timeout
    return await Promise.race([
      readConversationMessages(filePath, limit),
      timeoutPromise
    ]);
  } catch (error) {
    if ((error as Error).message.includes('Timeout')) {
      logError(FileErrorCode.TIMEOUT_ERROR, `Timeout reading conversation file: ${filePath}`);
    } else {
      logError(FileErrorCode.READ_ERROR, `Error reading conversation file: ${filePath}`, error);
    }
    
    // Return empty array on error
    return [];
  }
}
