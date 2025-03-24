#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

# Make all scripts executable
chmod +x *.sh
chmod +x mcp-server.js

# Run cleanup script
./cleanup.sh

echo "Setup complete. Run ./start-mcp.sh to start the MCP server."
