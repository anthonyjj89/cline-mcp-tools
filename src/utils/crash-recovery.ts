/**
 * Crash recovery utilities for the Claude Task Reader MCP Server
 * Provides functionality for recovering and analyzing crashed conversations
 */

import fs from 'fs';
import path from 'path';
import { Message } from '../models/task.js';
import { analyzeMessages, extractTopics, extractEntities } from './conversation-analyzer-simple.js';
import { readJsonArray } from './json-fallback.js';

/**
 * Recovery result interface
 */
export interface RecoveryResult {
  original_task: string;
  summary: string;
  modified_files: string[];
  key_topics: string[];
  main_topic: string;
  subtopics: string[];
  code_snippets: Array<{
    language: string;
    code: string;
    context: string;
  }>;
  code_evolution: Array<{
    file: string;
    language: string;
    code: string;
    description: string;
    iterations: number;
  }>;
  timeline: string;
  decision_points: string[];
  latest_state: string;
  recent_messages: Array<{
    role: string;
    content: string;
    timestamp?: number;
  }>;
  current_status: string;
  active_files: string[];
  open_questions: string[];
  recovery_confidence: number;
  message_count: {
    total: number;
    recovered: number;
    human: number;
    assistant: number;
  };
}

/**
 * Attempt to recover a crashed conversation file
 * @param taskIdOrFilePath Task ID or path to the conversation file
 * @param maxLength Maximum length of the summary
 * @param includeCodeSnippets Whether to include code snippets in the result
 * @returns Promise resolving to the recovery result
 */
export async function recoverCrashedConversation(
  taskIdOrFilePath: string,
  maxLength: number = 2000,
  includeCodeSnippets: boolean = true
): Promise<RecoveryResult> {
  // Check if input is a task ID or a direct file path
  let actualFilePath = taskIdOrFilePath;
  let taskId = '';
  
  // If input doesn't end with .json, it's likely a task ID
  if (!taskIdOrFilePath.endsWith('.json')) {
    taskId = taskIdOrFilePath;
    
    // Get both Cline Ultra and standard Cline paths
    const homedir = process.env.HOME || process.env.USERPROFILE || '';
    const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks', taskId);
    const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks', taskId);
    
    // Check for the API conversation file in both paths (with different naming conventions)
    const ultraApiFile = path.join(ultraPath, 'api-conversation.json');
    const ultraApiFileAlt = path.join(ultraPath, 'api_conversation_history.json');
    const standardApiFile = path.join(standardPath, 'api-conversation.json');
    const standardApiFileAlt = path.join(standardPath, 'api_conversation_history.json');
    
    // Check all possible file paths
    if (fs.existsSync(ultraApiFile)) {
      console.error(`Found conversation file in Cline Ultra (hyphen): ${ultraApiFile}`);
      actualFilePath = ultraApiFile;
    } else if (fs.existsSync(ultraApiFileAlt)) {
      console.error(`Found conversation file in Cline Ultra (underscore): ${ultraApiFileAlt}`);
      actualFilePath = ultraApiFileAlt;
    } else if (fs.existsSync(standardApiFile)) {
      console.error(`Found conversation file in standard Cline (hyphen): ${standardApiFile}`);
      actualFilePath = standardApiFile;
    } else if (fs.existsSync(standardApiFileAlt)) {
      console.error(`Found conversation file in standard Cline (underscore): ${standardApiFileAlt}`);
      actualFilePath = standardApiFileAlt;
    } else {
      console.error(`Task ID ${taskId} not found. Using provided path as direct file path.`);
    }
  }
  // Initialize recovery result
  const result: RecoveryResult = {
    original_task: '',
    summary: '',
    modified_files: [],
    key_topics: [],
    main_topic: '',
    subtopics: [],
    code_snippets: [],
    code_evolution: [],
    timeline: '',
    decision_points: [],
    latest_state: '',
    recent_messages: [],
    current_status: '',
    active_files: [],
    open_questions: [],
    recovery_confidence: 0,
    message_count: {
      total: 0,
      recovered: 0,
      human: 0,
      assistant: 0
    }
  };
  
  // Try different recovery strategies in order of increasing aggressiveness
  const messages = await attemptRecovery(actualFilePath);
  
  // Update message counts
  result.message_count.recovered = messages.length;
  result.message_count.human = messages.filter(m => m.role === 'human').length;
  result.message_count.assistant = messages.filter(m => m.role === 'assistant').length;
  
  // Estimate total message count based on file size and average message size
  try {
    const stats = await fs.promises.stat(actualFilePath);
    const fileSize = stats.size;
    const avgMessageSize = messages.length > 0 ? 
      fileSize / messages.length : 
      0;
    
    if (avgMessageSize > 0) {
      result.message_count.total = Math.round(fileSize / avgMessageSize);
    } else {
      result.message_count.total = result.message_count.recovered;
    }
  } catch (error) {
    result.message_count.total = result.message_count.recovered;
  }
  
  // Calculate recovery confidence
  result.recovery_confidence = result.message_count.recovered / 
    (result.message_count.total > 0 ? result.message_count.total : 1);
  
  // Extract original task from the first human message
  const firstHumanMessage = messages.find(m => m.role === 'human');
  if (firstHumanMessage && firstHumanMessage.content) {
    result.original_task = extractOriginalTask(firstHumanMessage);
  }
  
  // Extract key topics - include all topics, not just top 10
  result.key_topics = extractTopics(messages);
  
  // Determine main topic and subtopics
  const topicAnalysis = analyzeTopics(result.key_topics, messages);
  result.main_topic = topicAnalysis.mainTopic;
  result.subtopics = topicAnalysis.subtopics;
  
  // Extract modified files - include all files, not just top 20
  const entities = extractEntities(messages);
  result.modified_files = entities.files;
  
  // Identify active files (most recently discussed/modified)
  result.active_files = identifyActiveFiles(messages, entities.files);
  
  // Extract code snippets if requested
  if (includeCodeSnippets) {
    result.code_snippets = extractCodeSnippets(messages);
    // Track code evolution
    result.code_evolution = extractCodeEvolution(messages);
  }
  
  // Generate timeline
  result.timeline = generateTimeline(messages);
  
  // Identify decision points
  result.decision_points = identifyDecisionPoints(messages);
  
  // Extract open questions
  result.open_questions = extractOpenQuestions(messages);
  
  // Generate summary
  result.summary = generateSummary(messages, maxLength);
  
  // Extract recent messages (last 15 messages)
  result.recent_messages = extractRecentMessages(messages, 15);
  
  // Determine current status
  result.current_status = determineCurrentStatus(messages);
  
  // Extract latest state from the last few messages - expanded to include more context
  result.latest_state = extractLatestState(messages, 10); // Increased from 5 to 10 messages
  
  return result;
}

