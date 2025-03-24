# Time Utilities for Cline Chat Reader

This module provides utilities for consistent timestamp formatting and time-related operations in the Cline Chat Reader MCP server. It ensures that all timestamps in the MCP server responses include proper time zone information, making it easier for Claude Desktop to interpret and display time information correctly.

## Features

- Format timestamps with various time representations (UTC, local, etc.)
- Provide human-readable time strings with time zone information
- Calculate time differences between timestamps
- Get current time in various formats

## Implementation

The time utilities are implemented in the following files:

1. `src/utils/time-utils.ts` - Contains the time utility functions
2. `src/mcp-server.ts` - Uses the time utilities in various handlers

## Functions

### `formatTimestamps(timestamp)`

Formats a timestamp with various time representations:

```javascript
formatTimestamps(timestamp: number | string | Date) {
  const date = new Date(timestamp);
  return {
    utc: date.toISOString(),
    local: date.toString(),
    localTime: date.toLocaleTimeString(),
    localDate: date.toLocaleDateString(),
    timeZoneName: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
```

This function returns an object with the following properties:
- `utc`: ISO string representation (e.g., "2025-03-24T01:17:40.000Z")
- `local`: Full local string representation with time zone (e.g., "Mon Mar 24 2025 05:17:40 GMT+0400 (Gulf Standard Time)")
- `localTime`: Local time string (e.g., "5:17:40 AM")
- `localDate`: Local date string (e.g., "3/24/2025")
- `timeZoneName`: Time zone name (e.g., "Asia/Dubai")

### `formatHumanReadable(timestamp)`

Formats a timestamp as a human-readable string with time zone information:

```javascript
formatHumanReadable(timestamp: number | string | Date) {
  const date = new Date(timestamp);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${date.toLocaleString()} (${timeZone})`;
}
```

Example output: "3/24/2025, 5:17:40 AM (Asia/Dubai)"

### `getCurrentTime()`

Gets the current time in various formats:

```javascript
getCurrentTime() {
  return formatTimestamps(Date.now());
}
```

### `getTimeDifference(timestamp1, timestamp2)`

Calculates the time difference between two timestamps in a human-readable format:

```javascript
getTimeDifference(timestamp1: number | string | Date, timestamp2?: number | string | Date) {
  const date1 = new Date(timestamp1);
  const date2 = timestamp2 ? new Date(timestamp2) : new Date();
  
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''}`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''}`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  } else {
    return `${diffSec} second${diffSec !== 1 ? 's' : ''}`;
  }
}
```

Example outputs: "2 days", "3 hours", "45 minutes", "30 seconds"

## Usage in MCP Server

The time utilities are used in various handlers in the MCP server to ensure consistent timestamp formatting:

### `handleGetMessagesSince`

```javascript
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        task_id,
        since: formatTimestamps(since),
        message_count: messages.length,
        messages
      }, null, 2),
    },
  ],
};
```

### `handleAnalyzeCloneActivity`

```javascript
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        timestamp: getCurrentTime(),
        workspaceCount: results.length,
        workspaces: results
      }, null, 2),
    },
  ],
};
```

### `handleGetFileHistory`

```javascript
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        isGitRepo: false,
        fileInfo: {
          path: filePath,
          lastModified: formatTimestamps(stats.mtime),
          size: stats.size,
          created: formatTimestamps(stats.birthtime)
        }
      }, null, 2),
    },
  ],
};
```

### `handleAnalyzeConversation`

```javascript
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        task_id,
        time_window: minutes_back ? `last ${minutes_back} minutes` : 'all',
        time_info: minutes_back ? {
          since: formatTimestamps(since),
          now: getCurrentTime()
        } : null,
        analysis
      }, null, 2),
    },
  ],
};
```

## Benefits

1. **Consistent Time Formatting**: All timestamps in the MCP server responses are formatted consistently.
2. **Time Zone Awareness**: All timestamps include time zone information, making it easier for Claude Desktop to interpret and display time information correctly.
3. **Human-Readable Timestamps**: Timestamps are presented in both machine-readable (ISO) and human-readable formats.
4. **Time Difference Calculation**: The `getTimeDifference` function makes it easy to calculate and display time differences in a human-readable format.

## Example Response

Here's an example of how the time utilities enhance the MCP server responses:

```json
{
  "task_id": "1616161616161",
  "since": {
    "utc": "2025-03-23T01:17:40.000Z",
    "local": "Sun Mar 23 2025 05:17:40 GMT+0400 (Gulf Standard Time)",
    "localTime": "5:17:40 AM",
    "localDate": "3/23/2025",
    "timeZoneName": "Asia/Dubai"
  },
  "message_count": 10,
  "messages": [...]
}
```

This enhanced response provides Claude Desktop with all the information it needs to correctly interpret and display time information, regardless of the user's time zone.
