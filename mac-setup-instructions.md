# Claude Task Reader MCP Server - macOS Setup Guide

## Step 1: Clone the GitHub Repository

The repository is already set up at https://github.com/anthonyjj89/Claude-Task-Reader.git

## Step 2: Clone on macOS

1. Open Terminal
2. Navigate to where you want to place the project (e.g., ~/Projects)
3. Clone the repository:
   ```bash
   git clone https://github.com/anthonyjj89/Claude-Task-Reader.git
   cd Claude-Task-Reader
   ```

## Step 3: Build and Configure on macOS

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Configure Claude Desktop on macOS:
   - Open Claude Desktop
   - Go to Settings > Developer
   - Click "Edit Config"
   - Add the following to the configuration file (update path to match your installation directory):
   ```json
   {
     "mcpServers": {
       "claude-task-reader": {
         "command": "node",
         "args": [
           "/Users/YOUR-USERNAME/Projects/Claude-Task-Reader/build/index.js"
         ],
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

   For example, if you cloned to ~/Projects and your macOS username is "anthony", the path would be:
   ```
   /Users/anthony/Projects/Claude-Task-Reader/build/index.js
   ```

The Claude Desktop config file is located at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

You can edit it directly with:
```
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## Step 4: Testing

1. Restart Claude Desktop
2. Try asking Claude about your VS Code conversations:
   - "Show me my recent VS Code conversations"
   - "Search for discussions about [topic] in my VS Code sessions"