/**
 * Attempt to recover messages using progressively more aggressive strategies
 * @param filePath Path to the conversation file
 * @returns Promise resolving to the recovered messages
 */
async function attemptRecovery(filePath: string): Promise<Message[]> {
  try {
    // Strategy 1: Try direct JSON parsing (using existing functionality)
    try {
      return await readJsonArray<Message>(filePath);
    } catch (error) {
      console.warn(`Direct JSON parsing failed: ${(error as Error).message}`);
    }
    
    // Strategy 2: Try chunk-by-chunk parsing with error skipping
    try {
      return await recoverByChunks(filePath);
    } catch (error) {
      console.warn(`Chunk-by-chunk parsing failed: ${(error as Error).message}`);
    }
    
    // Strategy 3: Try line-by-line parsing with JSON repair
    try {
      return await recoverByLines(filePath);
    } catch (error) {
      console.warn(`Line-by-line parsing failed: ${(error as Error).message}`);
    }
    
    // Strategy 4: Extract any valid JSON objects from the file
    return await extractValidJsonObjects(filePath);
  } catch (error) {
    // If all strategies fail, return an empty array
    console.error(`All recovery strategies failed: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Recover messages by processing the file in chunks
 * @param filePath Path to the conversation file
 * @returns Promise resolving to the recovered messages
 */
async function recoverByChunks(filePath: string): Promise<Message[]> {
  return new Promise((resolve, reject) => {
    try {
      // Read the file in chunks
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Split the file into chunks (array-like structure)
      const chunks = fileContent.split(/[\[\],]\s*\n/).filter(chunk => chunk.trim());
      
      // Process each chunk as a potential message
      const messages: Message[] = [];
      
      for (const chunk of chunks) {
        try {
          // Try to parse the chunk as JSON
          const message = JSON.parse(`${chunk}`);
          
          // Validate that it looks like a message
          if (message && typeof message === 'object' && 'role' in message) {
            messages.push(message as Message);
          }
        } catch (error) {
          // Skip invalid chunks
          continue;
        }
      }
      
      resolve(messages);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Recover messages by processing the file line by line
 * @param filePath Path to the conversation file
 * @returns Promise resolving to the recovered messages
 */
async function recoverByLines(filePath: string): Promise<Message[]> {
  return new Promise((resolve, reject) => {
    try {
      // Read the file line by line
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      // Process lines to reconstruct messages
      const messages: Message[] = [];
      let currentMessage = '';
      let bracketCount = 0;
      
      for (const line of lines) {
        // Count opening and closing brackets to track JSON objects
        const openBrackets = (line.match(/{/g) || []).length;
        const closeBrackets = (line.match(/}/g) || []).length;
        
        bracketCount += openBrackets - closeBrackets;
        currentMessage += line;
        
        // If brackets are balanced, we might have a complete JSON object
        if (bracketCount === 0 && currentMessage.trim()) {
          try {
            // Clean up the message string
            let cleanMessage = currentMessage.trim();
            if (cleanMessage.startsWith(',')) {
              cleanMessage = cleanMessage.substring(1);
            }
            
            // Try to parse as JSON
            const message = JSON.parse(cleanMessage);
            
            // Validate that it looks like a message
            if (message && typeof message === 'object' && 'role' in message) {
              messages.push(message as Message);
            }
          } catch (error) {
            // Skip invalid messages
          }
          
          // Reset for next message
          currentMessage = '';
        }
      }
      
      resolve(messages);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Extract any valid JSON objects from the file
 * @param filePath Path to the conversation file
 * @returns Promise resolving to the recovered messages
 */
async function extractValidJsonObjects(filePath: string): Promise<Message[]> {
  return new Promise((resolve, reject) => {
    try {
      // Read the file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Use regex to find potential JSON objects
      const jsonRegex = /{[^{}]*(?:{[^{}]*}[^{}]*)*}/g;
      const potentialObjects = fileContent.match(jsonRegex) || [];
      
      // Try to parse each potential object
      const messages: Message[] = [];
      
      for (const obj of potentialObjects) {
        try {
          const parsed = JSON.parse(obj);
          
          // Validate that it looks like a message
          if (parsed && typeof parsed === 'object' && 'role' in parsed) {
            messages.push(parsed as Message);
          }
        } catch (error) {
          // Skip invalid objects
          continue;
        }
      }
      
      resolve(messages);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Extract the original task from the first human message
 * @param message First human message
 * @returns Original task description
 */
function extractOriginalTask(message: Message): string {
  let content = '';
  
  if (typeof message.content === 'string') {
    content = message.content;
  } else if (Array.isArray(message.content)) {
    content = message.content
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return part.text;
        return '';
      })
      .join(' ');
  } else if (message.content) {
    content = JSON.stringify(message.content);
  }
  
  // Limit to a reasonable length
  return content.substring(0, 500);
}

/**
 * Extract code snippets from messages
 * @param messages Array of messages
 * @returns Array of code snippets with language and context
 */
function extractCodeSnippets(messages: Message[]): Array<{ language: string; code: string; context: string; }> {
  const snippets: Array<{ language: string; code: string; context: string; }> = [];
  
  for (const message of messages) {
    let content = '';
    
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      content = message.content
        .map((part: any) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part) return part.text;
          return '';
        })
        .join(' ');
    } else if (message.content) {
      content = JSON.stringify(message.content);
    }
    
    // Extract code blocks
    const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      // Extract some context from before the code block
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = match.index;
      const context = content.substring(contextStart, contextEnd).trim();
      
      snippets.push({ language, code, context });
    }
  }
  
  return snippets;
}

/**
 * Extract code evolution from messages
 * @param messages Array of messages
 * @returns Array of code evolution objects
 */
function extractCodeEvolution(messages: Message[]): Array<{
  file: string;
  language: string;
  code: string;
  description: string;
  iterations: number;
}> {
  // Group code snippets by potential file/purpose
  const codeSnippets = extractCodeSnippets(messages);
  const codeGroups = new Map<string, Array<{language: string; code: string; context: string; timestamp?: number}>>();
  
  // Process each message to extract code snippets with timestamp context
  messages.forEach((message, messageIndex) => {
    let content = '';
    
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      content = message.content
        .map((part: any) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part) return part.text;
          return '';
        })
        .join(' ');
    } else if (message.content) {
      content = JSON.stringify(message.content);
    }
    
    // Extract code blocks with timestamp
    const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      // Extract some context from before the code block
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = match.index;
      const context = content.substring(contextStart, contextEnd).trim();
      
      // Try to identify the file or purpose
      let fileOrPurpose = 'unknown';
      
      // Look for file paths in the context
      const filePathRegex = /([a-zA-Z0-9_\-/.]+\.(js|ts|jsx|tsx|py|java|rb|php|html|css|json|md))/i;
      const filePathMatch = context.match(filePathRegex);
      
      if (filePathMatch) {
        fileOrPurpose = filePathMatch[1];
      } else {
        // Look for function or class names
        const functionMatch = context.match(/function\s+([a-zA-Z0-9_]+)/i);
        const classMatch = context.match(/class\s+([a-zA-Z0-9_]+)/i);
        
        if (functionMatch) {
          fileOrPurpose = `function:${functionMatch[1]}`;
        } else if (classMatch) {
          fileOrPurpose = `class:${classMatch[1]}`;
        } else {
          // Use a hash of the code for grouping similar code blocks
          fileOrPurpose = `snippet:${hashCode(code.substring(0, Math.min(100, code.length)))}`;
        }
      }
      
      // Add to the appropriate group
      if (!codeGroups.has(fileOrPurpose)) {
        codeGroups.set(fileOrPurpose, []);
      }
      
      codeGroups.get(fileOrPurpose)?.push({
        language,
        code,
        context,
        timestamp: messageIndex // Use message index as a proxy for timestamp
      });
    }
  });
  
  // Convert groups to evolution objects
  const evolutions: Array<{
    file: string;
    language: string;
    code: string;
    description: string;
    iterations: number;
  }> = [];
  
  codeGroups.forEach((snippets, fileOrPurpose) => {
    // Sort by timestamp
    snippets.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // Only include groups with multiple iterations
    if (snippets.length > 1) {
      const firstSnippet = snippets[0];
      const lastSnippet = snippets[snippets.length - 1];
      
      evolutions.push({
        file: fileOrPurpose,
        language: lastSnippet.language,
        code: lastSnippet.code,
        description: `This code evolved through ${snippets.length} iterations. ${generateEvolutionDescription(snippets)}`,
        iterations: snippets.length
      });
    } else if (snippets.length === 1) {
      // Include single snippets that appear to be important
      const snippet = snippets[0];
      
      if (snippet.code.length > 50 || fileOrPurpose.includes('/')) {
        evolutions.push({
          file: fileOrPurpose,
          language: snippet.language,
          code: snippet.code,
          description: snippet.context,
          iterations: 1
        });
      }
    }
  });
  
  return evolutions;
}

/**
 * Generate a description of code evolution
 * @param snippets Array of code snippets with timestamps
 * @returns Description of the evolution
 */
function generateEvolutionDescription(snippets: Array<{language: string; code: string; context: string; timestamp?: number}>): string {
  if (snippets.length <= 1) {
    return '';
  }
  
  const firstSnippet = snippets[0];
  const lastSnippet = snippets[snippets.length - 1];
  
  // Compare first and last to describe the evolution
  const firstLines = firstSnippet.code.split('\n').length;
  const lastLines = lastSnippet.code.split('\n').length;
  const lineDiff = lastLines - firstLines;
  
  let description = '';
  
  if (lineDiff > 0) {
    description += `The code grew by ${lineDiff} lines. `;
  } else if (lineDiff < 0) {
    description += `The code was refactored and reduced by ${-lineDiff} lines. `;
  }
  
  // Check for function/method additions
  const firstFunctions = (firstSnippet.code.match(/function\s+[a-zA-Z0-9_]+/g) || []).length;
  const lastFunctions = (lastSnippet.code.match(/function\s+[a-zA-Z0-9_]+/g) || []).length;
  const functionDiff = lastFunctions - firstFunctions;
  
  if (functionDiff > 0) {
    description += `${functionDiff} new function${functionDiff > 1 ? 's were' : ' was'} added. `;
  }
  
  // Check for class additions
  const firstClasses = (firstSnippet.code.match(/class\s+[a-zA-Z0-9_]+/g) || []).length;
  const lastClasses = (lastSnippet.code.match(/class\s+[a-zA-Z0-9_]+/g) || []).length;
  const classDiff = lastClasses - firstClasses;
  
  if (classDiff > 0) {
    description += `${classDiff} new class${classDiff > 1 ? 'es were' : ' was'} added. `;
  }
  
  return description;
}

/**
 * Simple hash function for strings
 * @param str String to hash
 * @returns Hash code
 */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Analyze topics to determine main topic and subtopics
 * @param topics Array of topics
 * @param messages Array of messages
 * @returns Object with mainTopic and subtopics
 */
function analyzeTopics(topics: string[], messages: Message[]): { mainTopic: string; subtopics: string[] } {
  if (topics.length === 0) {
    return { mainTopic: 'unknown', subtopics: [] };
  }
  
  // Create a map to track topic frequency and recency
  const topicScores = new Map<string, { frequency: number; recency: number }>();
  
  // Initialize topic scores
  topics.forEach(topic => {
    topicScores.set(topic, { frequency: 0, recency: 0 });
  });
  
  // Count topic occurrences and track recency
  messages.forEach((message, index) => {
    const content = getMessageContent(message);
    
    topics.forEach(topic => {
      // Count occurrences of the topic in the message
      const regex = new RegExp(`\\b${topic}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        const score = topicScores.get(topic);
        if (score) {
          // Increase frequency by the number of matches
          score.frequency += matches.length;
          
          // Update recency score (higher index = more recent)
          score.recency = Math.max(score.recency, index);
        }
      }
    });
  });
  
  // Calculate a combined score (frequency * recency weight)
  const combinedScores = new Map<string, number>();
  const messageCount = messages.length;
  
  topicScores.forEach((score, topic) => {
    // Normalize recency (0 to 1)
    const recencyNormalized = score.recency / Math.max(1, messageCount - 1);
    
    // Combined score: frequency + recency bonus
    const combinedScore = score.frequency + (score.frequency * recencyNormalized * 0.5);
    
    combinedScores.set(topic, combinedScore);
  });
  
  // Sort topics by combined score
  const sortedTopics = [...combinedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // The main topic is the one with the highest score
  const mainTopic = sortedTopics[0] || 'unknown';
  
  // Subtopics are the rest, excluding the main topic
  const subtopics = sortedTopics.slice(1);
  
  return { mainTopic, subtopics };
}

