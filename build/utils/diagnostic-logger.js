/**
 * Diagnostic Logger for MCP Server
 *
 * This module provides diagnostic logging capabilities for the MCP server.
 * It logs messages to both the console and a file in the user's home directory.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
// Create a diagnostic log file in the user's home directory
const logFile = path.join(os.homedir(), 'mcp-diagnostic.log');
// Log levels
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARNING"] = 1] = "WARNING";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
// Current log level - change this to control verbosity
let CURRENT_LOG_LEVEL = LogLevel.INFO;
// Flag to control console output
let CONSOLE_LOGGING_ENABLED = true;
/**
 * Set the current log level
 * @param level New log level
 */
export function setLogLevel(level) {
    CURRENT_LOG_LEVEL = level;
    diagnosticLog(`Log level set to ${LogLevel[level]} (${level})`, null, LogLevel.INFO);
}
/**
 * Get the current log level
 * @returns Current log level
 */
export function getLogLevel() {
    return CURRENT_LOG_LEVEL;
}
/**
 * Initialize the diagnostic logger
 * @param logLevel Initial log level
 */
export function initDiagnosticLogger(logLevel = LogLevel.INFO) {
    try {
        // Clear previous log
        fs.writeFileSync(logFile, `--- MCP Diagnostic Log Started at ${new Date().toISOString()} ---\n`);
        // Set log level
        setLogLevel(logLevel);
        // Log system information
        diagnosticLog('MCP Server starting', null, LogLevel.INFO);
        diagnosticLog('Platform', process.platform, LogLevel.INFO);
        diagnosticLog('Node version', process.version, LogLevel.INFO);
        diagnosticLog('Working directory', process.cwd(), LogLevel.INFO);
        diagnosticLog('HOME environment variable', process.env.HOME, LogLevel.INFO);
        diagnosticLog('USER environment variable', process.env.USER, LogLevel.INFO);
        diagnosticLog('PATH environment variable', process.env.PATH, LogLevel.INFO);
        // Log all environment variables at debug level
        diagnosticLog('All environment variables', process.env, LogLevel.DEBUG);
        diagnosticLog('Diagnostic logger initialized', null, LogLevel.INFO);
    }
    catch (error) {
        console.error(`Failed to initialize diagnostic logger: ${error.message}`);
    }
}
/**
 * Disable console logging (e.g., when running as MCP server)
 */
export function disableConsoleLogging() {
    CONSOLE_LOGGING_ENABLED = false;
    // Log this change only to the file
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [INFO] Console logging disabled.\n`;
    try {
        fs.appendFileSync(logFile, logMessage);
    }
    catch (e) {
        // Fallback to console if file logging fails initially
        console.error(`Failed to write disableConsoleLogging message to log file: ${e.message}`);
    }
}
/**
 * Log a diagnostic message
 * @param message Message to log
 * @param data Optional data to include in the log
 * @param level Log level (default: DEBUG)
 */
export function diagnosticLog(message, data = null, level = LogLevel.DEBUG) {
    // Skip if log level is higher than current level
    if (level > CURRENT_LOG_LEVEL) {
        return;
    }
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    let logMessage = `[${timestamp}] [${levelName}] ${message}`;
    if (data !== null) {
        try {
            if (typeof data === 'object') {
                // Handle Error objects specially
                if (data instanceof Error) {
                    logMessage += `: ${data.name}: ${data.message}`;
                    if (data.stack) {
                        logMessage += `\n${data.stack}`;
                    }
                }
                else {
                    // For other objects, stringify with truncation for large objects
                    const json = JSON.stringify(data, null, 2);
                    if (json.length > 1000 && level !== LogLevel.DEBUG) {
                        logMessage += `: ${json.substring(0, 1000)}... [truncated, full data in log file]`;
                    }
                    else {
                        logMessage += `: ${json}`;
                    }
                }
            }
            else {
                logMessage += `: ${data}`;
            }
        }
        catch (e) {
            logMessage += `: [Error stringifying data: ${e.message}]`;
        }
    }
    // Log to console only if enabled
    if (CONSOLE_LOGGING_ENABLED) {
        switch (level) {
            case LogLevel.ERROR:
                console.error(`\x1b[31m${logMessage}\x1b[0m`); // Red
                break;
            case LogLevel.WARNING:
                console.warn(`\x1b[33m${logMessage}\x1b[0m`); // Yellow
                break;
            case LogLevel.INFO:
                console.info(`\x1b[36m${logMessage}\x1b[0m`); // Cyan
                break;
            case LogLevel.DEBUG:
                console.debug(`\x1b[90m${logMessage}\x1b[0m`); // Gray
                break;
        }
    }
    // Log to file (always log full data to file)
    try {
        if (data !== null && typeof data === 'object' && !(data instanceof Error)) {
            // For objects, always log the full data to the file
            const fullLogMessage = `[${timestamp}] [${levelName}] ${message}: ${JSON.stringify(data, null, 2)}\n`;
            fs.appendFileSync(logFile, fullLogMessage);
        }
        else {
            fs.appendFileSync(logFile, logMessage + '\n');
        }
    }
    catch (e) {
        console.error(`\x1b[31mFailed to write to diagnostic log: ${e.message}\x1b[0m`);
    }
}
/**
 * Log an error message
 * @param message Error message
 * @param error Optional error object
 */
export function logError(message, error = null) {
    diagnosticLog(message, error, LogLevel.ERROR);
}
/**
 * Log a warning message
 * @param message Warning message
 * @param data Optional data
 */
export function logWarning(message, data = null) {
    diagnosticLog(message, data, LogLevel.WARNING);
}
/**
 * Log an info message
 * @param message Info message
 * @param data Optional data
 */
export function logInfo(message, data = null) {
    diagnosticLog(message, data, LogLevel.INFO);
}
/**
 * Log a debug message
 * @param message Debug message
 * @param data Optional data
 */
export function logDebug(message, data = null) {
    diagnosticLog(message, data, LogLevel.DEBUG);
}
// Export default functions for backward compatibility
export default {
    initDiagnosticLogger,
    setLogLevel,
    getLogLevel,
    disableConsoleLogging, // Export the new function
    diagnosticLog,
    logError,
    logWarning,
    logInfo,
    logDebug,
    LogLevel
};
