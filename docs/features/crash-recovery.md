# Crash Recovery Feature

The Crash Recovery feature in Cline Ultra provides a way to recover context from crashed or corrupted conversations. This feature is particularly useful when a conversation becomes inaccessible due to file corruption, VS Code crashes, or other technical issues.

## Overview

When a conversation crashes or becomes corrupted, users can use the Crash Recovery feature to:

1. Extract and analyze the content from the corrupted conversation file
2. Generate a summary of the conversation's main topics and context
3. Save the recovered context to a dedicated crash reports directory
4. View and manage crash reports through the Cline Ultra extension UI

## How It Works

The Crash Recovery feature uses multiple strategies to recover as much information as possible from corrupted conversation files:

1. **Direct JSON parsing**: Attempts to parse the file as a standard JSON array
2. **Chunk-by-chunk parsing**: Splits the file into chunks and tries to parse each chunk individually
3. **Line-by-line parsing**: Processes the file line by line to reconstruct messages
4. **JSON object extraction**: Uses regex to find and extract valid JSON objects from the file

After recovering the messages, the system analyzes the conversation to extract:

- Main topics and subtopics
- Code snippets and their evolution
- Modified files and active files
- Decision points and open questions
- Timeline of the conversation
- Current status at the time of the crash

## Using the Crash Recovery Feature

### From Claude Desktop

1. Open Claude Desktop
2. Use the "Recover Crashed Chat" option in the menu
3. Enter the task ID of the crashed conversation
4. The recovered context will be saved to the crash reports directory in Cline Ultra

### From VS Code (Cline Ultra)

1. Open VS Code with Cline Ultra installed
2. Use the "Recover Crashed Conversation" command from the command palette
3. Select the crashed conversation from the list or enter its task ID
4. The recovered context will be saved to the crash reports directory
5. Access the crash reports from the Cline Ultra extension's dedicated UI

### Using the MCP Tool

The Crash Recovery feature is also available as an MCP tool that can be used programmatically:

```javascript
// Example of using the recover_crashed_chat MCP tool
const result = await useMcpTool({
  server_name: "claude-task-reader",
  tool_name: "recover_crashed_chat",
  arguments: {
    task_id: "1742912459362", // Replace with your task ID
    max_length: 2000,
    include_code_snippets: true,
    save_to_crashreports: true
  }
});
```

## Crash Reports Directory and Management

Recovered conversations are saved to a dedicated crash reports directory in the Cline Ultra extension storage:

- **macOS**: `~/Library/Application Support/Code/User/globalStorage/custom.claude-dev-ultra/crashReports`
- **Windows**: `%APPDATA%\Code\User\globalStorage\custom.claude-dev-ultra\crashReports`
- **Linux**: `~/.config/Code/User/globalStorage/custom.claude-dev-ultra/crashReports`

### Crash Report Structure

Each crash report is saved as a JSON file containing:
- The task ID of the crashed conversation
- A summary of the main topics and context
- The formatted message for easy copying
- Metadata about the recovery process
- Read status (whether the report has been viewed)

### Folder-Based Management

The crash reports use a folder-based approach for management:
- New crash reports are saved to the main `crashReports` directory
- When a user dismisses a report, it's moved to the `crashReports/Dismissed` subdirectory
- The Cline Ultra extension UI only displays reports from the main directory, not from the Dismissed folder

### Extension UI Integration

The Cline Ultra extension provides a dedicated UI for managing crash reports:
1. Reports appear in the main extension interface
2. Users can view the full content of each report
3. Reports can be dismissed (which moves them to the Dismissed folder)
4. Users can copy the recovered content to use in a new conversation

## Best Practices

1. **Regular Backups**: Periodically back up important conversations by exporting them
2. **Check Crash Reports**: Regularly check the Cline Ultra extension for any crash reports
3. **Save Code Snippets**: Save important code snippets to files to avoid losing them in a crash
4. **Report Issues**: If you encounter frequent crashes, report them to the Cline Ultra team

## Limitations

- The recovery process may not be able to recover 100% of the conversation content
- Some formatting and structure may be lost in the recovery process
- Very large conversations may be truncated in the recovery result
- The feature is only available in Cline Ultra, not in the standard Cline extension

## Troubleshooting

If you encounter issues with the Crash Recovery feature:

1. **Check the task ID**: Make sure you're using the correct task ID for the crashed conversation
2. **Verify file existence**: Ensure the conversation file still exists in the tasks directory
3. **Try different recovery options**: Adjust the parameters like max_length and include_code_snippets
4. **Check permissions**: Ensure the extension has permission to read and write to the necessary directories