/**
 * Identify active files (most recently discussed/modified)
 * @param messages Array of messages
 * @param allFiles Array of all files
 * @returns Array of active files
 */
function identifyActiveFiles(messages: Message[], allFiles: string[]): string[] {
  if (allFiles.length === 0) {
    return [];
  }
  
  // Create a map to track file mentions and recency
  const fileScores = new Map<string, { mentions: number; recency: number }>();
  
  // Initialize file scores
  allFiles.forEach(file => {
    fileScores.set(file, { mentions: 0, recency: 0 });
  });
  
  // Count file mentions and track recency
  messages.forEach((message, index) => {
    const content = getMessageContent(message);
    
    allFiles.forEach(file => {
      // Check if the file is mentioned in the message
      if (content.includes(file)) {
        const score = fileScores.get(file);
        if (score) {
          // Increase mention count
          score.mentions += 1;
          
          // Update recency score (higher index = more recent)
          score.recency = Math.max(score.recency, index);
        }
      }
    });
  });
  
  // Calculate a combined score (mentions * recency weight)
  const combinedScores = new Map<string, number>();
  const messageCount = messages.length;
  
  fileScores.forEach((score, file) => {
    // Normalize recency (0 to 1)
    const recencyNormalized = score.recency / Math.max(1, messageCount - 1);
    
    // Combined score: mentions + recency bonus
    const combinedScore = score.mentions + (score.mentions * recencyNormalized * 2);
    
    combinedScores.set(file, combinedScore);
  });
  
  // Sort files by combined score
  const sortedFiles = [...combinedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Return the top files (most active)
  return sortedFiles.slice(0, 10);
}

/**
 * Extract open questions from the conversation
 * @param messages Array of messages
 * @returns Array of open questions
 */
function extractOpenQuestions(messages: Message[]): string[] {
  const openQuestions: string[] = [];
  
  // Look at the last 20 messages to find open questions
  const recentMessages = messages.slice(-20);
  
  for (let i = 0; i < recentMessages.length; i++) {
    const message = recentMessages[i];
    const content = getMessageContent(message);
    
    // Look for question marks in human messages
    if (message.role === 'human' && content.includes('?')) {
      // Extract questions
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        if (sentence.includes('?')) {
          // Check if this question was answered
          let answered = false;
          
          // Look for an answer in subsequent messages
          for (let j = i + 1; j < recentMessages.length; j++) {
            const responseMessage = recentMessages[j];
            
            if (responseMessage.role === 'assistant') {
              const responseContent = getMessageContent(responseMessage);
              
              // Simple heuristic: if the response contains keywords from the question,
              // consider it answered
              const questionWords = sentence
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 4); // Only consider significant words
              
              const matchCount = questionWords.filter(word => 
                responseContent.toLowerCase().includes(word)
              ).length;
              
              // If more than half of the significant words are in the response,
              // consider it answered
              if (matchCount > questionWords.length / 2) {
                answered = true;
                break;
              }
            }
          }
          
          // If the question wasn't answered, add it to open questions
          if (!answered) {
            const cleanQuestion = sentence.trim();
            openQuestions.push(cleanQuestion);
          }
        }
      }
    }
  }
  
  // Remove duplicates and limit to a reasonable number
  return [...new Set(openQuestions)].slice(0, 5);
}

