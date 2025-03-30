"use strict";
/**
 * Configuration settings for the Cline Chat Reader MCP
 * Consolidated version with simplified tools and platform-specific paths
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var path = require("path");
var os = require("os");
var homedir = os.homedir();
// Get platform-specific paths
function getPlatformPaths() {
    var basePath = (function () {
        switch (process.platform) {
            case 'win32':
                return path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
            case 'darwin':
                return path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
            case 'linux':
                return path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
            default:
                console.warn("Unsupported platform: ".concat(process.platform, ", using fallback paths"));
                return path.join(homedir, '.vscode', 'saoudrizwan.claude-dev');
        }
    })();
    return {
        activeTasksFile: path.join(basePath, 'active_tasks.json'),
        standardTasksDir: path.join(basePath, 'tasks'),
        crashReportsDir: path.join(basePath, 'crashReports')
    };
}
exports.config = {
    version: '2.0.0',
    // Paths configuration
    paths: getPlatformPaths(),
    // Message reading configuration
    messages: {
        // Default number of messages to retrieve for read_last_messages
        defaultLimit: 20,
        // Extended number of messages to retrieve for read_last_40_messages
        extendedLimit: 40,
        // Threshold for small files (1MB)
        smallFileThreshold: 1024 * 1024
    },
    // Cache configuration
    cache: {
        // Cache expiration time in milliseconds (30 seconds)
        expirationTime: 30 * 1000
    },
    // Error handling configuration
    errorHandling: {
        // Maximum number of retries for file operations
        maxRetries: 3,
        // Base delay for retry backoff in milliseconds
        baseRetryDelay: 100,
        // Timeout for operations in milliseconds (5 seconds)
        timeout: 5000
    },
    // Tool configuration
    tools: {
        // Tool names
        readLastMessages: 'read_last_messages',
        readLast40Messages: 'read_last_40_messages',
        getActiveTask: 'get_active_task',
        sendExternalAdvice: 'send_external_advice'
    }
};
