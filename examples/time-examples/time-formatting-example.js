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
    formatTimestamps, 
    getTimeDifference, 
    formatHumanReadable,
    getCurrentTime
} from '../../build/utils/time-utils.js';

function main() {
    console.log('Time Utilities Example');
    console.log('======================\n');
    
    // Current timestamp
    const now = new Date();
    console.log('Current time:', now.toString());
    
    // 1. Format timestamps in different formats
    console.log('\n1. Formatting Timestamps:');
    console.log('-------------------------');
    
    const formats = formatTimestamps(now);
    console.log('UTC format:', formats.utc);
    console.log('Local format:', formats.local);
    console.log('Local time:', formats.localTime);
    console.log('Local date:', formats.localDate);
    console.log('Time zone:', formats.timeZoneName);
    
    // 2. Calculate time differences
    console.log('\n2. Time Differences:');
    console.log('-------------------');
    
    // Create a timestamp from 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    console.log('Two hours ago:', formatTimestamps(twoHoursAgo).local);
    
    // Calculate the difference
    const diff = getTimeDifference(twoHoursAgo, now);
    console.log('Difference:', diff);
    
    // Create a timestamp from 3 days ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    console.log('Three days ago:', formatTimestamps(threeDaysAgo).local);
    
    // Calculate the difference
    const diffDays = getTimeDifference(threeDaysAgo, now);
    console.log('Difference:', diffDays);
    
    // 3. Human-readable time
    console.log('\n3. Human-Readable Time:');
    console.log('----------------------');
    
    console.log('Now:', formatHumanReadable(now));
    console.log('Two hours ago:', formatHumanReadable(twoHoursAgo));
    console.log('Three days ago:', formatHumanReadable(threeDaysAgo));
    
    // 4. Current time
    console.log('\n4. Current Time:');
    console.log('---------------');
    
    const currentTime = getCurrentTime();
    console.log('Current UTC time:', currentTime.utc);
    console.log('Current local time:', currentTime.local);
    console.log('Current time zone:', currentTime.timeZoneName);
}

main();
