/**
 * Direct Path Handler
 *
 * Simplified file access using pre-resolved paths from active_tasks.json
 */
import fs from 'fs-extra';
import { logDebug, logError } from './diagnostic-logger.js';
export async function readConversationFile(conversationPath) {
    try {
        logDebug('Reading conversation file directly', { path: conversationPath });
        const content = await fs.readFile(conversationPath, 'utf8');
        return JSON.parse(content);
    }
    catch (error) {
        logError('Failed to read conversation file', {
            path: conversationPath,
            error: error.message
        });
        throw error;
    }
}
export function verifyPathExists(conversationPath) {
    const exists = fs.existsSync(conversationPath);
    logDebug('Path verification', { path: conversationPath, exists });
    return exists;
}
