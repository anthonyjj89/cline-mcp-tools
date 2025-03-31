/**
 * Configuration settings for the Cline Chat Reader MCP
 * Consolidated version with simplified tools and platform-specific paths
 */
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
const homedir = os.homedir();
// Get platform-specific paths with fully resolved absolute paths
function getPlatformPaths() {
    // Log current working directory and home directory for debugging
    console.error(`Current working directory: ${process.cwd()}`);
    console.error(`Home directory: ${homedir}`);
    // Get the base path with fully resolved absolute paths
    const basePath = (() => {
        switch (process.platform) {
            case 'win32':
                const winPath = path.resolve(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
                console.error(`Windows absolute path: ${winPath}`);
                return winPath;
            case 'darwin':
                const macPath = path.resolve(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
                console.error(`macOS absolute path: ${macPath}`);
                return macPath;
            case 'linux':
                const linuxPath = path.resolve(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
                console.error(`Linux absolute path: ${linuxPath}`);
                return linuxPath;
            default:
                console.warn(`Unsupported platform: ${process.platform}, using fallback paths`);
                const fallbackPath = path.resolve(homedir, '.vscode', 'saoudrizwan.claude-dev');
                console.error(`Fallback absolute path: ${fallbackPath}`);
                return fallbackPath;
        }
    })();
    // Create fully resolved absolute paths
    const activeTasksFile = path.resolve(basePath, 'active_tasks.json');
    const standardTasksDir = path.resolve(basePath, 'tasks');
    const crashReportsDir = path.resolve(basePath, 'crashReports');
    // Log the paths for debugging
    console.error(`Active tasks file path: ${activeTasksFile}`);
    console.error(`Standard tasks directory: ${standardTasksDir}`);
    console.error(`Crash reports directory: ${crashReportsDir}`);
    // Check if the paths exist
    console.error(`Active tasks file exists: ${fs.existsSync(activeTasksFile)}`);
    console.error(`Standard tasks directory exists: ${fs.existsSync(standardTasksDir)}`);
    console.error(`Crash reports directory exists: ${fs.existsSync(crashReportsDir)}`);
    return {
        activeTasksFile,
        standardTasksDir,
        crashReportsDir
    };
}
// Define fallback paths for active tasks file
export function getActiveTasksFallbackPaths() {
    const paths = [];
    // Primary path from platform-specific configuration
    paths.push(config.paths.activeTasksFile);
    // Fallback 1: Use OS home directory with explicit path
    const fallbackPath1 = path.resolve(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'active_tasks.json');
    paths.push(fallbackPath1);
    // Fallback 2: Check relative to current working directory
    const fallbackPath2 = path.resolve(process.cwd(), 'active_tasks.json');
    paths.push(fallbackPath2);
    // Fallback 3: Common locations
    paths.push(path.resolve('/Users/ant/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/active_tasks.json'));
    paths.push(path.resolve('/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/active_tasks.json'));
    // Log all fallback paths
    console.error('Active tasks fallback paths:');
    paths.forEach((p, i) => console.error(`  ${i}: ${p}`));
    return paths;
}
export const config = {
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
