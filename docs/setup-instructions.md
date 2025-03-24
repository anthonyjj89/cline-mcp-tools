# Claude Desktop & MCP Server Setup Guide

This guide provides step-by-step instructions for setting up the Cline-Claude Bridge MCP server and configuring Claude Desktop to use it.

## Step 1: Make Scripts Executable

Run the following command to ensure all scripts are executable:

```bash
chmod +x /Users/ant/claude-dev-mcp/make_executable.sh
/Users/ant/claude-dev-mcp/make_executable.sh
```

## Step 2: Run Setup and Cleanup

Execute the setup and cleanup scripts to ensure all dependencies are installed and the environment is clean:

```bash
./setup.sh
```

## Step 3: Test the MCP Server

Run the test script to verify the MCP server is working:

```bash
./test-mcp.sh
```

If you see a health response, the server is working correctly.

## Step 4: Configure Claude Desktop

1. Locate or create the Claude Desktop configuration file:

```bash
mkdir -p ~/Library/Application\ Support/Claude/
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. Open the configuration file in a text editor:

```bash
open -a TextEdit ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

3. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "cline-bridge": {
      "command": "/Users/ant/claude-dev-mcp/mcp-server.js",
      "transport": "stdio"
    }
  }
}
```

Make sure to use the absolute path to the mcp-server.js file.

## Step 5: Restart Claude Desktop

1. Completely close Claude Desktop
2. Reopen Claude Desktop
3. Check for the MCP icon in the Claude Desktop interface

## Step 6: Verify MCP Integration

1. In Claude Desktop, type a query like: "Show me my VS Code conversations"
2. Claude should now be able to access and display your Cline VS Code extension conversations

## Troubleshooting

If you encounter any issues:

1. Check if the MCP server appears in Claude Desktop:
   - Go to Settings > Integrations > MCP Servers
   - Verify that "cline-bridge" is listed and enabled

2. Enable Developer Mode for more detailed logs:
   - In Claude Desktop, go to Help > Enable Developer Mode
   - Then access Developer > Open MCP Log File to see detailed connection logs

3. Run the server manually to see any error messages:
   ```bash
   ./start-mcp.sh
   ```

4. Verify the Cline tasks directory exists:
   ```bash
   ls -la ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks
   ```

5. If all else fails, try reinstalling the MCP server dependencies:
   ```bash
   ./cleanup.sh
   ```

## Additional Information

- The MCP server looks for Cline tasks in: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks`
- You can override this location by setting the `CLINE_TASKS_DIR` environment variable
- For more information, refer to the [README.md](README.md) file
