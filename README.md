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

### LinkedIn (no OAuth – use a local env file)

LinkedIn tools use the same config directory as Gmail. **Do not put your LinkedIn password in the MCP config or in the shell.** Use a local env file instead:

1. Create the config directory if needed: `mkdir -p ~/.gmail-mcp` (or `%USERPROFILE%\.gmail-mcp` on Windows).
2. Create a file named **`linkedin.env`** inside it with:
   ```
   LINKEDIN_EMAIL=your_email@example.com
   LINKEDIN_PASSWORD=your_password
   ```
3. The server will load these when it starts. You can run the server **without** setting `LINKEDIN_EMAIL` or `LINKEDIN_PASSWORD` in your MCP config or in the shell.

Optional: set `LINKEDIN_ENV_FILE` to the full path of a different env file, or set `MCP_GMAIL_LINKEDIN_CONFIG_DIR` to a different config directory (default is `~/.gmail-mcp`).

**Why not OAuth?** LinkedIn’s official OAuth does not expose the same feed and job-search APIs this server uses. The current implementation relies on the unofficial API with email/password; the env file keeps credentials off the command line and out of your MCP JSON.

**I use “Sign in with Google” on LinkedIn.** That is only for the LinkedIn website. This server cannot use that flow; it needs a **LinkedIn account email + LinkedIn account password** (the same you’d use if you chose “Sign in with email” on linkedin.com). If you only ever use “Sign in with Google”, you likely never set a LinkedIn password. To use the LinkedIn tools here: go to [LinkedIn → Account → Sign in & security](https://www.linkedin.com/mypreferences/d/security) and **add or change your LinkedIn password**. Then in `linkedin.env` use your LinkedIn email (often your Gmail address) and that **LinkedIn password** — not your Google password.

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop or Cursor). **You do not need to pass LinkedIn credentials here** if you use `linkedin.env`:

```json
{
  "mcpServers": {
    "gmail-linkedin": {
      "command": "node",
      "args": ["path/to/mcp_gmail_linkedin/dist/index.js"]
    }
  }
}
```

Optional environment variables:
- `GMAIL_OAUTH_PATH` - Path to `gcp-oauth.keys.json` (fallback if `GMAIL_OAUTH_KEYS_JSON` not set)
- `GMAIL_OAUTH_KEYS_JSON` - Complete OAuth keys JSON as string (Doppler-friendly)
- `GMAIL_CREDENTIALS_PATH` - Path to stored Gmail credentials (fallback if `GMAIL_CREDENTIALS_JSON` not set)
- `GMAIL_CREDENTIALS_JSON` - Complete OAuth credentials JSON as string (Doppler-friendly)
- `MCP_GMAIL_LINKEDIN_CONFIG_DIR` - Config directory (default: `~/.gmail-mcp`)
- `LINKEDIN_ENV_FILE` - Path to LinkedIn env file (default: `{configDir}/linkedin.env`)
- `LINKEDIN_EMAIL` - LinkedIn email (can be set via env or Doppler)
- `LINKEDIN_PASSWORD` - LinkedIn password (can be set via env or Doppler)

**Note:** The application prioritizes JSON environment variables (Doppler) over file paths. If `GMAIL_OAUTH_KEYS_JSON` is set, it will be used instead of reading from `GMAIL_OAUTH_PATH`.

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
