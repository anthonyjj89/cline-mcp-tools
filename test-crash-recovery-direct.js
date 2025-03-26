/**
 * Simple test script for the crash recovery functionality
 * This script directly tests the crash recovery functions without using the MCP server
 */

import { recoverCrashedConversation, formatRecoveredContext } from './build/utils/crash-recovery.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Function to find the conversation file for a specific task ID
async function findConversationFile(taskId) {
  // Get both Cline Ultra and standard Cline paths
  const homedir = os.homedir();
  const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks', taskId);
  const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks', taskId);
  
  // Check for the API conversation file in both paths (with different naming conventions)
  const ultraApiFile = path.join(ultraPath, 'api-conversation.json');
  const ultraApiFileAlt = path.join(ultraPath, 'api_conversation_history.json');
  const standardApiFile = path.join(standardPath, 'api-conversation.json');
  const standardApiFileAlt = path.join(standardPath, 'api_conversation_history.json');
  
  // Log the paths we're checking
  console.log(`Checking Ultra path (hyphen): ${ultraApiFile}`);
  console.log(`Checking Ultra path (underscore): ${ultraApiFileAlt}`);
  console.log(`Checking Standard path (hyphen): ${standardApiFile}`);
  console.log(`Checking Standard path (underscore): ${standardApiFileAlt}`);
  
  // Check if the directories exist
  console.log(`Ultra directory exists: ${fs.existsSync(ultraPath)}`);
  console.log(`Standard directory exists: ${fs.existsSync(standardPath)}`);
  
  // List files in the Ultra directory if it exists
  if (fs.existsSync(ultraPath)) {
    console.log(`Files in Ultra directory:`);
    const files = fs.readdirSync(ultraPath);
    files.forEach(file => console.log(`- ${file}`));
  }
  
  // Check all possible file paths
  if (fs.existsSync(ultraApiFile)) {
    console.log(`Found conversation file in Cline Ultra (hyphen): ${ultraApiFile}`);
    return ultraApiFile;
  }
  
  if (fs.existsSync(ultraApiFileAlt)) {
    console.log(`Found conversation file in Cline Ultra (underscore): ${ultraApiFileAlt}`);
    return ultraApiFileAlt;
  }
  
  if (fs.existsSync(standardApiFile)) {
    console.log(`Found conversation file in standard Cline (hyphen): ${standardApiFile}`);
    return standardApiFile;
  }
  
  if (fs.existsSync(standardApiFileAlt)) {
    console.log(`Found conversation file in standard Cline (underscore): ${standardApiFileAlt}`);
    return standardApiFileAlt;
  }
  
  // If the specific task ID is not found, fall back to the sample conversation
  console.log(`Task ID ${taskId} not found. Using sample conversation file.`);
  
  // Use the sample conversation file from the tests directory
  const sampleFilePath = path.join('tests', 'sample-data', 'sample-conversation.json');
  
  // Check if the sample file exists
  if (!fs.existsSync(sampleFilePath)) {
    // Create a sample conversation file if it doesn't exist
    const sampleConversation = [
      {
        "role": "human",
        "content": "Create a simple React component that displays a counter with increment and decrement buttons.",
        "timestamp": 1648123456789
      },
      {
        "role": "assistant",
        "content": "Here's a simple React component that displays a counter with increment and decrement buttons:\n\n```jsx\nimport React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  const increment = () => {\n    setCount(count + 1);\n  };\n\n  const decrement = () => {\n    setCount(count - 1);\n  };\n\n  return (\n    <div className=\"counter\">\n      <h2>Counter: {count}</h2>\n      <div className=\"buttons\">\n        <button onClick={decrement}>-</button>\n        <button onClick={increment}>+</button>\n      </div>\n    </div>\n  );\n}\n\nexport default Counter;\n```\n\nThis component uses React's `useState` hook to manage the counter state. The `increment` and `decrement` functions update the state when the respective buttons are clicked.\n\nTo use this component in your application, you would import it like this:\n\n```jsx\nimport Counter from './Counter';\n\nfunction App() {\n  return (\n    <div className=\"app\">\n      <h1>React Counter</h1>\n      <Counter />\n    </div>\n  );\n}\n\nexport default App;\n```\n\nYou might also want to add some basic styling to make it look nicer:\n\n```css\n.counter {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  margin: 2rem;\n  padding: 1rem;\n  border: 1px solid #ccc;\n  border-radius: 8px;\n}\n\n.buttons {\n  display: flex;\n  gap: 1rem;\n}\n\nbutton {\n  padding: 0.5rem 1rem;\n  font-size: 1.25rem;\n  border-radius: 4px;\n  cursor: pointer;\n}\n```\n\nThis will create a simple counter component with a clean UI that allows users to increment and decrement the counter value.",
        "timestamp": 1648123556789
      },
      {
        "role": "human",
        "content": "Can you modify it to add a reset button?",
        "timestamp": 1648123656789
      },
      {
        "role": "assistant",
        "content": "Sure! Here's the modified React counter component with an added reset button:\n\n```jsx\nimport React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  const increment = () => {\n    setCount(count + 1);\n  };\n\n  const decrement = () => {\n    setCount(count - 1);\n  };\n\n  const reset = () => {\n    setCount(0);\n  };\n\n  return (\n    <div className=\"counter\">\n      <h2>Counter: {count}</h2>\n      <div className=\"buttons\">\n        <button onClick={decrement}>-</button>\n        <button onClick={reset}>Reset</button>\n        <button onClick={increment}>+</button>\n      </div>\n    </div>\n  );\n}\n\nexport default Counter;\n```\n\nI've added a new `reset` function that sets the count back to 0, and I've included a Reset button between the decrement and increment buttons.\n\nYou might want to style the reset button differently to make it stand out. Here's an updated CSS example:\n\n```css\n.counter {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  margin: 2rem;\n  padding: 1rem;\n  border: 1px solid #ccc;\n  border-radius: 8px;\n}\n\n.buttons {\n  display: flex;\n  gap: 1rem;\n}\n\nbutton {\n  padding: 0.5rem 1rem;\n  font-size: 1.25rem;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\nbutton:nth-child(2) {\n  /* Styling for the reset button */\n  background-color: #f0f0f0;\n  color: #333;\n  border: 1px solid #999;\n}\n\nbutton:nth-child(2):hover {\n  background-color: #e0e0e0;\n}\n```\n\nThis CSS targets the middle button (the reset button) and gives it a different style to distinguish it from the increment and decrement buttons.",
        "timestamp": 1648123756789
      }
    ];
    
    // Create the directory if it doesn't exist
    await fs.promises.mkdir(path.dirname(sampleFilePath), { recursive: true });
    
    // Write the sample conversation to the file
    await fs.promises.writeFile(sampleFilePath, JSON.stringify(sampleConversation, null, 2));
    
    console.log(`Created sample conversation file at ${sampleFilePath}`);
  }
  
  return sampleFilePath;
}

