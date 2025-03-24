# External Advice Feature Testing Strategy

This document outlines a comprehensive testing strategy for the External Advice feature, which spans both the MCP server and the VS Code extension. Since these are separate codebases that need to work together, a coordinated testing approach is essential.

> **Important Note**: The External Advice feature only works with the Cline Ultra VS Code extension, not with the standard Cline extension. Testing should verify proper behavior with both extensions.

## Testing Overview

The External Advice feature consists of two main components:
1. **MCP Server Side**: Creates and stores advice files in a specific directory
2. **VS Code Extension Side**: Detects, reads, and displays these advice files as notifications, with the ability to insert them as user messages in the chat

Testing must verify that both sides work independently and correctly integrate together. Additionally, testing must verify proper behavior with both Cline Ultra and standard Cline extensions.

## Phase 1: Independent Testing

### MCP Server Side Testing

#### Extension Compatibility Testing

1. **Path Resolution Tests**
   - Test the `getVSCodeTasksDirectory` function with various scenarios:
     - With only Cline Ultra installed
     - With only standard Cline installed
     - With both extensions installed
     - With a specific task ID that exists in one but not the other
   - Verify the function returns the correct path in each scenario
   - Verify the function prioritizes the path where the task exists

2. **Warning Message Tests**
   - Test the `handleSendExternalAdvice` function with both extensions
   - Verify that a warning is included in the response when using standard Cline
   - Verify that no warning is included when using Cline Ultra

#### Unit Tests

1. **JSON File Creation Tests**
   - Test the `handleSendExternalAdvice` function directly
   - Verify files are created with correct structure and content
   - Test all combinations of advice types and priorities
   - Test with various optional parameters (present/absent)

2. **Edge Case Tests**
   - Missing optional fields
   - Very long content
   - Many related files
   - Rapid creation of multiple advice files
   - Expiration functionality

3. **Automated Test Scripts**
   - `tests/unit/external-advice/test-external-advice.js`: Basic unit tests
   - `tests/unit/external-advice/comprehensive-test-external-advice.js`: Comprehensive tests including edge cases

4. **Manual MCP CLI Testing**
   - Use the MCP CLI to call the tool directly:
   ```bash
   mcp-cli call send_external_advice --content "This is a test advice" --title "Test" --type "info" --priority "high" --task_id "1234567890"
   ```
   - Verify the JSON file is created in the expected location with correct content

### VS Code Extension Side Testing

#### Mock File Creation for Testing

Create test scripts that generate mock advice files directly in the VS Code extension's storage location:

```javascript
// Example mock file creation
const fs = require('fs');
const path = require('path');

function createMockAdvice() {
  const taskId = '1234567890'; // Mock task ID
  const adviceDir = path.join('/path/to/extension/storage/tasks', taskId, 'external-advice');
  fs.mkdirSync(adviceDir, { recursive: true });
  
  const advice = {
    id: `advice-test-${Date.now()}`,
    content: "How can I implement a debounce function in JavaScript?",
    title: "Mock Test",
    type: "warning",
    priority: "high",
    timestamp: Date.now(),
    expiresAt: null,
    relatedFiles: ["/path/to/mock.js"],
    read: false
  };
  
  const filePath = path.join(adviceDir, `${advice.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(advice, null, 2));
  console.log(`Created mock advice at ${filePath}`);
}
```

#### UI Component Testing

- Create standalone tests for the notification panel component with mock data
- Verify the component renders correctly with different types of notifications
- Test the "Read" button functionality
- Verify that clicking "Read" correctly inserts the content as a user message in the chat
- Test related files links
- Test expiration handling

#### Chat Integration Testing

- Test that the notification content is properly formatted when inserted into the chat
- Verify that Claude responds appropriately to the inserted message
- Test with various types of content (questions, statements, code snippets)
- Verify that the notification is marked as read after insertion

## Phase 2: Integration Testing

### Manual End-to-End Test

1. Start the MCP server
2. Launch the VS Code extension
3. Create a test advice via the MCP server (either programmatically or using Claude Desktop)
4. Verify the notification appears in the VS Code extension
5. Click the "Read" button and verify the content is inserted into the chat
6. Verify Claude responds appropriately to the inserted message

### File System Bridge Verification

Create a script that monitors both sides of the bridge:

```javascript
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

const taskId = '1234567890'; // Test task ID
const mcpOutputDir = path.join('/path/to/mcp/tasks', taskId, 'external-advice');
const vscodeInputDir = path.join('/path/to/vscode/storage/tasks', taskId, 'external-advice');