/**
 * Extract recent messages from the conversation
 * @param messages Array of messages
 * @param count Number of messages to extract
 * @returns Array of recent messages
 */
function extractRecentMessages(messages: Message[], count: number): Array<{ role: string; content: string; timestamp?: number }> {
  // Get the last 'count' messages
  const recentMessages = messages.slice(-count);
  
  // Convert to the expected format
  return recentMessages.map((message, index) => ({
    role: message.role,
    content: getMessageContent(message),
    timestamp: index // Use index as a proxy for timestamp
  }));
}

/**
 * Determine the current status of the conversation
 * @param messages Array of messages
 * @returns Current status description
 */
function determineCurrentStatus(messages: Message[]): string {
  if (messages.length === 0) {
    return 'No conversation data available.';
  }
  
  // Get the last few messages
  const lastMessages = messages.slice(-5);
  
  // Analyze the last assistant message
  const lastAssistantMessage = [...lastMessages].reverse().find(m => m.role === 'assistant');
  const lastHumanMessage = [...lastMessages].reverse().find(m => m.role === 'human');
  
  let status = 'At the time of the crash, ';
  
  if (lastAssistantMessage && lastHumanMessage) {
    const assistantContent = getMessageContent(lastAssistantMessage);
    const humanContent = getMessageContent(lastHumanMessage);
    
    // Check if the assistant was responding to a question
    if (humanContent.includes('?')) {
      status += 'I was answering your question about ';
      
      // Extract the topic of the question
      const questionTopic = extractQuestionTopic(humanContent);
      status += questionTopic + '. ';
    } 
    // Check if the assistant was implementing code
    else if (assistantContent.includes('```')) {
      status += 'I was implementing code for you. ';
      
      // Try to determine what the code was for
      const codeSnippets = extractCodeSnippets([lastAssistantMessage]);
      if (codeSnippets.length > 0) {
        const context = codeSnippets[0].context;
        status += `Specifically, I was working on ${context}. `;
      }
    }
    // Check if the assistant was explaining something
    else if (assistantContent.includes('explain') || assistantContent.includes('means') || assistantContent.includes('works')) {
      status += 'I was explaining a concept or providing information. ';
    }
    // Default case
    else {
      status += 'we were discussing ';
      
      // Try to determine the topic of discussion
      const topics = extractTopics(lastMessages);
      if (topics.length > 0) {
        status += topics[0] + '. ';
      } else {
        status += 'various topics. ';
      }
    }
    
    // Add information about what was likely to happen next
    status += 'The next step was likely ';
    
    // Check for indicators of next steps
    if (assistantContent.includes('next') || assistantContent.includes('then')) {
      const nextStepMatch = assistantContent.match(/next,?\s+(we|you|I)\s+(should|could|will|would|can|need to)\s+([^.!?]+)/i);
      if (nextStepMatch) {
        status += 'to ' + nextStepMatch[3].trim() + '.';
      } else {
        status += 'to continue with the implementation or discussion.';
      }
    } else {
      status += 'to continue with the implementation or discussion.';
    }
  } else if (lastAssistantMessage) {
    // Only assistant message available
    status += 'I had just provided information or completed a task, and was waiting for your response.';
  } else if (lastHumanMessage) {
    // Only human message available
    status += 'you had just asked a question or provided information, and I was about to respond.';
  } else {
    // Fallback
    status += 'the conversation was ongoing.';
  }
  
  return status;
}

