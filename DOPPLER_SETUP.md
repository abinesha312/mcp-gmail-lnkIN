# Doppler Setup Guide for mcp-gmail-linkedin

This guide explains how to use Doppler (cloud secrets vault) to securely manage credentials for the MCP Gmail+LinkedIn server.

## What is Doppler?

**Doppler is a cloud vault that holds your secrets and injects them as environment variables at runtime.**

- ✅ Secrets never touch your filesystem or codebase
- ✅ Centralized secret management
- ✅ Audit logs of secret access
- ✅ Rotate secrets without redeployment
- ✅ Team collaboration with access controls

## Quick Start

### 1. Install Doppler CLI

```bash
# macOS
brew install dopplerhq/cli/doppler

# Windows (PowerShell)
winget install Doppler.Doppler

# Linux
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | sudo apt-key add -
echo "deb https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
sudo apt-get update && sudo apt-get install doppler
```

### 2. Authenticate Doppler CLI

```bash
doppler login
```

### 3. Create a Doppler Project

```bash
doppler setup --project mcp-gmail-linkedin --config dev
```

### 4. Add Secrets to Doppler

You need to add the following secrets to your Doppler project:

#### Gmail OAuth Keys (JSON)
```bash
# Option A: Upload the entire JSON file content
doppler secrets set GMAIL_OAUTH_KEYS_JSON --project mcp-gmail-linkedin --config dev <<EOF
{
  "installed": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "client_secret": "your-client-secret",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "redirect_uris": ["http://localhost:3000/oauth2callback"]
  }
}
EOF

# Option B: Set individual fields (if you prefer)
doppler secrets set GMAIL_CLIENT_ID="your-client-id" \
  GMAIL_CLIENT_SECRET="your-client-secret" \
  --project mcp-gmail-linkedin --config dev
```

#### Gmail OAuth Credentials (after first auth)
```bash
# After running `npm run auth`, copy the contents of ~/.gmail-mcp/credentials.json
doppler secrets set GMAIL_CREDENTIALS_JSON --project mcp-gmail-linkedin --config dev <<EOF
{
  "access_token": "ya29...",
  "refresh_token": "1//...",
  "scope": "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.settings.basic",
  "token_type": "Bearer",
  "expiry_date": 1234567890
}
EOF
```

#### LinkedIn Credentials
```bash
doppler secrets set LINKEDIN_EMAIL="your-linkedin-email@example.com" \
  LINKEDIN_PASSWORD="your-linkedin-password" \
  --project mcp-gmail-linkedin --config dev
```

### 5. Verify Secrets

```bash
doppler secrets --project mcp-gmail-linkedin --config dev
```

### 6. Test Locally

```bash
# Run with Doppler injecting secrets
doppler run --project mcp-gmail-linkedin --config dev -- node dist/index.js
```

## Smithery Configuration

### Option 1: Using Doppler (Recommended)

