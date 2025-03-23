/**
 * JSON streaming utilities for the Claude Task Reader MCP Server
 * Provides memory-efficient processing of large JSON files
 */

import fs from 'fs';
import parserPkg from 'stream-json/Parser.js';
import streamArrayPkg from 'stream-json/streamers/StreamArray.js';
import { chain } from 'stream-chain';

const Parser = parserPkg.Parser;
const StreamArray = streamArrayPkg.StreamArray;

/**
 * Message filter options
 */
export interface MessageFilterOptions {
  limit?: number;
  since?: number;
  search?: string;
}

/**
 * Stream and filter a JSON array file, processing one item at a time
 * @param filePath Path to the JSON file containing an array
 * @param options Filtering options
 * @param filterFn Optional custom filter function
 * @returns Promise resolving to the filtered array
 */
export function streamJsonArray<T>(
  filePath: string, 
  options: MessageFilterOptions = {},
  filterFn?: (item: T) => boolean
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    // Default values
    const limit = options.limit || 1000; // Default to 1000 messages
    const since = options.since || 0;
    const search = options.search ? options.search.toLowerCase() : undefined;
    
    // Create the results array
    const results: T[] = [];
    
    // Create the streaming pipeline
    const pipeline = chain([
      fs.createReadStream(filePath),
      new Parser({ jsonStreaming: true }),
      new StreamArray(),
      (data: { value: T }) => {
        // Extract the actual value from the StreamArray output
        const item = data.value as T;
        
        // Apply timestamp filter if specified and if the item has a timestamp property
        if (since > 0 && 'timestamp' in (item as any) && (item as any).timestamp < since) {
          return null;
        }
        
        // Apply search filter if specified and if the item has a content property
        if (search && 'content' in (item as any)) {
          const content = (item as any).content;
          
          // Handle different content types (string or object)
          const contentStr = typeof content === 'string' 
            ? content 
            : JSON.stringify(content);
          
          if (!contentStr.toLowerCase().includes(search)) {
            return null;
          }
        }
        
        // Apply custom filter function if provided
        if (filterFn && !filterFn(item)) {
          return null;
        }
        
        // If we've reached the limit, skip this item
        if (results.length >= limit) {
          return null;
        }
        
        return item;
      }
    ]);
    
    // Handle data, end, and error events
    pipeline.on('data', (item: T) => {
      if (results.length < limit) {
        results.push(item);
      }
    });
    
    pipeline.on('end', () => {
      resolve(results);
    });
    
    pipeline.on('error', (err: Error) => {
      reject(new Error(`Error streaming JSON file: ${err.message}`));
    });
  });
}

/**
 * Stream a JSON file and extract a specific property or apply a transformation
 * @param filePath Path to the JSON file
 * @param propertyPath Dot-notation path to the property to extract (e.g., 'user.name')
 * @param limit Maximum number of items to process
 * @returns Promise resolving to the extracted property values
 */
export function streamJsonProperty<T>(
  filePath: string, 
  propertyPath: string, 
  limit: number = 1000
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    let count = 0;
    
    // Split the property path into parts
    const pathParts = propertyPath.split('.');
    
    const pipeline = chain([
      fs.createReadStream(filePath),
      new Parser({ jsonStreaming: true }),
      (data: { value: any }) => {
        // Extract the specified property
        let value = data.value;
        
        // Navigate through the property path
        for (const part of pathParts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        
        return value;
      }
    ]);
    
    pipeline.on('data', (value: T) => {
      if (value !== undefined && count < limit) {
        results.push(value);
        count++;
      }
    });
    
    pipeline.on('end', () => {
      resolve(results);
    });
    
    pipeline.on('error', (err: Error) => {
      reject(new Error(`Error streaming JSON property: ${err.message}`));
    });
  });
}

/**
 * Count the number of items in a JSON array file
 * @param filePath Path to the JSON file containing an array
 * @returns Promise resolving to the count of items
 */
export function countJsonArrayItems(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;
    
    const pipeline = chain([
      fs.createReadStream(filePath),
      new Parser({ jsonStreaming: true }),
      new StreamArray()
    ]);
    
    pipeline.on('data', () => {
      count++;
    });
    
    pipeline.on('end', () => {
      resolve(count);
    });
    
    pipeline.on('error', (err: Error) => {
      reject(new Error(`Error counting JSON array items: ${err.message}`));
    });
  });
}

/**
 * Search for a term within a JSON array file
 * @param filePath Path to the JSON file containing an array
 * @param searchTerm Term to search for
 * @param contextLength Number of characters to include around the match
 * @param limit Maximum number of results to return
 * @returns Promise resolving to an array of search results with context
 */
export function searchJsonArray<T>(
  filePath: string, 
  searchTerm: string, 
  contextLength: number = 100,
  limit: number = 20
): Promise<Array<{ item: T, snippet: string }>> {
  return new Promise((resolve, reject) => {
    const results: Array<{ item: T, snippet: string }> = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    const pipeline = chain([
      fs.createReadStream(filePath),
      new Parser({ jsonStreaming: true }),
      new StreamArray(),
      (data: { value: T }) => data.value as T
    ]);
    
    pipeline.on('data', (item: T) => {
      if (results.length >= limit) return;
      
      // Convert item to string for searching
      const itemStr = JSON.stringify(item);
      
      // Check if the item contains the search term
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
    });
    
    pipeline.on('end', () => {
      resolve(results);
    });
    
    pipeline.on('error', (err: Error) => {
      reject(new Error(`Error searching JSON array: ${err.message}`));
    });
  });
}

/**
 * Extract a snippet of text around a search term
 * @param content Message content
 * @param searchTerm Term to search for
 * @param contextLength Number of characters to include around the match
 * @returns Text snippet with context
 */
export function extractSnippet(
  content: string | object, 
  searchTerm: string, 
  contextLength: number = 100
): string {
  // Convert content to string if it's an object
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  
  // Find the search term index (case insensitive)
  const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
  
  if (index === -1) return text.substring(0, 150) + '...'; // Return beginning if not found
  
  // Calculate start and end indices for the snippet
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + searchTerm.length + contextLength);
  
  // Create the snippet
  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.substring(start, end);
  if (end < text.length) snippet += '...';
  
  return snippet;
}
