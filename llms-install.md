# mcp-gmail-linkedin – LLM / MCP client setup

Install and configure the fused Gmail + LinkedIn MCP server for use with Claude Desktop, Cursor, or other MCP clients. All tools use camelCase names.

## Requirements

- Node.js 18+ and npm
- Google Cloud project with Gmail API enabled (for Gmail tools)
- Optional: LinkedIn account (for getFeedPosts and searchJobs)

## Installation

1. **Clone or copy the project and install:**

   ```bash
   cd mcp_gmail_linkedin
   npm install --ignore-scripts
   npm run build
   ```

2. **Gmail OAuth setup:**

   - In [Google Cloud Console](https://console.cloud.google.com) create or select a project and enable the Gmail API.
   - Create OAuth 2.0 credentials (Desktop app or Web application).
   - For Web application, add `http://localhost:3000/oauth2callback` to authorized redirect URIs.
   - Download the OAuth client JSON and save it as `gcp-oauth.keys.json`.

   ```bash
   mkdir -p ~/.gmail-mcp
   mv gcp-oauth.keys.json ~/.gmail-mcp/
   ```

3. **Run Gmail auth (one-time):**

   ```bash
   node dist/index.js auth
   ```

   This opens the browser for Google sign-in and writes credentials to `~/.gmail-mcp/credentials.json`.

4. **MCP client configuration (example for Claude Desktop):**

   ```json
   {
     "mcpServers": {
       "gmail-linkedin": {
         "command": "node",
         "args": ["/path/to/mcp_gmail_linkedin/dist/index.js"],
         "env": {
           "LINKEDIN_EMAIL": "your_linkedin_email",
           "LINKEDIN_PASSWORD": "your_linkedin_password"
         }
       }
     }
   }
   ```

   Omit `LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD` if you only use Gmail tools.

## Troubleshooting

- **OAuth / Gmail:** Ensure `gcp-oauth.keys.json` is in `~/.gmail-mcp/` or set `GMAIL_OAUTH_PATH`. After auth, credentials are in `~/.gmail-mcp/credentials.json` (or path in `GMAIL_CREDENTIALS_PATH`).
- **Port 3000:** Must be free during the `auth` step.
- **LinkedIn:** If getFeedPosts or searchJobs fail, check env vars and that the account is in good standing.

## Security

- Keep OAuth and credential files out of version control (see `.gitignore`).
- Do not commit LinkedIn credentials; pass them only via environment variables.

## Tool overview

- **Gmail:** sendEmail, draftEmail, readEmail, searchEmails, modifyEmail, deleteEmail, listEmailLabels, batchModifyEmails, batchDeleteEmails, createLabel, updateLabel, deleteLabel, getOrCreateLabel, createFilter, listFilters, getFilter, deleteFilter, createFilterFromTemplate, downloadAttachment.
- **LinkedIn:** getFeedPosts, searchJobs.

For filter examples, see `filter-examples.md`.
