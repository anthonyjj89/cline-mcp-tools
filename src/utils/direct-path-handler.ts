/**
 * Direct Path Handler
 * 
 * Simplified file access using pre-resolved paths from active_tasks.json
 */

import fs from 'fs-extra';
import { logDebug, logError } from './diagnostic-logger.js';

export async function readConversationFile(conversationPath: string): Promise<any> {
    try {
        logDebug('Reading conversation file directly', { path: conversationPath });
        const content = await fs.readFile(conversationPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        logError('Failed to read conversation file', { 
            path: conversationPath,
            error: (error as Error).message
        });
        throw error;
    }
}

export function verifyPathExists(conversationPath: string): boolean {
    const exists = fs.existsSync(conversationPath);
    logDebug('Path verification', { path: conversationPath, exists });
    return exists;
}
