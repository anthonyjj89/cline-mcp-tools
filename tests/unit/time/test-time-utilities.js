/**
 * Test script for time utilities
 * Demonstrates the time utilities in action
 */

import { formatTimestamps, formatHumanReadable, getCurrentTime, getTimeDifference } from './build/utils/time-utils.js';

// Test formatTimestamps
console.log('\n=== Testing formatTimestamps ===');
const now = new Date();
const timestamp = now.getTime();
console.log('Current timestamp:', timestamp);
console.log('Formatted timestamp:');
console.log(JSON.stringify(formatTimestamps(timestamp), null, 2));

// Test formatHumanReadable
console.log('\n=== Testing formatHumanReadable ===');
console.log('Human-readable timestamp:', formatHumanReadable(timestamp));

// Test getCurrentTime
console.log('\n=== Testing getCurrentTime ===');
console.log('Current time:');
console.log(JSON.stringify(getCurrentTime(), null, 2));

// Test getTimeDifference
console.log('\n=== Testing getTimeDifference ===');
// 1 minute ago
const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
console.log('1 minute ago:', getTimeDifference(oneMinuteAgo));

// 1 hour ago
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
console.log('1 hour ago:', getTimeDifference(oneHourAgo));

// 1 day ago
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
console.log('1 day ago:', getTimeDifference(oneDayAgo));

// 2 days ago
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
console.log('2 days ago:', getTimeDifference(twoDaysAgo));

// Between two specific timestamps
const timestamp1 = new Date('2025-03-20T00:00:00Z').getTime();
const timestamp2 = new Date('2025-03-24T00:00:00Z').getTime();
console.log('Between 2025-03-20 and 2025-03-24:', getTimeDifference(timestamp1, timestamp2));

// Demonstrate time zone handling
console.log('\n=== Time Zone Information ===');
console.log('Local time zone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('UTC time:', new Date().toISOString());
console.log('Local time:', new Date().toString());

// Demonstrate MCP server response format
console.log('\n=== Example MCP Server Response ===');
const exampleResponse = {
  task_id: '1616161616161',
  since: formatTimestamps(timestamp1),
  time_info: {
    now: getCurrentTime(),
    timeDifference: getTimeDifference(timestamp1)
  },
  message_count: 10,
  messages: ['...']
};
console.log(JSON.stringify(exampleResponse, null, 2));
