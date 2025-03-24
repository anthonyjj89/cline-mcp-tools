/**
 * Test script for the simple conversation analyzer
 * This script tests the functionality of the conversation analyzer with sample data
 */

import fs from 'fs';
import path from 'path';
import { analyzeConversation } from './build/utils/conversation-analyzer-simple.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Helper function to print colored output
function print(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to print section headers
function printHeader(message) {
  console.log('\n');
  print('='.repeat(80), colors.cyan);
  print(` ${message} `, colors.cyan + colors.bright);
  print('='.repeat(80), colors.cyan);
}

// Create a sample conversation file for testing
async function createSampleConversation() {
  const sampleDir = path.join(process.cwd(), 'tests', 'sample-data');
  const sampleFile = path.join(sampleDir, 'sample-conversation.json');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(sampleDir)) {
    fs.mkdirSync(sampleDir, { recursive: true });
  }
  
  // Sample conversation data
  const sampleData = [
    {
      "role": "human",
      "content": "I need help creating a Node.js application that processes large JSON files efficiently.",
      "timestamp": Date.now() - 3600000 // 1 hour ago
    },
    {
      "role": "assistant",
      "content": "I'd be happy to help you create a Node.js application for processing large JSON files efficiently. For large JSON files, streaming is the best approach to avoid loading the entire file into memory.\n\nHere's how we can implement this:\n\n```javascript\nconst fs = require('fs');\nconst { chain } = require('stream-chain');\nconst { parser } = require('stream-json');\nconst { streamArray } = require('stream-json/streamers/StreamArray');\n\nfunction processLargeJsonFile(filePath) {\n  const pipeline = chain([\n    fs.createReadStream(filePath),\n    parser(),\n    streamArray(),\n    data => {\n      // Process each item here\n      const item = data.value;\n      console.log(item);\n      return item; // Pass it further if needed\n    }\n  ]);\n  \n  pipeline.on('data', item => {\n    // Do something with the processed item\n  });\n  \n  pipeline.on('end', () => {\n    console.log('Processing complete');\n  });\n  \n  pipeline.on('error', err => {\n    console.error('Error:', err);\n  });\n}\n\nprocessLargeJsonFile('path/to/large-file.json');\n```\n\nThis approach uses the `stream-json` package which is excellent for processing large JSON files with minimal memory usage.",
      "timestamp": Date.now() - 3500000 // 58 minutes ago
    },
    {
      "role": "human",
      "content": "That looks good. Can you also show me how to extract specific fields from each JSON object in the stream?",
      "timestamp": Date.now() - 3400000 // 56 minutes ago
    },
    {
      "role": "assistant",
      "content": "Certainly! To extract specific fields from each JSON object in the stream, you can modify the processing function to select only the fields you're interested in. Here's how you can do it:\n\n```javascript\nfunction extractFields(item, fieldsToExtract) {\n  const extractedData = {};\n  fieldsToExtract.forEach(field => {\n    // Support for nested fields with dot notation (e.g., 'user.name')\n    const fieldParts = field.split('.');\n    let value = item;\n    \n    for (const part of fieldParts) {\n      if (value && typeof value === 'object' && part in value) {\n        value = value[part];\n      } else {\n        value = undefined;\n        break;\n      }\n    }\n    \n    if (value !== undefined) {\n      extractedData[field] = value;\n    }\n  });\n  \n  return extractedData;\n}\n```\n\nThis function supports nested fields using dot notation (e.g., 'user.name' will extract the 'name' property from the 'user' object).",
      "timestamp": Date.now() - 3300000 // 55 minutes ago
    },
    {
      "role": "human",
      "content": "Great! Now I'd like to implement some error handling. What's the best way to handle corrupted JSON or other errors that might occur during processing?",
      "timestamp": Date.now() - 3200000 // 53 minutes ago
    },
    {
      "role": "assistant",
      "content": "Error handling is crucial when processing large JSON files, as corruption or malformed data can occur. Here's how to implement robust error handling in your streaming JSON processor:\n\n```javascript\nfunction processLargeJsonFile(filePath, fieldsToExtract) {\n  return new Promise((resolve, reject) => {\n    const results = [];\n    let processedCount = 0;\n    let errorCount = 0;\n    \n    // Create a writable stream for logging errors\n    const errorLogStream = fs.createWriteStream('error.log', { flags: 'a' });\n    \n    try {\n      // Check if file exists before starting\n      if (!fs.existsSync(filePath)) {\n        reject(new Error(`File not found: ${filePath}`));\n        return;\n      }\n      \n      const pipeline = chain([\n        fs.createReadStream(filePath)\n          .on('error', (err) => {\n            // Handle file read errors\n            errorLogStream.write(`File read error: ${err.message}\\n`);\n            reject(new Error(`Error reading file: ${err.message}`));\n          }),\n        \n        // Configure parser with error recovery options\n        parser({ jsonStreaming: true })\n          .on('error', (err) => {\n            // Log parser errors but continue if possible\n            errorCount++;\n            errorLogStream.write(`JSON parse error: ${err.message}\\n`);\n            console.warn(`JSON parse error: ${err.message}`);\n            // Don't reject here to allow processing to continue\n          }),\n        \n        streamArray()\n          .on('error', (err) => {\n            errorCount++;\n            errorLogStream.write(`Stream error: ${err.message}\\n`);\n            console.warn(`Stream error: ${err.message}`);\n          })\n      ]);\n      \n      // Rest of the implementation...\n    } catch (err) {\n      errorLogStream.write(`Unexpected error: ${err.message}\\n`);\n      errorLogStream.end();\n      reject(new Error(`Unexpected error: ${err.message}`));\n    }\n  });\n}\n```\n\nKey error handling features in this implementation:\n\n1. **Promise-based API**: Returns a promise that resolves with results or rejects with an error\n2. **Error logging**: Writes errors to a log file for later analysis\n3. **Granular error handling**: Different handling for different types of errors\n4. **Statistics**: Tracks processed items and error counts\n5. **Graceful degradation**: Continues processing when possible",
      "timestamp": Date.now() - 3100000 // 51 minutes ago
    },
    {
      "role": "human",
      "content": "I've created a file called process-json.js with your code. Can you help me test it with a large JSON file?",
      "timestamp": Date.now() - 3000000 // 50 minutes ago
    },
    {
      "role": "assistant",
      "content": "I've created a command-line tool that implements all the techniques we've discussed. This tool allows you to process large JSON files efficiently with field extraction and robust error handling.\n\nTo test it with a large JSON file, you can run:\n\n```bash\nnode process-json.js large-data.json --fields=id,name,email --output=results.json\n```\n\nI've also added support for line-delimited JSON (NDJSON) format with the `--format=ndjson` option.\n\nTo make the script executable directly, you can:\n\n1. Add the shebang line at the top: `#!/usr/bin/env node`\n2. Make it executable: `chmod +x process-json.js`\n3. Run it: `./process-json.js input.json --fields=id,name,email`\n\nI've implemented <write_to_file> and <execute_command> operations to create and test this tool.",
      "timestamp": Date.now() - 2900000 // 48 minutes ago
    }
  ];
  
  // Write the sample data to the file
  fs.writeFileSync(sampleFile, JSON.stringify(sampleData, null, 2));
  
  print(`Created sample conversation file: ${sampleFile}`, colors.green);
  return sampleFile;
}

