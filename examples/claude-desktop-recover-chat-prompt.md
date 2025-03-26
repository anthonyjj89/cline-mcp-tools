# Claude Desktop Prompt for Testing Crash Recovery

Use this prompt to test the recover_crashed_chat tool in Claude Desktop:

```
I need to recover a crashed conversation from VS Code. Can you please use the recover_crashed_chat tool from the Cline-Chat-Reader MCP server to retrieve the context from task ID 1742912459362?

Once you've recovered the conversation, please analyze it and help me understand what was being discussed so we can continue the work. I don't need any explanations about how the tool works - just use it and show me the recovered context.
```

This prompt uses task ID 1742912459362 as specified. You can replace this with another task ID if needed.

## How to Find a Task ID

1. Open VS Code
2. Look at the URL in the Claude panel, which should look like:
   `vscode-webview://[some-id]/index.html?[task-id]&[other-params]`
3. The task ID is the number after the first `?` and before the next `&`
4. Alternatively, you can use the `list_recent_tasks` tool in Claude Desktop to get a list of recent task IDs

## Expected Output

The recover_crashed_chat tool will return a user-friendly summary of the crashed conversation, including:

- Main topic and related subtopics
- Project context and summary
- Recent conversation flow (last ~15 messages)
- Current status at the time of the crash
- Active code and files being worked on
- Open questions that were not yet answered
- Key decisions made during the conversation
- A continuation prompt to help pick up where you left off

This format is designed to help you quickly understand the context of the crashed conversation and continue your work with minimal friction.