// Watch MCP output directory
chokidar.watch(mcpOutputDir).on('add', (filePath) => {
  console.log(`MCP created: ${filePath}`);
  
  // Read the file
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('Content:', content);
  
  // Check if it appears in VS Code dir (may be different location)
  const fileName = path.basename(filePath);
  const vscodeFile = path.join(vscodeInputDir, fileName);
  
  setTimeout(() => {
    if (fs.existsSync(vscodeFile)) {
      console.log(`VS Code received: ${vscodeFile}`);
    } else {
      console.error(`File not received by VS Code: ${fileName}`);
    }
  }, 1000); // Give it a second to propagate
});
```

## Phase 3: Structured End-to-End Test

Create a comprehensive test script that:

1. **Sets up the test environment:**
   - Clear any existing advice files
   - Start both the MCP server and VS Code extension

2. **Creates test cases for different notification types:**
   ```javascript
   const testCases = [
     {
       content: "What's the best way to handle asynchronous operations in JavaScript?",
       title: "Info Test",
       type: "info",
       priority: "low"
     },
     {
       content: "How can I fix the memory leak in my React component?",
       title: "Warning Test",
       type: "warning",
       priority: "medium",
       relatedFiles: ["/path/to/test1.js", "/path/to/test2.js"]
     },
     {
       content: "What's the most efficient algorithm for sorting this data structure?",
       title: "Task Test",
       type: "task",
       priority: "high",
       expiresAfter: 60 // expires after 60 minutes
     }
   ];
   ```

3. **Executes each test case:**
   - Call the MCP tool to create the notification
   - Verify the notification appears in VS Code
   - Click the "Read" button and verify the content is inserted into the chat
   - Verify Claude responds appropriately to the inserted message
   - Document results

4. **Test expiration functionality:**
   - Create a notification with a very short expiration time (e.g., 1 minute)
   - Verify it disappears after the time elapses

## Testing Checklist

### MCP Server Side

- [ ] Tool appears in the list of available tools
- [ ] Tool accepts all parameters correctly
- [ ] Tool creates JSON files in the correct location
- [ ] Files have the correct structure and content
- [ ] Tool handles edge cases (missing optional fields, etc.)
- [ ] Tool handles rapid creation of multiple advice files
- [ ] Expiration timestamp is set correctly
- [ ] Path resolution works correctly with both extensions
- [ ] Warning is included in response when using standard Cline
- [ ] No warning is included when using Cline Ultra

### VS Code Extension Side

- [ ] File watcher detects new advice files
- [ ] Notification icon shows correct unread count
- [ ] Notification panel displays correctly
- [ ] Different notification types display with correct styling
- [ ] "Read" button works correctly
- [ ] Clicking "Read" inserts the content as a user message in the chat
- [ ] Claude responds appropriately to the inserted message
- [ ] Related files links work
- [ ] Expired notifications are handled correctly

### Integration

- [ ] End-to-end flow works from Claude Desktop → MCP → VS Code → Chat
- [ ] Notifications persist between VS Code restarts
- [ ] Multiple rapid notifications are handled correctly
- [ ] Large notifications display properly
- [ ] Content is properly formatted when inserted into the chat

## Running the Tests

### MCP Server Side Tests

```bash
# Run basic unit tests
node tests/unit/external-advice/test-external-advice.js

# Run comprehensive tests
node tests/unit/external-advice/comprehensive-test-external-advice.js

# Run example script
node examples/external-advice-examples/send-advice-example.js

# Verify advice files
node verify-external-advice.js

# Test extension compatibility
node tests/unit/external-advice/test-extension-compatibility.js
```

### Extension Compatibility Test Script

Create a new test script to verify compatibility with both extensions:

```javascript
// tests/unit/external-advice/test-extension-compatibility.js
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const { getVSCodeTasksDirectory } = require('../../src/utils/paths');

// Mock task directories
const ultraTaskId = 'ultra-task-123456789';
const standardTaskId = 'standard-task-123456789';
const nonExistentTaskId = 'non-existent-task';

// Create mock directories for testing
async function setupMockDirectories() {
  const homedir = require('os').homedir();
  
  // Create Ultra path
  const ultraPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'custom.claude-dev-ultra', 'tasks', ultraTaskId);
  await fs.mkdirp(ultraPath);
  
  // Create Standard path
  const standardPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks', standardTaskId);
  await fs.mkdirp(standardPath);
  
  return { ultraPath, standardPath };
}

// Clean up mock directories
async function cleanupMockDirectories(paths) {
  for (const dirPath of Object.values(paths)) {
    const parentDir = path.dirname(dirPath);
    await fs.remove(parentDir);
  }
}

// Run tests
async function runTests() {
  try {
    const paths = await setupMockDirectories();
    
    console.log('Testing path resolution...');
    
    // Test with Ultra task ID
    const ultraDir = getVSCodeTasksDirectory(ultraTaskId);
    assert(ultraDir.includes('custom.claude-dev-ultra'), 'Should return Ultra path for Ultra task ID');
    
    // Test with Standard task ID
    const standardDir = getVSCodeTasksDirectory(standardTaskId);
    assert(standardDir.includes('saoudrizwan.claude-dev'), 'Should return Standard path for Standard task ID');
    
    // Test with non-existent task ID
    const defaultDir = getVSCodeTasksDirectory(nonExistentTaskId);
    console.log(`Default directory: ${defaultDir}`);
    
    // Test with no task ID
    const noTaskIdDir = getVSCodeTasksDirectory();
    console.log(`No task ID directory: ${noTaskIdDir}`);
    
    console.log('All tests passed!');
    
    await cleanupMockDirectories(paths);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests();
```

### VS Code Extension Side Tests

*Note: These tests would be implemented by the VS Code extension team.*

```bash
# Run mock file creation
node tests/mock-external-advice.js

# Run UI component tests
npm run test:ui

# Run chat integration tests
npm run test:chat-integration

# Run integration tests
npm run test:integration
```

## Content Formatting Guidelines

When testing the External Advice feature, ensure that the content is formatted appropriately for insertion into the chat:

- Use complete sentences or questions
- Format content as if the user would type it
- Avoid references to "this notification" or similar phrases
- Test with various types of content:
  - Simple questions
  - Complex technical questions
  - Code-related inquiries
  - Requests for explanations

## Conclusion

This structured testing approach ensures both sides of the feature work independently and correctly integrate together. By testing the complete flow from notification creation to chat message insertion, we can identify and fix any issues before deploying the feature.
