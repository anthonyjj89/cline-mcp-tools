/**
 * Conversation analyzer for the Claude Task Reader MCP Server
 * Provides utilities for extracting key information from large conversation histories
 */
import fs from 'fs';
import { chain } from 'stream-chain';
import * as Parser from 'stream-json/Parser.js';
import * as StreamArray from 'stream-json/streamers/StreamArray.js';
// Common English stop words to filter out
const stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could',
    'may', 'might', 'must', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up',
    'down', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'what', 'which',
    'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'now', 'also', 'here', 'there', 'then', 'always', 'often', 'once', 'never', 'ever'
];
/**
 * Analyze a conversation history file using streaming to minimize memory usage
 * @param filePath Path to the conversation history JSON file
 * @param since Optional timestamp to filter messages (only include messages after this time)
 * @returns Promise resolving to the conversation analysis
 */
export async function analyzeConversationStream(filePath, since = 0) {
    return new Promise((resolve, reject) => {
        // Initialize analysis object
        const analysis = {
            message_count: 0,
            human_messages: 0,
            assistant_messages: 0,
            topics: [],
            code_blocks: 0,
            file_operations: 0,
            commands_executed: 0,
            files_referenced: [],
            key_actions: []
        };
        // Topic tracking
        const topicFrequency = {};
        const fileReferences = new Set();
        // Track time range
        let firstMessageTime = null;
        let lastMessageTime = null;
        // Create streaming pipeline
        const pipeline = chain([
            fs.createReadStream(filePath),
            new Parser.Parser({ jsonStreaming: true }),
            new StreamArray.StreamArray(),
            (data) => {
                const message = data.value;
                // Skip messages before the time window
                if (since > 0 && message.timestamp && message.timestamp < since) {
                    return null;
                }
                // Track time range
                if (message.timestamp) {
                    if (firstMessageTime === null || message.timestamp < firstMessageTime) {
                        firstMessageTime = message.timestamp;
                    }
                    if (lastMessageTime === null || message.timestamp > lastMessageTime) {
                        lastMessageTime = message.timestamp;
                    }
                }
                // Basic message counting
                analysis.message_count++;
                if (message.role === 'human')
                    analysis.human_messages++;
                if (message.role === 'assistant')
                    analysis.assistant_messages++;
                // Extract content as string
                let content = '';
                if (typeof message.content === 'string') {
                    content = message.content;
                }
                else if (Array.isArray(message.content)) {
                    // Handle array of content parts (common in newer Claude API responses)
                    content = message.content
                        .map((part) => {
                        if (typeof part === 'string')
                            return part;
                        if (part && typeof part === 'object' && 'text' in part)
                            return part.text;
                        return JSON.stringify(part);
                    })
                        .join(' ');
                }
                else if (message.content) {
                    content = JSON.stringify(message.content);
                }
                // Analyze content for key information
                if (content) {
                    // Count code blocks
                    const codeBlockMatches = content.match(/```[\s\S]*?```/g);
                    if (codeBlockMatches)
                        analysis.code_blocks += codeBlockMatches.length;
                    // Detect file operations
                    if (content.includes('write_to_file') ||
                        content.includes('replace_in_file') ||
                        content.includes('<write_to_file>') ||
                        content.includes('<replace_in_file>')) {
                        analysis.file_operations++;
                    }
                    // Detect command executions
                    if (content.includes('execute_command') ||
                        content.includes('<execute_command>')) {
                        analysis.commands_executed++;
                    }
                    // Extract file references
                    const fileMatches = content.match(/[a-zA-Z0-9_\-\.\/]+\.(js|ts|py|html|css|json|md)/g);
                    if (fileMatches) {
                        fileMatches.forEach(file => fileReferences.add(file));
                    }
                    // Extract potential topics using simple keyword extraction
                    extractKeywords(content).forEach(keyword => {
                        topicFrequency[keyword] = (topicFrequency[keyword] || 0) + 1;
                    });
                    // Detect key actions
                    if (message.role === 'assistant' &&
                        (content.includes('I\'ve created') ||
                            content.includes('I\'ve updated') ||
                            content.includes('I\'ve fixed') ||
                            content.includes('I created') ||
                            content.includes('I updated') ||
                            content.includes('I fixed') ||
                            content.includes('I implemented') ||
                            content.includes('I added'))) {
                        // Extract a brief snippet of what was done
                        const actionSnippet = extractActionSnippet(content);
                        if (actionSnippet)
                            analysis.key_actions.push(actionSnippet);
                    }
                }
                return null; // We don't need to pass data downstream
            }
        ]);
        // Handle end of stream
        pipeline.on('end', () => {
            // Process topic frequency to get top topics
            analysis.topics = Object.entries(topicFrequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([topic, count]) => ({ topic, count }));
            // Add file references
            analysis.files_referenced = Array.from(fileReferences);
            // Add time range if available
            if (firstMessageTime !== null && lastMessageTime !== null) {
                analysis.time_range = {
                    start: new Date(firstMessageTime).toISOString(),
                    end: new Date(lastMessageTime).toISOString()
                };
            }
            resolve(analysis);
        });
        pipeline.on('error', (err) => {
            reject(new Error(`Error analyzing conversation: ${err.message}`));
        });
    });
}
/**
 * Extract keywords from text
 * @param text Text to extract keywords from
 * @returns Array of keywords
 */
function extractKeywords(text) {
    // Simple keyword extraction - in production, use a proper NLP library
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word));
    // Count word frequency
    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    // Return top keywords
    return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word]) => word);
}
/**
 * Extract action snippets from content
 * @param content Content to extract action snippets from
 * @returns Action snippet or null if none found
 */
function extractActionSnippet(content) {
    // Look for sentences that describe actions
    const actionPatterns = [
        /I've (created|updated|fixed|implemented|added) [^.!?]*/i,
        /I (created|updated|fixed|implemented|added) [^.!?]*/i,
        /(Created|Updated|Fixed|Implemented|Added) [^.!?]*/i
    ];
    for (const pattern of actionPatterns) {
        const match = content.match(pattern);
        if (match && match[0]) {
            return match[0].trim();
        }
    }
    return null;
}
/**
 * Extract topics from a conversation
 * @param messages Array of conversation messages
 * @returns Array of topics
 */
export function extractTopics(messages) {
    // Combine all message content
    const allContent = messages
        .map(msg => {
        if (typeof msg.content === 'string')
            return msg.content;
        return JSON.stringify(msg.content);
    })
        .join(' ');
    // Extract keywords
    return extractKeywords(allContent);
}
/**
 * Extract entities from a conversation
 * @param messages Array of conversation messages
 * @returns Object with different entity types
 */
export function extractEntities(messages) {
    const files = new Set();
    const urls = new Set();
    const emails = new Set();
    // Process each message
    messages.forEach(msg => {
        let content = '';
        if (typeof msg.content === 'string') {
            content = msg.content;
        }
        else if (msg.content) {
            content = JSON.stringify(msg.content);
        }
        // Extract files
        const fileMatches = content.match(/[a-zA-Z0-9_\-\.\/]+\.(js|ts|py|html|css|json|md)/g);
        if (fileMatches) {
            fileMatches.forEach(file => files.add(file));
        }
        // Extract URLs
        const urlMatches = content.match(/https?:\/\/[^\s]+/g);
        if (urlMatches) {
            urlMatches.forEach(url => urls.add(url));
        }
        // Extract emails
        const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatches) {
            emailMatches.forEach(email => emails.add(email));
        }
    });
    return {
        files: Array.from(files),
        urls: Array.from(urls),
        emails: Array.from(emails)
    };
}