/**
 * Extract the topic of a question
 * @param question Question text
 * @returns Topic of the question
 */
function extractQuestionTopic(question: string): string {
  // Remove question marks and common question words
  const cleanedQuestion = question
    .replace(/\?/g, '')
    .replace(/^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did|have|has|had)\s+/i, '')
    .trim();
  
  // If the question is short, return it as is
  if (cleanedQuestion.length < 50) {
    return cleanedQuestion;
  }
  
  // Otherwise, extract the first part of the question
  return cleanedQuestion.substring(0, 50) + '...';
}

/**
 * Generate a timeline of the conversation
 * @param messages Array of messages
 * @returns Timeline string
 */
function generateTimeline(messages: Message[]): string {
  if (messages.length === 0) {
    return 'No messages recovered.';
  }
  
  // Divide the conversation into segments
  const segmentSize = Math.max(1, Math.ceil(messages.length / 5)); // Aim for about 5 segments
  const segments: Array<{
    startIndex: number;
    endIndex: number;
    messages: Message[];
    summary: string;
  }> = [];
  
  // Create segments
  for (let i = 0; i < messages.length; i += segmentSize) {
    const segmentMessages = messages.slice(i, Math.min(i + segmentSize, messages.length));
    segments.push({
      startIndex: i,
      endIndex: Math.min(i + segmentSize - 1, messages.length - 1),
      messages: segmentMessages,
      summary: ''
    });
  }
  
  // Generate summaries for each segment
  segments.forEach(segment => {
    const humanMessages = segment.messages.filter(m => m.role === 'human').length;
    const assistantMessages = segment.messages.filter(m => m.role === 'assistant').length;
    
    // Extract key actions and topics
    const analysis = analyzeMessages(segment.messages);
    const topics = analysis.topics.slice(0, 3).map(t => t.topic);
    const actions = analysis.key_actions.slice(0, 2);
    
    // Count code blocks
    let codeBlocks = 0;
    segment.messages.forEach(message => {
      let content = '';
      
      if (typeof message.content === 'string') {
        content = message.content;
      } else if (Array.isArray(message.content)) {
        content = message.content
          .map((part: any) => {
            if (typeof part === 'string') return part;
            if (part && typeof part === 'object' && 'text' in part) return part.text;
            return '';
          })
          .join(' ');
      }
      
      const matches = content.match(/```[a-zA-Z]*\n[\s\S]*?```/g);
      if (matches) {
        codeBlocks += matches.length;
      }
    });
    
    // Build the summary
    let summary = `Messages ${segment.startIndex + 1}-${segment.endIndex + 1}: `;
    
    if (topics.length > 0) {
      summary += `Discussed ${topics.join(', ')}. `;
    }
    
    if (actions.length > 0) {
      summary += `${actions.join('. ')}. `;
    }
    
    if (codeBlocks > 0) {
      summary += `Shared ${codeBlocks} code block${codeBlocks > 1 ? 's' : ''}. `;
    }
    
    segment.summary = summary;
  });
  
  // Combine segment summaries into a timeline
  let timeline = '';
  segments.forEach((segment, index) => {
    timeline += `${index + 1}. ${segment.summary}\n`;
  });
  
  return timeline;
}

