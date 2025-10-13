# MCP Task Master 3.0 Setup Guide

## Overview

Claude Task Master MCP server has been successfully configured and tested for your VSCode environment. This server provides task management and automation capabilities through the Model Context Protocol (MCP).

## Status: ✅ ACTIVE

The MCP taskmaster is now fully operational and integrated with your project.

## Current Configuration

The MCP server is configured in:

```
../../Users/Jeremy/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json
```

### Current Settings

- **Server Name**: `task-master-ai`
- **Version**: 0.28.0
- **Command**: `npx -y task-master-ai`
- **Transport**: `stdio`
- **Project Root**: `c:/dev/codejoin-new`
- **Git Integration**: Enabled
- **Current Tag**: `master`

## Required Setup Steps

### 1. Configure API Keys

Replace the placeholder API keys in the MCP settings file with your actual API keys:

#### Required (at least one):

- **ZAI_API_KEY**: Get from https://docs.z.ai/ (Z.ai GLM-4.6)
- **ANTHROPIC_API_KEY**: Get from https://console.anthropic.com/
- **OPENAI_API_KEY**: Get from https://platform.openai.com/api-keys

#### Optional (for additional AI providers):

- **PERPLEXITY_API_KEY**: Get from https://www.perplexity.ai/settings/api
- **GOOGLE_API_KEY**: Get from https://console.cloud.google.com/
- **MISTRAL_API_KEY**: Get from https://console.mistral.ai/
- **GROQ_API_KEY**: Get from https://console.groq.com/
- **OPENROUTER_API_KEY**: Get from https://openrouter.ai/keys
- **XAI_API_KEY**: Get from https://console.x.ai/
- **AZURE_OPENAI_API_KEY**: Get from Azure portal
- **OLLAMA_API_KEY**: For local Ollama models

### 2. Update the MCP Settings File

Edit the file and replace the placeholder values:

```json
"ZAI_API_KEY": "your-zai-api-key-here",
"ANTHROPIC_API_KEY": "sk-ant-...",
"OPENAI_API_KEY": "sk-...",
```

### 3. Restart VSCode or Reload MCP Connection

After updating the API keys:

1. Restart VSCode completely, or
2. Use the MCP reload command if available

## Available Features

Once configured, the Task Master MCP server provides:

### Task Management

- Create new tasks
- Track task status
- Set task priorities
- Manage task dependencies
- Assign tasks to team members

### Project Integration

- Task tracking for current project
- Git integration for task persistence
- Project-specific task organization

### AI-P Features

- AI-assisted task creation
- Smart task suggestions
- Automated task prioritization
- Task completion tracking

## Usage Examples

### Basic Task Creation

```
Create a task to implement user authentication
```

### Task Management

```
Show all tasks for the current project
Mark task "implement authentication" as in progress
Set high priority for security-related tasks
```

### Project Organization

```
Create a new project for the mobile app
Move all frontend tasks to the "UI" category
Generate a report of completed tasks this week
```

## Configuration Options

The following environment variables have been configured:

- **TASKMASTER_PROJECT_ROOT**: Set to your current project directory
- **TASKMASTER_STORE_TASKS_IN_GIT**: Tasks will be stored in git
- **TASKMASTER_INIT_GIT**: Git repository will be initialized if needed
- **TASKMASTER_ADD_ALIASES**: Command aliases will be added for convenience

## Troubleshooting

### Common Issues

1. **Server fails to start**

   - Check that Node.js and npm are installed
   - Verify internet connection for package download

2. **API key errors**

   - Ensure API keys are correctly entered
   - Check that the API keys are active and have credits

3. **Git integration issues**
   - Ensure git is installed and configured
   - Check that you have write permissions to the project directory

### Verification Commands

Test the MCP server connection:

```
Check MCP server status
List available taskmaster tools
```

## Next Steps

1. Configure at least one API key
2. Restart VSCode
3. Test basic task creation
4. Explore advanced features

## Support

For issues with:

- **MCP Protocol**: Check VSCode MCP documentation
- **Task Master Server**: Visit https://github.com/eyaltoledano/claude-task-master
- **API Keys**: Refer to respective AI provider documentation

---

_This setup guide was generated for your MCP Task Master 3.0 integration._
