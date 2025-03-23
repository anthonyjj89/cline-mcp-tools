/**
 * Chat and conversation models for the Cline Chat Reader MCP Server
 */

/**
 * Chat metadata model representing a VS Code extension chat
 */
export interface ChatMetadata {
  id: string;                 // Chat ID (timestamp)
  timestamp: number;          // Chat timestamp as a number
  created: Date | string;     // Creation date
  modified: Date | string;    // Last modified date
  hasApiConversation: boolean; // Whether the chat has an API conversation file
  hasUiMessages: boolean;     // Whether the chat has a UI messages file
  apiFileSize: string;        // Human-readable API file size
  uiFileSize: string;         // Human-readable UI file size
  apiFileSizeBytes: number;   // API file size in bytes
  uiFileSizeBytes: number;    // UI file size in bytes
}

/**
 * Message role type
 */
export type MessageRole = 'human' | 'assistant' | 'system';

/**
 * Base conversation message interface
 */
export interface ConversationMessage {
  role: MessageRole;
  timestamp?: number;
  [key: string]: any;  // Allow additional properties
}

/**
 * Text-based conversation message
 */
export interface TextMessage extends ConversationMessage {
  content: string;
}

/**
 * Object-based conversation message
 */
export interface ObjectMessage extends ConversationMessage {
  content: {
    [key: string]: any;
  };
}

/**
 * Any type of conversation message
 */
export type Message = TextMessage | ObjectMessage;

/**
 * Search result interface with context snippet
 */
export interface SearchResult {
  chatId: string;
  timestamp?: number;
  role: MessageRole;
  snippet: string;
  message: Message;
}

/**
 * Chat summary with conversation statistics
 */
export interface ChatSummary extends ChatMetadata {
  totalMessages: number;
  totalHumanMessages: number;
  totalAssistantMessages: number;
  previewMessages: Message[];
  duration: number | null;
  sampleFirst: Message | null;
  sampleLast: Message | null;
}

/**
 * UI Message from the VS Code extension
 */
export interface UiMessage {
  type: string;
  timestamp?: number;
  content: any;
}
