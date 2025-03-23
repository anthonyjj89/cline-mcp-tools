#!/bin/bash

# Install dependencies for the Claude Task Reader MCP server

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}Claude Task Reader MCP Server - Dependency Installer${NC}\n"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Change to the script directory
cd "$(dirname "$0")"

echo -e "${BLUE}Installing dependencies...${NC}"

# Install dependencies
npm install @modelcontextprotocol/sdk stream-json stream-chain zod

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Dependencies installed successfully!${NC}"
    echo -e "${BLUE}The following packages were installed:${NC}"
    echo -e "  - @modelcontextprotocol/sdk"
    echo -e "  - stream-json"
    echo -e "  - stream-chain"
    echo -e "  - zod"
    
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo -e "1. Make sure Claude Desktop is configured correctly"
    echo -e "2. Restart Claude Desktop"
    echo -e "3. Run the verification script to check if everything is working:"
    echo -e "   ${BOLD}node /Users/ant/claude-dev-mcp/verify-mcp-server.js${NC}"
else
    echo -e "\n${RED}Error: Failed to install dependencies.${NC}"
    echo -e "${YELLOW}Please try again or install the dependencies manually:${NC}"
    echo -e "  npm install @modelcontextprotocol/sdk stream-json stream-chain zod"
fi