// Main function to test the crash recovery functionality
async function testCrashRecovery() {
  try {
    console.log('Testing crash recovery functionality...');
    
    // Find the conversation file for the specific task ID
    const taskId = '1742912459362';
    const conversationFilePath = await findConversationFile(taskId);
    console.log(`Using conversation file: ${conversationFilePath}`);
    
    // Recover the conversation for the specific task ID
    console.log(`Recovering conversation for task ID: ${taskId}...`);
    const recoveredContext = await recoverCrashedConversation(conversationFilePath, 2000, true);
    
    // Display the recovery result
    console.log('\n=== Recovery Result ===');
    console.log(`Original Task: ${recoveredContext.original_task ? recoveredContext.original_task.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`Summary: ${recoveredContext.summary ? recoveredContext.summary.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`Main Topic: ${recoveredContext.main_topic || 'N/A'}`);
    console.log(`Subtopics: ${recoveredContext.subtopics ? recoveredContext.subtopics.join(', ') : 'N/A'}`);
    console.log(`Key Topics: ${recoveredContext.key_topics ? recoveredContext.key_topics.join(', ') : 'N/A'}`);
    console.log(`Modified Files: ${recoveredContext.modified_files ? recoveredContext.modified_files.length + ' files' : 'N/A'}`);
    console.log(`Active Files: ${recoveredContext.active_files ? recoveredContext.active_files.join(', ') : 'N/A'}`);
    console.log(`Open Questions: ${recoveredContext.open_questions ? recoveredContext.open_questions.join('; ') : 'N/A'}`);
    console.log(`Current Status: ${recoveredContext.current_status ? recoveredContext.current_status.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`Recent Messages: ${recoveredContext.recent_messages ? recoveredContext.recent_messages.length + ' messages' : 'N/A'}`);
    console.log(`Decision Points: ${recoveredContext.decision_points ? recoveredContext.decision_points.length + ' points' : 'N/A'}`);
    console.log(`Recovery Confidence: ${recoveredContext.recovery_confidence || 'N/A'}`);
    console.log(`Message Count: ${recoveredContext.message_count ? `${recoveredContext.message_count.recovered}/${recoveredContext.message_count.total}` : 'N/A'}`);
    console.log(`Code Snippets: ${recoveredContext.code_snippets ? recoveredContext.code_snippets.length : 'N/A'}`);
    console.log(`Code Evolution: ${recoveredContext.code_evolution ? recoveredContext.code_evolution.length + ' items' : 'N/A'}`);
    
    // Format the recovered context as a message
    console.log('\nFormatting recovered context as a message...');
    const formattedMessage = formatRecoveredContext(recoveredContext);
    
    // Display the formatted message
    console.log('\n=== Formatted Message ===');
    console.log(formattedMessage);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testCrashRecovery();