/**
 * Identify key decision points in the conversation
 * @param messages Array of messages
 * @returns Array of decision point descriptions
 */
function identifyDecisionPoints(messages: Message[]): string[] {
  const decisionPoints: string[] = [];
  
  // Look for messages that indicate decisions
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    let content = '';
    
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      content = message.content
        .map((part: any) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part) return part.text;
          return '';
        })
        .join(' ');
    } else if (message.content) {
      content = JSON.stringify(message.content);
    }
    
    // Look for decision indicators in human messages
    if (message.role === 'human') {
      // Check for questions or requests for options
      if (
        content.includes('?') && 
        (content.includes('should I') || 
         content.includes('could we') || 
         content.includes('what if') || 
         content.includes('options') || 
         content.includes('alternatives') ||
         content.includes('approach'))
      ) {
        // Find the corresponding assistant response
        if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
          const responseContent = getMessageContent(messages[i + 1]);
          const question = content.split('?')[0] + '?';
          decisionPoints.push(`Question: "${question.substring(0, 100)}..." - Decision made based on assistant's guidance.`);
        }
      }
      
      // Check for explicit decisions
      if (
        content.includes('I decided') || 
        content.includes('we decided') || 
        content.includes('let\'s go with') || 
        content.includes('I\'ll choose') ||
        content.includes('I prefer')
      ) {
        // Extract the decision
        const decisionMatch = content.match(/(I|we) decided to ([^.]+)/i) || 
                             content.match(/let\'s go with ([^.]+)/i) ||
                             content.match(/(I|we)\'ll choose ([^.]+)/i) ||
                             content.match(/(I|we) prefer ([^.]+)/i);
        
        if (decisionMatch) {
          decisionPoints.push(`Decision: ${decisionMatch[0]}`);
        }
      }
    }
    
    // Look for decision indicators in assistant messages
    if (message.role === 'assistant') {
      // Check for option presentations
      if (
        content.includes('options') && 
        (content.includes('Option 1') || content.includes('1.') || content.includes('First'))
      ) {
        decisionPoints.push(`Assistant presented multiple options or approaches.`);
      }
      
      // Check for recommendations
      if (
        content.includes('recommend') || 
        content.includes('suggest') || 
        content.includes('best approach') || 
        content.includes('better option')
      ) {
        const recommendationMatch = content.match(/I (recommend|suggest) ([^.]+)/i) ||
                                   content.match(/The (best|better) (approach|option) is ([^.]+)/i);
        
        if (recommendationMatch) {
          decisionPoints.push(`Recommendation: ${recommendationMatch[0]}`);
        }
      }
    }
  }
  
  // Remove duplicates and limit to a reasonable number
  return [...new Set(decisionPoints)].slice(0, 10);
}

