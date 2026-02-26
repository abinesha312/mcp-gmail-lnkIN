# MCP Gmail + LinkedIn

A fused Model Context Protocol (MCP) server that combines Gmail and LinkedIn functionality into a single server. All tool names use camelCase convention.

## Features

### Gmail
- **sendEmail** - Send emails with attachments, HTML, and multipart support
- **draftEmail** - Create email drafts
- **readEmail** - Read email content with attachment details
- **searchEmails** - Search emails using Gmail query syntax
- **modifyEmail** - Modify email labels (move, archive, etc.)
- **deleteEmail** - Permanently delete emails
- **listEmailLabels** - List all Gmail labels
- **batchModifyEmails** - Batch modify labels on multiple emails
- **batchDeleteEmails** - Batch delete multiple emails
- **createLabel** - Create a new Gmail label
- **updateLabel** - Update an existing label
- **deleteLabel** - Delete a label
- **getOrCreateLabel** - Get or create a label by name
- **createFilter** - Create a Gmail filter
- **listFilters** - List all filters
- **getFilter** - Get filter details
- **deleteFilter** - Delete a filter
- **createFilterFromTemplate** - Create filter from pre-defined templates
- **downloadAttachment** - Download email attachments

### LinkedIn
- **getFeedPosts** - Retrieve LinkedIn feed posts
- **searchJobs** - Search for jobs on LinkedIn

## Installation

```bash
cd mcp_gmail_linkedin
npm install --ignore-scripts
npm run build
```

The project uses `tsup` (esbuild-based) for fast TypeScript compilation.

## Authentication

### Gmail OAuth Setup

1. Create a Google Cloud Project and enable the Gmail API
2. Create OAuth 2.0 credentials (Desktop or Web application)
3. Download the JSON file and rename it to `gcp-oauth.keys.json`
4. Place it in `~/.gmail-mcp/` or your current directory

Run authentication:
```bash
npm run auth
```

### LinkedIn Setup

Set the following environment variables:
- `LINKEDIN_EMAIL` - Your LinkedIn email address
- `LINKEDIN_PASSWORD` - Your LinkedIn password

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "gmail-linkedin": {
      "command": "node",
      "args": ["path/to/mcp_gmail_linkedin/dist/index.js"],
      "env": {
        "LINKEDIN_EMAIL": "your_linkedin_email",
        "LINKEDIN_PASSWORD": "your_linkedin_password"
      }
    }
  }
}
```

You can also set Gmail OAuth paths via environment variables:
- `GMAIL_OAUTH_PATH` - Path to `gcp-oauth.keys.json`
- `GMAIL_CREDENTIALS_PATH` - Path to stored credentials

## Sample Usage

### Get LinkedIn Feed Posts
```
Tool Calls:
  getFeedPosts
  Args:
    limit: 10
```

### Search LinkedIn Jobs
```
Tool Calls:
  searchJobs
  Args:
    keywords: data engineer
    location: Jakarta
    limit: 3
```

### Send an Email
```json
{
  "to": ["recipient@example.com"],
  "subject": "Hello from MCP",
  "body": "This email was sent via the fused Gmail+LinkedIn MCP server."
}
```

### Search Emails
```json
{
  "query": "from:sender@example.com after:2024/01/01",
  "maxResults": 10
}
```

### Create a Filter from Template
```json
{
  "template": "fromSender",
  "parameters": {
    "senderEmail": "notifications@github.com",
    "labelIds": ["Label_GitHub"],
    "archive": true
  }
}
```

## Project Structure

```
mcp_gmail_linkedin/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts            # Main MCP server (Gmail + LinkedIn tools)
    ├── emailUtils.ts       # Email creation utilities
    ├── labelManager.ts     # Gmail label management
    ├── filterManager.ts    # Gmail filter management
    └── linkedinClient.ts   # LinkedIn client (auth, feed, jobs)
```

## File Naming Convention

All files use camelCase naming:
| Original (Gmail Server)   | Fused Server         |
|---------------------------|----------------------|
| `index.ts`                | `index.ts`           |
| `utl.ts`                  | `emailUtils.ts`      |
| `label-manager.ts`        | `labelManager.ts`    |
| `filter-manager.ts`       | `filterManager.ts`   |
| *(new)*                   | `linkedinClient.ts`  |

## Tool Naming Convention

All tool names use camelCase:
| Original (Gmail Server)       | Fused Server              |
|-------------------------------|---------------------------|
| `send_email`                  | `sendEmail`               |
| `draft_email`                 | `draftEmail`              |
| `read_email`                  | `readEmail`               |
| `search_emails`              | `searchEmails`            |
| `modify_email`               | `modifyEmail`             |
| `delete_email`               | `deleteEmail`             |
| `list_email_labels`          | `listEmailLabels`         |
| `batch_modify_emails`        | `batchModifyEmails`       |
| `batch_delete_emails`        | `batchDeleteEmails`       |
| `create_label`               | `createLabel`             |
| `update_label`               | `updateLabel`             |
| `delete_label`               | `deleteLabel`             |
| `get_or_create_label`        | `getOrCreateLabel`        |
| `create_filter`              | `createFilter`            |
| `list_filters`               | `listFilters`             |
| `get_filter`                 | `getFilter`               |
| `delete_filter`              | `deleteFilter`            |
| `create_filter_from_template`| `createFilterFromTemplate` |
| `download_attachment`        | `downloadAttachment`      |
| *(from LinkedIn)*            | `getFeedPosts`            |
| *(from LinkedIn)*            | `searchJobs`              |

## Security Notes

- Gmail OAuth credentials are stored in `~/.gmail-mcp/`
- LinkedIn credentials are passed via environment variables
- Never commit credentials to version control
- The server uses offline access for persistent Gmail authentication

## License

MIT
