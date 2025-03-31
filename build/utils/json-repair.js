/**
 * JSON Repair Utility
 *
 * This module provides functions to repair malformed JSON, particularly
 * focusing on adding missing commas between properties and array items.
 */
import { logWarning, logDebug, logInfo, logError } from './diagnostic-logger.js';
/**
 * Repair malformed JSON by adding missing commas and fixing structure
 * @param jsonString Potentially malformed JSON string
 * @returns Repaired JSON string, or original string if repair fails
 */
export function repairJson(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
        logWarning('Invalid input to repairJson: not a non-empty string', jsonString);
        return jsonString;
    }
    logDebug('Attempting to repair JSON string', { length: jsonString.length });
    try {
        // First try to parse as-is
        JSON.parse(jsonString);
        logDebug('JSON parsed successfully without repair');
        return jsonString; // If it parses successfully, return as-is
    }
    catch (initialError) {
        logDebug('Initial JSON parsing failed, attempting repair', { error: initialError.message });
        let repaired = jsonString.trim();
        // 1. Ensure it starts with { and ends with }
        if (!repaired.startsWith('{')) {
            // Check if it starts with the "activeTasks": [...] part
            if (repaired.startsWith('"activeTasks"')) {
                repaired = '{' + repaired;
                logDebug('Added missing opening brace');
            }
            else {
                logWarning('JSON does not start with { or "activeTasks", cannot reliably repair');
                return jsonString; // Cannot reliably repair
            }
        }
        if (!repaired.endsWith('}')) {
            if (repaired.endsWith(']')) {
                repaired = repaired + '}';
                logDebug('Added missing closing brace');
            }
            else {
                logWarning('JSON does not end with } or ], cannot reliably repair');
                return jsonString; // Cannot reliably repair
            }
        }
        // 2. Add missing commas between properties (key-value pairs)
        // Looks for `"key": value` followed by `"key": value` on the next line without a comma
        const propertyPattern = /(":\s*(?:"[^"]*"|\d+|true|false|null))\s*\n\s*(")/g;
        repaired = repaired.replace(propertyPattern, '$1,\n    $2');
        logDebug('Attempted to add missing commas between properties');
        // 3. Add missing commas between array elements (objects in this case)
        // Looks for `}` followed by `{` on the next line without a comma
        const arrayItemPattern = /(})\s*\n\s*({)/g;
        repaired = repaired.replace(arrayItemPattern, '$1,\n  $2');
        logDebug('Attempted to add missing commas between array elements');
        // 4. Final check: Try parsing the repaired string
        try {
            JSON.parse(repaired);
            logInfo('JSON successfully repaired and parsed');
            return repaired;
        }
        catch (repairError) {
            logWarning('Failed to parse JSON even after repair attempts', { error: repairError.message });
            // Return the original string if repair fails
            return jsonString;
        }
    }
}
/**
 * Try to parse JSON with fallback to repair
 * @param jsonString JSON string to parse
 * @returns Parsed JSON object or null if parsing fails even after repair
 */
export function parseJsonWithRepair(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
        logWarning('Invalid input to parseJsonWithRepair: not a non-empty string', jsonString);
        return null;
    }
    try {
        // First try to parse as-is
        logDebug('Attempting direct JSON parse');
        return JSON.parse(jsonString);
    }
    catch (error) {
        logWarning('Direct JSON parsing failed, attempting repair', { error: error.message });
        try {
            // If parsing fails, attempt repair and parse again
            const repairedJson = repairJson(jsonString);
            logDebug('Attempting parse after repair');
            const parsed = JSON.parse(repairedJson);
            logInfo('Successfully parsed JSON after repair');
            return parsed;
        }
        catch (repairError) {
            // If repair fails, log error and return null
            logError('Failed to repair and parse JSON', { error: repairError.message });
            return null;
        }
    }
}
