# Gmail MCP

[![npm version](https://badge.fury.io/js/@shinzolabs%2Fgmail-mcp.svg)](https://badge.fury.io/js/@shinzolabs%2Fgmail-mcp)
[![smithery badge](https://smithery.ai/badge/@shinzo-labs/gmail-mcp)](https://smithery.ai/server/@shinzo-labs/gmail-mcp)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) implementation for the [Gmail](https://developers.google.com/gmail/api) API, providing a standardized interface for email management, sending, and retrieval.

## Features

- Create draft messages with support for CC and BCC recipients
- Base64 encoding of email content following Gmail API requirements
- Secure OAuth2 authentication using your Google Cloud credentials
- RESTful API integration with Gmail's draft endpoints

## Installation

To use this MCP, you'll need to set up authentication with Gmail:

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Gmail API for your project
4. Go to Credentials and create an OAuth 2.0 Client ID
5. Download the client credentials and note your CLIENT_ID and CLIENT_SECRET

### NPX (Recommended)

Add the following to your `claude_desktop_config.json`:
```javascript
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": [
        "@shinzolabs/gmail-mcp"
      ],
      "env": {
        "CLIENT_ID": "your-client-id-here",
        "CLIENT_SECRET": "your-client-secret-here"
      }
    }
  }
}
```

### Manual Download

1. Download the repo:
```bash
git clone https://github.com/shinzo-labs/gmail-mcp.git
```

2. Install packages (inside cloned repo):
```bash
pnpm i
```

3. Add the following to your `claude_desktop_config.json`:
```javascript
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": [
        "/path/to/gmail-mcp/index.js"
      ],
      "env": {
        "API_KEY": "your-key-here"
      }
    }
  }
}
```

### Smithery

To install for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@shinzo-labs/gmail-mcp):

```bash
npx -y @smithery/cli install @shinzo-labs/gmail-mcp --client claude
```

## Supported Endpoints

### draft_message

Creates a draft email message in Gmail.

Parameters:
- `to`: Email address of the recipient
- `subject`: Subject of the email
- `body`: Body content of the email
- `cc` (optional): CC recipients (comma-separated email addresses)
- `bcc` (optional): BCC recipients (comma-separated email addresses)

Example usage:
```javascript
{
  "to": "recipient@example.com",
  "subject": "Hello from Gmail MCP",
  "body": "This is a draft message.",
  "cc": "cc1@example.com, cc2@example.com"
}
```

## Contributing

Contributions are welcomed and encouraged. Contact austin@shinzolabs.com with any questions, comments or concerns.
