/**
 * Fallback JSON utilities for when stream-json parsing fails
 * Provides direct file reading as an alternative to streaming
 */
import fs from 'fs-extra';
/**
 * Read and parse a JSON array file directly
 * @param filePath Path to the JSON file containing an array
 * @param options Filtering options
 * @param filterFn Optional custom filter function
 * @returns Promise resolving to the filtered array
 */
export async function readJsonArray(filePath, options = {}, filterFn) {
    try {
        // Read and parse the entire file
        const fileContent = await fs.readFile(filePath, 'utf8');
        const allItems = JSON.parse(fileContent);
        // Apply filters
        const limit = options.limit || 1000;
        const since = options.since || 0;
        const search = options.search ? options.search.toLowerCase() : undefined;
        let filteredItems = allItems;
        // Apply timestamp filter
        if (since > 0) {
            filteredItems = filteredItems.filter(item => 'timestamp' in item && item.timestamp >= since);
        }
        // Apply search filter
        if (search) {
            filteredItems = filteredItems.filter(item => {
                if (!('content' in item))
                    return false;
                const content = item.content;
                const contentStr = typeof content === 'string'
                    ? content
                    : JSON.stringify(content);
                return contentStr.toLowerCase().includes(search);
            });
        }
        // Apply custom filter
        if (filterFn) {
            filteredItems = filteredItems.filter(filterFn);
        }
        // Apply limit
        return filteredItems.slice(0, limit);
    }
    catch (error) {
        throw new Error(`Error reading JSON file: ${error.message}`);
    }
}
/**
 * Search within a JSON array file
 * @param filePath Path to the JSON file containing an array
 * @param searchTerm Term to search for
 * @param contextLength Number of characters to include around the match
 * @param limit Maximum number of results to return
 * @returns Promise resolving to an array of search results with context
 */
export async function searchJsonArrayDirect(filePath, searchTerm, contextLength = 100, limit = 20) {
    try {
        // Read and parse the entire file
        const fileContent = await fs.readFile(filePath, 'utf8');
        const allItems = JSON.parse(fileContent);
        const results = [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        // Search through items
        for (const item of allItems) {
            if (results.length >= limit)
                break;
            const itemStr = JSON.stringify(item);
            const lowerItemStr = itemStr.toLowerCase();
            if (lowerItemStr.includes(lowerSearchTerm)) {
                // Create a snippet with context
                const index = lowerItemStr.indexOf(lowerSearchTerm);
                const start = Math.max(0, index - contextLength);
                const end = Math.min(itemStr.length, index + searchTerm.length + contextLength);
                let snippet = '';
                if (start > 0)
                    snippet += '...';
                snippet += itemStr.substring(start, end);
                if (end < itemStr.length)
                    snippet += '...';
                results.push({ item, snippet });
            }
        }
        return results;
    }
    catch (error) {
        throw new Error(`Error searching JSON file: ${error.message}`);
    }
}
/**
 * Count the number of items in a JSON array file
 * @param filePath Path to the JSON file containing an array
 * @returns Promise resolving to the count of items
 */
export async function countJsonArrayItemsDirect(filePath) {
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const allItems = JSON.parse(fileContent);
        return allItems.length;
    }
    catch (error) {
        throw new Error(`Error counting JSON array items: ${error.message}`);
    }
}
