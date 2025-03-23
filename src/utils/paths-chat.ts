/**
 * Path utility functions for the Cline Chat Reader MCP Server
 * Provides platform-specific path resolution and file access
 */

import os from 'os';
import path from 'path';
import fs from 'fs-extra';

/**
 * Get the platform-specific path to the VS Code extension chats directory
 * @returns The absolute path to the VS Code extension chats directory
 */
export function getVSCodeChatsDirectory(): string {
  const homedir = os.homedir();
  
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    case 'darwin':
      return path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    case 'linux':
      return path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

/**
 * Get the absolute path to a chat directory
 * @param chatsDir Base chats directory
 * @param chatId Chat ID
 * @returns The absolute path to the chat directory
 */
export function getChatDirectory(chatsDir: string, chatId: string): string {
  return path.join(chatsDir, chatId);
}

/**
 * Get the absolute path to a chat's API conversation history file
 * @param chatsDir Base chats directory
 * @param chatId Chat ID
 * @returns The absolute path to the API conversation history file
 */
export function getApiConversationFilePath(chatsDir: string, chatId: string): string {
  return path.join(chatsDir, chatId, 'api_conversation_history.json');
}

/**
 * Get the absolute path to a chat's UI messages file
 * @param chatsDir Base chats directory
 * @param chatId Chat ID
 * @returns The absolute path to the UI messages file
 */
export function getUiMessagesFilePath(chatsDir: string, chatId: string): string {
  return path.join(chatsDir, chatId, 'ui_messages.json');
}

/**
 * Check if a chat directory exists
 * @param chatsDir Base chats directory
 * @param chatId Chat ID
 * @returns True if the chat directory exists, false otherwise
 */
export async function chatExists(chatsDir: string, chatId: string): Promise<boolean> {
  try {
    await fs.access(getChatDirectory(chatsDir, chatId));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a chat's API conversation history file exists
 * @param chatsDir Base chats directory
 * @param chatId Chat ID
 * @returns True if the API conversation history file exists, false otherwise
 */
export async function apiConversationFileExists(chatsDir: string, chatId: string): Promise<boolean> {
  try {
    await fs.access(getApiConversationFilePath(chatsDir, chatId));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a chat's UI messages file exists
 * @param chatsDir Base chats directory
 * @param chatId Chat ID
 * @returns True if the UI messages file exists, false otherwise
 */
export async function uiMessagesFileExists(chatsDir: string, chatId: string): Promise<boolean> {
  try {
    await fs.access(getUiMessagesFilePath(chatsDir, chatId));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Format file size in human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
