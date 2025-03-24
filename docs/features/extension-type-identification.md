# Extension Type Identification

The Extension Type Identification feature ensures that tasks are correctly identified as belonging to either the Cline Ultra or Cline Regular VS Code extension. This feature was added in version 0.5.0 to address issues where Claude Desktop was misidentifying tasks based on content analysis.

## Overview

The Cline Chat Reader MCP Server supports both the Cline Ultra and Cline Regular VS Code extensions. Each extension stores its tasks in a different directory:

- Cline Ultra: `~/Library/Application Support/Code/User/globalStorage/custom.claude-dev-ultra/tasks`
- Cline Regular: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks`

Prior to version 0.5.0, the MCP server would determine which extension a task belonged to based on the directory path, but this information was not explicitly included in the task metadata. This led to situations where Claude Desktop might misidentify tasks based on their content rather than their actual extension type.

## Implementation

The Extension Type Identification feature adds an explicit `extensionType` field to the `TaskMetadata` interface:

```typescript
export interface TaskMetadata {
  id: string;
  timestamp: number;
  created: Date | string;
  modified: Date | string;
  hasApiConversation: boolean;
  hasUiMessages: boolean;
  apiFileSize: string;
  uiFileSize: string;
  apiFileSizeBytes: number;
  uiFileSizeBytes: number;
  extensionType: string;  // "Cline Ultra" or "Cline Regular"
}
```

The `getTask` function in `src/services/task-service.ts` determines the extension type based on the task's directory path:

```typescript
// Determine extension type based on the tasks directory path
const isUltra = tasksDir.includes('custom.claude-dev-ultra');
const extensionType = isUltra ? 'Cline Ultra' : 'Cline Regular';

// Include in task metadata
return {
  // ... other task metadata
  extensionType
};
```

This ensures that every task returned by the MCP server includes explicit information about which extension it belongs to.

## Benefits

The Extension Type Identification feature provides several benefits:

1. **Accurate Task Categorization**: Claude Desktop can now correctly categorize tasks as belonging to either Cline Ultra or Cline Regular, regardless of their content.

2. **Improved User Experience**: Users will see tasks correctly grouped by extension type, making it easier to find and manage their conversations.

3. **Feature Compatibility**: Features that only work with specific extensions (like External Advice) can now reliably determine which extension a task belongs to.

4. **Consistent Identification**: Tasks are consistently identified across all MCP tools, ensuring a unified experience.

## Testing

The Extension Type Identification feature can be tested using the `test-get-task-with-extension-type.js` script, which verifies that tasks from both extensions are correctly identified:

```javascript
node test-get-task-with-extension-type.js
```

The test output should show tasks from Cline Ultra with `extensionType: "Cline Ultra"` and tasks from Cline Regular with `extensionType: "Cline Regular"`.

## Example

Here's an example of task metadata with the extension type field:

```json
{
  "id": "1742841089770",
  "timestamp": 1742841089770,
  "created": "2025-03-24T18:31:29.770Z",
  "modified": "2025-03-24T19:46:55.123Z",
  "hasApiConversation": true,
  "hasUiMessages": true,
  "apiFileSize": "256 KB",
  "uiFileSize": "32 KB",
  "apiFileSizeBytes": 262144,
  "uiFileSizeBytes": 32768,
  "extensionType": "Cline Ultra"
}
```

## Integration with Other Features

The Extension Type Identification feature integrates with other features in the Cline Chat Reader MCP Server:

### External Advice

The External Advice feature uses the extension type to determine whether to display a warning when sending advice to a Cline Regular task:

```typescript
// Check if we're using the Ultra path
const isUltra = specificTasksDir.includes('custom.claude-dev-ultra');

// Include a warning if not using Ultra
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        success: true,
        adviceId: advice.id,
        message: 'Advice sent successfully',
        warning: isUltra ? null : 'NOTE: This advice was sent to standard Cline, but the External Advice feature only works with Cline Ultra.'
      }, null, 2),
    },
  ],
};
```

### Task Listing

The `list_recent_tasks` tool now includes the extension type in the task metadata, making it easier for Claude Desktop to categorize tasks:

```typescript
// Get details for each task
const taskDetails = await Promise.all(
  limitedTasks.map(async (task) => {
    // Get the appropriate tasks directory for this specific task
    const specificTasksDir = await getTasksDirectoryForTask(task.id);
    return await getTask(specificTasksDir, task.id);
  })
);
```

## Future Enhancements

Possible future enhancements to the Extension Type Identification feature:

1. Add support for more VS Code extensions
2. Implement a way to filter tasks by extension type
3. Add extension-specific features and optimizations
4. Create a unified task view that shows tasks from all extensions
