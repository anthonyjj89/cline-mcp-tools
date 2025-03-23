# Claude Task Reader MCP Server - Product Context

## Why This Project Exists

The Claude Task Reader MCP Server bridges an important gap between the Claude Desktop application and the Claude Dev VS Code extension. Currently, these two tools operate in isolation - VS Code conversations aren't accessible to Claude Desktop, limiting the assistant's contextual awareness when users switch between the two interfaces.

This project solves several key problems:

1. **Contextual Isolation**: Without this server, Claude Desktop has no awareness of coding discussions that happened in VS Code.
2. **Knowledge Transfer**: Users often need to manually copy/paste or explain previous VS Code conversations to Claude Desktop.
3. **Large File Processing**: The VS Code extension stores conversation JSON files that can be 2-3MB or larger, which requires efficient processing.

## How It Should Work

The server operates as a bridge using the following workflow:

1. **File Discovery**: The server locates and accesses the local conversation files created by the VS Code extension.
2. **Memory-Efficient Processing**: For large JSON files (2-3MB+), the server uses streaming techniques to process them without loading entire files into memory.
3. **MCP Interface**: The server exposes capabilities to Claude Desktop via the Model Context Protocol (MCP).
4. **Intelligent Filtering**: The server provides tools to extract relevant portions of conversations rather than sending entire files.

## Use Cases

### Primary Use Case: Context Continuity

A developer works on code with the Claude Dev VS Code extension, then switches to Claude Desktop for broader discussions. Claude Desktop can now reference and build upon the VS Code discussions, with the user able to ask questions like:

- "What were the key architecture decisions we made in our last coding session?"
- "Can you summarize our discussion about the authentication module?"
- "Find all discussions related to the database schema from our VS Code sessions."

### Secondary Use Case: AI Evaluation

AI researchers and engineers can use the server to analyze conversations between users and the VS Code extension, identifying patterns, common issues, or areas for improvement in the AI's performance.

## Design Principles

1. **Efficiency First**: All operations must be optimized for large file sizes (2-3MB+).
2. **Privacy Focused**: All data processing happens locally, and the server is not exposed to the internet.
3. **Streamlined Interface**: Provide focused, useful tools rather than generic data access.
4. **Cross-Platform**: Support Windows, macOS, and Linux operating systems.