/**
 * Helper function to extract content from a message
 * @param message Message object
 * @returns Content as string
 */
function getMessageContent(message: Message): string {
  if (typeof message.content === 'string') {
    return message.content;
  } else if (Array.isArray(message.content)) {
    return message.content
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return part.text;
        return '';
      })
      .join(' ');
  } else if (message.content) {
    return JSON.stringify(message.content);
  }
  return '';
}

/**
 * Generate a summary of the conversation
 * @param messages Array of messages
 * @param maxLength Maximum length of the summary
 * @returns Summary text
 */
function generateSummary(messages: Message[], maxLength: number): string {
  // Analyze the conversation
  const analysis = analyzeMessages(messages);
  
  // Build a summary
  let summary = '';
  
  // Add message count info
  summary += `This conversation had ${messages.length} messages (${analysis.human_messages} from human, ${analysis.assistant_messages} from assistant). `;
  
  // Add topic info
  if (analysis.topics.length > 0) {
    summary += `The main topics discussed were: ${analysis.topics.slice(0, 5).map(t => t.topic).join(', ')}. `;
  }
  
  // Add file operations info
  if (analysis.file_operations > 0) {
    summary += `There were ${analysis.file_operations} file operations. `;
  }
  
  // Add commands info
  if (analysis.commands_executed > 0) {
    summary += `${analysis.commands_executed} commands were executed. `;
  }
  
  // Add code blocks info
  if (analysis.code_blocks > 0) {
    summary += `The conversation included ${analysis.code_blocks} code blocks. `;
  }
  
  // Add key actions
  if (analysis.key_actions.length > 0) {
    summary += `Key actions: ${analysis.key_actions.join('; ')}. `;
  }
  
  // Truncate if needed
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }
  
  return summary;
}

/**
 * Extract the latest state from the last few messages
 * @param messages Array of messages
 * @param messageCount Number of messages to consider
 * @returns Description of the latest state
 */
function extractLatestState(messages: Message[], messageCount: number = 5): string {
  // Get the last few messages
  const lastMessages = messages.slice(-messageCount);
  
  // If there are no messages, return empty string
  if (lastMessages.length === 0) {
    return '';
  }
  
  let latestState = `Last ${lastMessages.length} messages summary:\n\n`;
  
  // Process each message to create a conversation flow
  lastMessages.forEach((message, index) => {
    const role = message.role === 'assistant' ? 'Assistant' : 'User';
    let content = '';
    
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      content = message.content
        .map((part: any) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part) return part.text;
          return '';
        })
        .join(' ');
    } else if (message.content) {
      content = JSON.stringify(message.content);
    }
    
    // Truncate long messages
    if (content.length > 500) {
      content = content.substring(0, 500) + '...';
    }
    
    latestState += `${role}: ${content}\n\n`;
  });
  
  // Add a note about the conversation state
  latestState += 'The conversation was in this state when it crashed.';
  
  return latestState;
}

