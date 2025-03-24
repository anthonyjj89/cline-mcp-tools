#!/usr/bin/env node
/**
 * Example demonstrating how to use the time utilities for formatting timestamps
 * 
 * This example shows how to:
 * 1. Format timestamps in different formats
 * 2. Calculate time differences
 * 3. Create human-readable time representations
 * 4. Work with time zones
 */

import { 
    formatTimestamp, 
    getTimeDifference, 
    getHumanReadableTime,
    getTimeWithTimeZone
} from '../../src/utils/time-utils.js';

function main() {
    console.log('Time Utilities Example');
    console.log('======================\n');
    
    // Current timestamp
    const now = new Date();
    console.log('Current time:', now.toString());
    
    // 1. Format timestamps in different formats
    console.log('\n1. Formatting Timestamps:');
    console.log('-------------------------');
    
    console.log('ISO format:', formatTimestamp(now, 'iso'));
    console.log('Short format:', formatTimestamp(now, 'short'));
    console.log('Long format:', formatTimestamp(now, 'long'));
    console.log('Date only:', formatTimestamp(now, 'date'));
    console.log('Time only:', formatTimestamp(now, 'time'));
    
    // 2. Calculate time differences
    console.log('\n2. Time Differences:');
    console.log('-------------------');
    
    // Create a timestamp from 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    console.log('Two hours ago:', formatTimestamp(twoHoursAgo, 'long'));
    
    // Calculate the difference
    const diff = getTimeDifference(twoHoursAgo, now);
    console.log('Difference:', diff);
    
    // Create a timestamp from 3 days ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    console.log('Three days ago:', formatTimestamp(threeDaysAgo, 'long'));
    
    // Calculate the difference
    const diffDays = getTimeDifference(threeDaysAgo, now);
    console.log('Difference:', diffDays);
    
    // 3. Human-readable time
    console.log('\n3. Human-Readable Time:');
    console.log('----------------------');
    
    console.log('Now:', getHumanReadableTime(now));
    console.log('Two hours ago:', getHumanReadableTime(twoHoursAgo));
    console.log('Three days ago:', getHumanReadableTime(threeDaysAgo));
    
    // 4. Time zones
    console.log('\n4. Time Zones:');
    console.log('-------------');
    
    console.log('UTC:', getTimeWithTimeZone(now, 'UTC'));
    console.log('New York:', getTimeWithTimeZone(now, 'America/New_York'));
    console.log('London:', getTimeWithTimeZone(now, 'Europe/London'));
    console.log('Tokyo:', getTimeWithTimeZone(now, 'Asia/Tokyo'));
    console.log('Sydney:', getTimeWithTimeZone(now, 'Australia/Sydney'));
}

main();
