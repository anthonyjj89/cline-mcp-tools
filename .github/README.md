# GitHub Configuration

This directory contains GitHub-specific configuration files for the Cline Chat Reader MCP server.

## Directory Structure

- `ISSUE_TEMPLATE/`: Templates for GitHub issues
- `workflows/`: GitHub Actions CI/CD workflows

## Issue Templates

Issue templates help standardize the format of issues created in the GitHub repository. They provide a structured way for users to report bugs, request features, or ask questions.

### Creating Issue Templates

To create a new issue template:

1. Create a new Markdown file in the `ISSUE_TEMPLATE` directory
2. Use a descriptive name for the file, e.g., `bug_report.md`, `feature_request.md`
3. Include front matter at the top of the file to configure the template
4. Add the template content

Example front matter:

```yaml
---
name: Bug Report
about: Report a bug in the Cline Chat Reader MCP server
title: '[BUG] '
labels: bug
assignees: ''
---
```

## GitHub Actions Workflows

GitHub Actions workflows automate tasks like testing, building, and deploying the project. They are defined in YAML files in the `workflows` directory.

### Creating Workflows

To create a new workflow:

1. Create a new YAML file in the `workflows` directory
2. Use a descriptive name for the file, e.g., `test.yml`, `build.yml`
3. Define the workflow using the GitHub Actions syntax

Example workflow:

```yaml
name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
```

## Contributing

If you'd like to contribute to the GitHub configuration, please follow these guidelines:

1. Use descriptive names for files
2. Include comments to explain complex workflows
3. Test workflows locally before pushing
4. Keep templates and workflows up-to-date with the project