// Main test function
async function testConversationAnalyzer() {
  printHeader('Simple Conversation Analyzer Test');
  
  // Create sample conversation file
  print('Creating sample conversation file...', colors.blue);
  const sampleFile = await createSampleConversation();
  
  // Test with all messages
  printHeader('Analyzing All Messages');
  try {
    print('Analyzing conversation...', colors.blue);
    const startTime = Date.now();
    const analysis = await analyzeConversation(sampleFile);
    const duration = (Date.now() - startTime) / 1000;
    
    print(`Analysis completed in ${duration.toFixed(2)}s`, colors.green);
    print('\nAnalysis Results:', colors.bright);
    print(JSON.stringify(analysis, null, 2));
    
    // Verify results
    if (analysis.message_count > 0) {
      print(`✓ Found ${analysis.message_count} messages`, colors.green);
    } else {
      print('✗ No messages found', colors.red);
    }
    
    if (analysis.topics.length > 0) {
      print(`✓ Extracted ${analysis.topics.length} topics`, colors.green);
      print('Top topics:', colors.bright);
      analysis.topics.slice(0, 5).forEach(topic => {
        print(`  - ${topic.topic} (${topic.count} occurrences)`, colors.green);
      });
    } else {
      print('✗ No topics extracted', colors.red);
    }
    
    if (analysis.code_blocks > 0) {
      print(`✓ Detected ${analysis.code_blocks} code blocks`, colors.green);
    }
    
    if (analysis.files_referenced.length > 0) {
      print(`✓ Found ${analysis.files_referenced.length} file references`, colors.green);
      print('Files referenced:', colors.bright);
      analysis.files_referenced.slice(0, 5).forEach(file => {
        print(`  - ${file}`, colors.green);
      });
    }
    
    if (analysis.key_actions.length > 0) {
      print(`✓ Detected ${analysis.key_actions.length} key actions`, colors.green);
      print('Key actions:', colors.bright);
      analysis.key_actions.forEach(action => {
        print(`  - ${action}`, colors.green);
      });
    }
  } catch (error) {
    print(`Error analyzing conversation: ${error.message}`, colors.red);
  }
  
  // Test with time window
  printHeader('Analyzing Messages in Time Window');
  try {
    const timeWindow = Date.now() - 3300000; // Messages in the last 55 minutes
    print(`Analyzing conversation with time window: ${new Date(timeWindow).toISOString()}`, colors.blue);
    const startTime = Date.now();
    const analysis = await analyzeConversation(sampleFile, timeWindow);
    const duration = (Date.now() - startTime) / 1000;
    
    print(`Analysis completed in ${duration.toFixed(2)}s`, colors.green);
    print('\nTime-Window Analysis Results:', colors.bright);
    print(JSON.stringify(analysis, null, 2));
    
    // Verify results
    if (analysis.message_count > 0 && analysis.message_count < 7) {
      print(`✓ Found ${analysis.message_count} messages in time window`, colors.green);
    } else {
      print(`✗ Expected fewer messages in time window, got ${analysis.message_count}`, colors.red);
    }
  } catch (error) {
    print(`Error analyzing conversation with time window: ${error.message}`, colors.red);
  }
  
  printHeader('Test Complete');
}

// Run the test
testConversationAnalyzer().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
