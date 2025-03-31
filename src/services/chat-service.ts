/**
 * Chat service for the Cline Chat Reader MCP Server
 * Provides functionality for listing and retrieving VS Code extension chats
 */

import fs from 'fs-extra';
import path from 'path';
import { 
  getChatDirectory, 
  getApiConversationFilePath, 
  getUiMessagesFilePath,
  formatFileSize 
} from '../utils/paths-chat.js';
import { 
  ChatMetadata, 
  ChatSummary,
  Message 
} from '../models/chat.js';
import { countJsonArrayItems } from '../utils/json-streaming.js';
// Import from the index file to avoid circular dependencies
import { getConversationHistory } from './index.js';

/**
 * List all chats in the VS Code extension chats directory
 * @param chatsDir Path to the VS Code extension chats directory
 * @returns Promise resolving to an array of chat IDs and timestamps
 */
export async function listChats(chatsDir: string): Promise<Array<{ id: string, timestamp: number }>> {
  try {
    // Make sure chats directory exists
    if (!await fs.pathExists(chatsDir)) {
      return [];
    }
    
    // Read all directories in the chats directory
    const dirs = await fs.readdir(chatsDir, { withFileTypes: true });
    
    // Filter for directories only
    const chatDirs = dirs
      .filter(dir => dir.isDirectory())
      .map(dir => {
        const id = dir.name;
        const timestamp = parseInt(id, 10) || 0; // Convert directory name to timestamp
        return { id, timestamp };
      })
      // Sort by timestamp descending (newest first)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return chatDirs;
  } catch (error) {
    console.error('Error listing chats:', error);
    throw new Error(`Failed to list chats: ${(error as Error).message}`);
  }
}

/**
 * Get details for a specific chat
 * @param chatsDir Path to the VS Code extension chats directory
 * @param chatId Chat ID
 * @returns Promise resolving to chat metadata
 */
export async function getChat(chatsDir: string, chatId: string): Promise<ChatMetadata> {
  try {
    // Validate chat directory exists
    const chatDir = getChatDirectory(chatsDir, chatId);
    await fs.access(chatDir);
    
    // Get file stats for timestamp information
    const stats = await fs.stat(chatDir);
    
    // Check for api_conversation_history.json and ui_messages.json
    const apiFilePath = getApiConversationFilePath(chatsDir, chatId);
    const uiFilePath = getUiMessagesFilePath(chatsDir, chatId);
    
    let apiFileExists = false;
    let uiFileExists = false;
    
    try {
      await fs.access(apiFilePath);
      apiFileExists = true;
    } catch (e) {
      // File doesn't exist
    }
    
    try {
      await fs.access(uiFilePath);
      uiFileExists = true;
    } catch (e) {
      // File doesn't exist
    }
    
    // Get file sizes if they exist
    let apiFileSize = 0;
    let uiFileSize = 0;
    
    if (apiFileExists) {
      const apiStats = await fs.stat(apiFilePath);
      apiFileSize = apiStats.size;
    }
    
    if (uiFileExists) {
      const uiStats = await fs.stat(uiFilePath);
      uiFileSize = uiStats.size;
    }
    
    // Return chat metadata
    return {
      id: chatId,
      timestamp: parseInt(chatId, 10) || 0,
      created: stats.birthtime,
      modified: stats.mtime,
      hasApiConversation: apiFileExists,
      hasUiMessages: uiFileExists,
      apiFileSize: formatFileSize(apiFileSize),
      uiFileSize: formatFileSize(uiFileSize),
      apiFileSizeBytes: apiFileSize,
      uiFileSizeBytes: uiFileSize
    };
  } catch (error) {
    console.error(`Error getting chat ${chatId}:`, error);
    throw new Error(`Failed to get chat ${chatId}: ${(error as Error).message}`);
  }
}

/**
 * Get the latest chat
 * @param chatsDir Path to the VS Code extension chats directory
 * @returns Promise resolving to the latest chat metadata
 */
export async function getLatestChat(chatsDir: string): Promise<ChatMetadata> {
  try {
    const chats = await listChats(chatsDir);
    
    if (chats.length === 0) {
      throw new Error('No chats found');
    }
    
    // Get the most recent chat (first in the sorted list)
    const latestChat = chats[0];
    
    // Get full chat details
    return await getChat(chatsDir, latestChat.id);
  } catch (error) {
    console.error('Error getting latest chat:', error);
    throw new Error(`Failed to get latest chat: ${(error as Error).message}`);
  }
}

/**
 * Generate a summary of a chat's conversation
 * @param chatsDir Path to the VS Code extension chats directory
 * @param chatId Chat ID
 * @returns Promise resolving to a chat summary
 */
export async function getChatSummary(chatsDir: string, chatId: string): Promise<ChatSummary> {
  try {
    // Get chat details
    const chat = await getChat(chatsDir, chatId);
    
    // Initial summary with chat metadata
    const summary: ChatSummary = {
      ...chat,
      totalMessages: 0,
      totalHumanMessages: 0,
      totalAssistantMessages: 0,
      previewMessages: [],
      duration: chat.modified && chat.created ? 
        new Date(chat.modified).getTime() - new Date(chat.created).getTime() : 
        null,
      sampleFirst: null,
      sampleLast: null
    };
    
    // If no API conversation, return the basic summary
    if (!chat.hasApiConversation) {
      return summary;
    }
    
    // Get a sample of the conversation (first and last few messages)
    const previewMessages = await getConversationHistory(chatId, { limit: 10 });
    summary.previewMessages = previewMessages;
    
    if (previewMessages.length > 0) {
      summary.sampleFirst = previewMessages[0];
      summary.sampleLast = previewMessages[previewMessages.length - 1];
    }
    
    // Count the total messages
    const apiFilePath = getApiConversationFilePath(chatsDir, chatId);
    const totalMessages = await countJsonArrayItems(apiFilePath);
    summary.totalMessages = totalMessages;
    
    // Count message types by scanning the file
    // We'll implement this using our conversation service to filter by role
    const humanMessages = await getConversationHistory(chatId, {
      limit: Number.MAX_SAFE_INTEGER,
      filterFn: (message: Message) => message.role === 'human'
    });
    
    const assistantMessages = await getConversationHistory(chatId, {
      limit: Number.MAX_SAFE_INTEGER,
      filterFn: (message: Message) => message.role === 'assistant'
    });
    
    summary.totalHumanMessages = humanMessages.length;
    summary.totalAssistantMessages = assistantMessages.length;
    
    return summary;
  } catch (error) {
    console.error(`Error generating summary for chat ${chatId}:`, error);
    throw new Error(`Failed to generate chat summary: ${(error as Error).message}`);
  }
}