In your MCP client configuration (e.g., Cursor's `mcp-config.json`):

```json
{
  "mcpServers": {
    "gmail-linkedin": {
      "command": "doppler",
      "args": [
        "run",
        "--project", "mcp-gmail-linkedin",
        "--config", "dev",
        "--",
        "node",
        "/path/to/mcp_gmail_linkedin/dist/index.js"
      ]
    }
  }
}
```

### Option 2: Using Doppler Service Token

For production/CI environments, use a service token:

```bash
# Create a service token
doppler service-tokens create mcp-gmail-linkedin-token --project mcp-gmail-linkedin --config dev
```

Then in your config:

```json
{
  "mcpServers": {
    "gmail-linkedin": {
      "command": "doppler",
      "args": [
        "run",
        "--token", "dp.st.xxxxx",
        "--",
        "node",
        "/path/to/mcp_gmail_linkedin/dist/index.js"
      ]
    }
  }
}
```

### Option 3: Using Smithery Config (with Doppler)

If using Smithery, update your `smithery.yaml`:

```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      dopplerProject:
        type: string
        description: Doppler project name
      dopplerConfig:
        type: string
        description: Doppler config/environment
  commandFunction: |
    (config) => ({
      command: 'doppler',
      args: [
        'run',
        '--project', config.dopplerProject,
        '--config', config.dopplerConfig || 'dev',
        '--',
        'node',
        'dist/index.js'
      ]
    })
```

## Environment Variables Reference

The application supports these environment variables (injected by Doppler):

| Variable | Description | Required |
|----------|-------------|----------|
| `GMAIL_OAUTH_KEYS_JSON` | Complete OAuth keys JSON as string | Yes (or use file) |
| `GMAIL_CREDENTIALS_JSON` | Complete OAuth credentials JSON as string | No (if not authenticated yet) |
| `LINKEDIN_EMAIL` | LinkedIn account email | Optional |
| `LINKEDIN_PASSWORD` | LinkedIn account password | Optional |

**Note:** If `GMAIL_OAUTH_KEYS_JSON` is not set, the app falls back to file-based configuration using `GMAIL_OAUTH_PATH`.

## First-Time Gmail Authentication

Even with Doppler, you still need to run the initial OAuth flow once:

```bash
# Run auth with Doppler injecting the OAuth keys
doppler run --project mcp-gmail-linkedin --config dev -- node dist/index.js auth

# After authentication, copy the generated credentials.json to Doppler
doppler secrets set GMAIL_CREDENTIALS_JSON="$(cat ~/.gmail-mcp/credentials.json)" \
  --project mcp-gmail-linkedin --config dev
```

## Multiple Environments

Create different configs for different environments:

```bash
# Development
doppler setup --project mcp-gmail-linkedin --config dev

# Production
doppler setup --project mcp-gmail-linkedin --config prod

# Staging
doppler setup --project mcp-gmail-linkedin --config staging
```

Each config can have different credentials or the same ones.

## Security Best Practices

1. **Never commit secrets** - Use `.gitignore` to exclude credential files
2. **Use service tokens** - For CI/CD, use service tokens instead of personal tokens
3. **Rotate secrets regularly** - Update secrets in Doppler dashboard
4. **Limit access** - Use Doppler's access controls to restrict who can read secrets
5. **Audit logs** - Check Doppler dashboard for secret access logs

## Troubleshooting

### "doppler: command not found"
- Install Doppler CLI (see step 1)
- Ensure Doppler is in your PATH

### "Authentication required"
```bash
doppler login
```

### "Project not found"
```bash
doppler setup --project mcp-gmail-linkedin --config dev
```

### "Invalid JSON in GMAIL_OAUTH_KEYS_JSON"
- Ensure the JSON is properly escaped when setting via CLI
- Use `doppler secrets set GMAIL_OAUTH_KEYS_JSON` and paste the JSON directly
- Or use the Doppler dashboard web UI

### Secrets not loading
- Verify secrets exist: `doppler secrets`
- Check project/config: `doppler setup`
- Test injection: `doppler run -- printenv | grep GMAIL`

## Migration from File-Based to Doppler

1. Export existing secrets:
   ```bash
   # Export OAuth keys
   cat ~/.gmail-mcp/gcp-oauth.keys.json
   
   # Export credentials
   cat ~/.gmail-mcp/credentials.json
   ```

2. Add to Doppler (see step 4 above)

3. Update your MCP config to use Doppler (see Smithery Configuration)

4. Test: `doppler run -- node dist/index.js`

5. Remove old files (optional, after confirming everything works):
   ```bash
   rm ~/.gmail-mcp/gcp-oauth.keys.json
   rm ~/.gmail-mcp/credentials.json
   ```

## Additional Resources

- [Doppler Documentation](https://docs.doppler.com/)
- [Doppler CLI Reference](https://docs.doppler.com/docs/cli)
- [Doppler Dashboard](https://dashboard.doppler.com/)