/**
 * Format the recovered context as a message
 * @param recoveredContext Recovery result
 * @returns Formatted message
 */
export function formatRecoveredContext(recoveredContext: RecoveryResult): string {
  let message = `📋 CONVERSATION RECOVERY\n\n`;
  
  // Introduction with main topic and subtopics
  message += `This is a recovered conversation primarily about ${recoveredContext.main_topic}.\n\n`;
  
  // Discussion topics section
  message += `📊 DISCUSSION TOPICS\n`;
  message += `Main focus: ${recoveredContext.main_topic}\n`;
  if (recoveredContext.subtopics.length > 0) {
    message += `Related topics:\n`;
    recoveredContext.subtopics.slice(0, 10).forEach(topic => {
      message += `- ${topic}\n`;
    });
  }
  message += `\nThe original conversation crashed, but I've analyzed its content to help us continue where you left off.\n\n`;
  
  // Project context section
  message += `🎯 PROJECT CONTEXT\n`;
  message += `You were working on ${recoveredContext.original_task ? recoveredContext.original_task : 'a project related to ' + recoveredContext.main_topic}.\n`;
  message += `${recoveredContext.summary}\n\n`;
  
  // Recent conversation flow
  if (recoveredContext.recent_messages.length > 0) {
    message += `💬 RECENT CONVERSATION\n\n`;
    recoveredContext.recent_messages.forEach(msg => {
      const role = msg.role === 'assistant' ? 'Claude' : 'You';
      // Truncate very long messages
      let content = msg.content;
      if (content.length > 300) {
        content = content.substring(0, 300) + '...';
      }
      message += `${role}: ${content}\n\n`;
    });
  }
  
  // Current status
  message += `📍 CURRENT STATUS\n`;
  message += `${recoveredContext.current_status}\n\n`;
  
  // Active code and files
  if (recoveredContext.active_files.length > 0 || recoveredContext.code_evolution.length > 0) {
    message += `💻 ACTIVE CODE & FILES\n\n`;
    
    if (recoveredContext.active_files.length > 0) {
      message += `You were working with these key files:\n`;
      recoveredContext.active_files.slice(0, 5).forEach(file => {
        message += `- ${file}\n`;
      });
      message += `\n`;
    }
    
    // Include most recent code evolution
    if (recoveredContext.code_evolution.length > 0) {
      message += `Most recent code changes:\n`;
      const latestEvolution = recoveredContext.code_evolution[0];
      message += `\`\`\`${latestEvolution.language}\n${latestEvolution.code}\n\`\`\`\n\n`;
    }
  }
  
  // Open questions/issues
  if (recoveredContext.open_questions.length > 0) {
    message += `❓ OPEN QUESTIONS\n`;
    recoveredContext.open_questions.forEach(question => {
      message += `- ${question}\n`;
    });
    message += `\n`;
  }
  
  // Decision points if available
  if (recoveredContext.decision_points.length > 0) {
    message += `🔄 KEY DECISIONS\n`;
    recoveredContext.decision_points.slice(0, 3).forEach(decision => {
      message += `- ${decision}\n`;
    });
    message += `\n`;
  }
  
  // Memory bank reference section
  message += `🧠 MEMORY BANK REFERENCE\n`;
  message += `This conversation may have memory bank files that contain additional context.\n`;
  message += `Check the following locations for relevant information:\n`;
  message += `- /memory-bank/progress.md - For progress tracking\n`;
  message += `- /memory-bank/techContext.md - For technical context\n`;
  message += `- /memory-bank/productContext.md - For product context\n\n`;
  
  // Continuation prompt
  message += `🔄 CONTINUATION\n`;
  message += `Would you like to continue working on ${recoveredContext.main_topic} or focus on a specific aspect of the project?`;
  
  return message;
}

/**
 * Create a crash report object for saving to the crash reports directory
 * @param taskId Task ID of the crashed conversation
 * @param recoveredContext Recovery result
 * @param formattedMessage Formatted message for display
 * @returns Crash report object
 */
export function createCrashReport(
  taskId: string,
  recoveredContext: RecoveryResult,
  formattedMessage: string
): any {
  return {
    id: `crash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    task_id: taskId,
    timestamp: Date.now(),
    summary: recoveredContext.summary,
    main_topic: recoveredContext.main_topic,
    subtopics: recoveredContext.subtopics.slice(0, 5),
    active_files: recoveredContext.active_files.slice(0, 5),
    open_questions: recoveredContext.open_questions,
    current_status: recoveredContext.current_status,
    formatted_message: formattedMessage,
    read: false
  };
}
