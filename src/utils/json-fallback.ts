/**
 * Fallback JSON utilities for when stream-json parsing fails
 * Provides direct file reading as an alternative to streaming
 */

import fs from 'fs-extra';
import { MessageFilterOptions } from './json-streaming.js';

/**
 * Read and parse a JSON array file directly
 * @param filePath Path to the JSON file containing an array
 * @param options Filtering options
 * @param filterFn Optional custom filter function
 * @returns Promise resolving to the filtered array
 */
export async function readJsonArray<T>(
  filePath: string, 
  options: MessageFilterOptions = {},
  filterFn?: (item: T) => boolean
): Promise<T[]> {
  try {
    // Read and parse the entire file
    const fileContent = await fs.readFile(filePath, 'utf8');
    const allItems = JSON.parse(fileContent) as T[];
    
    // Apply filters
    const limit = options.limit || 1000;
    const since = options.since || 0;
    const search = options.search ? options.search.toLowerCase() : undefined;
    
    let filteredItems = allItems;
    
    // Apply timestamp filter
    if (since > 0) {
      filteredItems = filteredItems.filter(item => 
        'timestamp' in (item as any) && (item as any).timestamp >= since
      );
    }
    
    // Apply search filter
    if (search) {
      filteredItems = filteredItems.filter(item => {
        if (!('content' in (item as any))) return false;
        
        const content = (item as any).content;
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
  } catch (error) {
    throw new Error(`Error reading JSON file: ${(error as Error).message}`);
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
export async function searchJsonArrayDirect<T>(
  filePath: string,
  searchTerm: string,
  contextLength: number = 100,
  limit: number = 20
): Promise<Array<{ item: T, snippet: string }>> {
  try {
    // Read and parse the entire file
    const fileContent = await fs.readFile(filePath, 'utf8');
    const allItems = JSON.parse(fileContent) as T[];
    
    const results: Array<{ item: T, snippet: string }> = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Search through items
    for (const item of allItems) {
      if (results.length >= limit) break;
      
      const itemStr = JSON.stringify(item);
      const lowerItemStr = itemStr.toLowerCase();
      
      if (lowerItemStr.includes(lowerSearchTerm)) {
        // Create a snippet with context
        const index = lowerItemStr.indexOf(lowerSearchTerm);
        const start = Math.max(0, index - contextLength);
        const end = Math.min(itemStr.length, index + searchTerm.length + contextLength);
        
        let snippet = '';
        if (start > 0) snippet += '...';
        snippet += itemStr.substring(start, end);
        if (end < itemStr.length) snippet += '...';
        
        results.push({ item, snippet });
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Error searching JSON file: ${(error as Error).message}`);
  }
}

/**
 * Count the number of items in a JSON array file
 * @param filePath Path to the JSON file containing an array
 * @returns Promise resolving to the count of items
 */
export async function countJsonArrayItemsDirect(filePath: string): Promise<number> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const allItems = JSON.parse(fileContent) as any[];
    return allItems.length;
  } catch (error) {
    throw new Error(`Error counting JSON array items: ${(error as Error).message}`);
  }
}
