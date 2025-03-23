# Claude Task Reader MCP Server - Project Brief

The Claude Task Reader MCP Server is a custom server designed to enable communication between Claude Desktop and the Claude Dev VS Code extension. It provides a way for Claude Desktop to access, read, and analyze conversations that occur between users and the VS Code extension, which are stored as JSON files on the local system.

The server exposes an MCP (Model Context Protocol) interface for Claude Desktop to query conversation data with various filtering capabilities to handle large conversation histories (2-3MB+) efficiently. This project is a fork of the JSON-MCP-Server repository, modified to target local VS Code extension conversation files instead of URLs.

## Core Functionality

1. Access and read JSON conversation files stored by the Claude Dev VS Code extension
2. Expose an MCP interface for querying conversation data
3. Provide memory-efficient filtering capabilities to handle large conversation histories
4. Implement tools for Claude Desktop to extract useful information from conversations

## Key Features

1. Task Listing: View a list of all conversation tasks
2. Conversation History: View the detailed conversation history for a specific task
3. Message Filtering: Filter conversation history by number of messages, timestamp, or content
4. UI Message Access: View UI-related messages for a specific task
5. Code Discussion Finding: Identify discussions about code snippets or files
6. Conversation Searching: Search across multiple conversations for specific terms

## Target Users

1. Developers using both Claude Desktop and the Claude Dev VS Code extension who want Claude Desktop to be aware of their VS Code conversations for more context-aware assistance.
2. AI engineers and researchers who want to analyze or review the conversations between users and the VS Code extension for evaluation or improvement purposes.
