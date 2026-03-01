# MCP Unified - Complete Guide

**80+ tools across 12 services in one MCP server. Web dashboard to manage all credentials.**

**Services**: Gmail · LinkedIn · Drive · Calendar · YouTube · Notion · Telegram · WhatsApp · Discord · Slack · Twitch · GitHub

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Security & Privacy](#security--privacy)
4. [Rate Limiting](#rate-limiting)
5. [Docker Setup](#docker-setup)
6. [Service Setup Guides](#service-setup-guides)
   - [Google Services](#google-services)
   - [LinkedIn](#linkedin)
   - [Discord](#discord)
   - [Slack](#slack)
   - [Twitch](#twitch)
   - [GitHub](#github)
   - [Other Services](#other-services)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Testing](#testing)
9. [Theme Switching](#theme-switching)
10. [Troubleshooting](#troubleshooting)
11. [Workflow & Rate Limiting Behavior](#workflow--rate-limiting-behavior)

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Quick start script (Linux/Mac)
chmod +x docker-start.sh
./docker-start.sh

# Quick start script (Windows PowerShell)
.\docker-start.ps1

# Or manually
docker-compose up -d
```

**Access:**
- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3001

### Option 2: Local Development

```bash
npm install
npm run dev              # Starts both API and dashboard
# Or separately:
npm run dev:api          # Express API on :3001
npm run dev:dashboard     # React dashboard on :5173
```

---

## Architecture

```
src/index.ts          ← THE MCP SERVER (all 80+ tools registered here)
src/credentialStore.ts← AES-256-GCM encrypted SQLite
src/api.ts            ← Express REST API (dashboard backend, :3001)
src/emailUtils.ts     ← Gmail send/read/search tools
src/linkedinClient.ts ← LinkedIn tools
src/googleDriveClient.ts ← Google Drive tools
src/googleCalClient.ts   ← Google Calendar tools
src/youtubeClient.ts     ← YouTube tools
src/notionClient.ts      ← Notion tools
src/telegramClient.ts    ← Telegram tools
src/whatsappClient.ts    ← WhatsApp tools
src/discordClient.ts     ← Discord REST API client
src/slackClient.ts       ← Slack Web API client
src/twitchClient.ts      ← Twitch Helix API client
src/githubClient.ts      ← GitHub REST API client
src/auth/googleAuth.ts   ← Google OAuth CLI helper
src/auth/outlookAuth.ts  ← Outlook OAuth CLI helper
dashboard/               ← React web UI (:5173)
```

### Request Flow

```
Dashboard (React/Vite)
    ↓ HTTP Request
Nginx (Port 80/5173)
    ↓ Proxy /api → API Container
Express API (Port 3001)
    ├─ Rate Limit Check
    ├─ Request Validation
    ├─ Credential Retrieval (Decrypt)
    ├─ External API Call
    └─ Response (Mask credentials, Add headers)
```

---

## Security & Privacy

### 🔒 Credential Protection

**Your credentials are NEVER exposed to LLM agents or external services.**

#### Encryption at Rest

- **Algorithm**: AES-256-GCM (military-grade encryption)
- **Master Key**: 32-byte random key stored in `.master.key` (file permissions: `0o600`)
- **Storage**: Encrypted SQLite database (`credentials.db`)
- **Location**: `./data/` directory (or `~/.mcp-unified/` in local mode)

#### What Gets Encrypted

✅ **All service credentials**:
- API keys (Google, Notion, Telegram, etc.)
- Client secrets
- OAuth tokens (access tokens, refresh tokens)
- Passwords (LinkedIn, etc.)
- Auth tokens

#### What Stays Local

🔐 **Credentials NEVER leave your machine**:
- ❌ Not sent to LLM providers (OpenAI, Anthropic, etc.)
- ❌ Not sent to external APIs (except when you explicitly invoke tools)
- ❌ Not logged in plaintext
- ❌ Not exposed in API responses (masked as `••••XXXX`)
- ✅ Only decrypted in-memory when needed for API calls

### Master Key Management

#### Auto-Generated Key (Default)

If `MASTER_SECRET` is not set:
- Generates random 32-byte key on first run
- Stores in `./data/.master.key` with `0o600` permissions
- **Backup this file!** Without it, you cannot decrypt credentials

#### Custom Master Secret

Set `MASTER_SECRET` environment variable:
```bash
# In .env file or docker-compose.yml
MASTER_SECRET=your-strong-random-secret-key-here
```

**⚠️ Important**: 
- Use a strong, random secret (32+ characters)
- Store securely (password manager)
- If lost, you cannot decrypt existing credentials

### API Security

#### Credential Masking

API endpoints mask secrets in responses:
- Full secrets: `sk_live_abc123xyz`
- Masked response: `••••xyz`

#### File Permissions

```bash
# Data directory
chmod 700 ./data

# Master key file
chmod 600 ./data/.master.key

# Database file
chmod 600 ./data/credentials.db
```

### What LLM Agents Can See

#### ✅ LLM Agents CAN See:
- Tool names and descriptions
- Tool parameters (input fields)
- Tool results (output data)
- Error messages (without credentials)
- Service configuration status (configured/not configured)

#### ❌ LLM Agents CANNOT See:
- Plaintext credentials
- Master encryption key
- Decrypted tokens
- Passwords
- API keys
- OAuth tokens

### Security Best Practices

1. **Backup Your Data**
   ```bash
   tar -czf mcp-unified-backup-$(date +%Y%m%d).tar.gz data/
   ```

2. **Protect Master Key**
   - Never commit `.master.key` to git (already in `.gitignore`)
   - Never share `.master.key` file
   - Backup securely if using auto-generated key
   - Use strong secret if setting `MASTER_SECRET`

3. **Secure Data Directory**
   ```bash
   chmod 700 ./data
   ```

4. **Network Security**
   - Local Development: Only accessible on `localhost`
   - Production: Use HTTPS reverse proxy (Nginx, Traefik)
   - Firewall: Restrict access to necessary ports only

### If Compromised

#### If Master Key is Exposed:

1. **Immediately rotate all credentials**:
   - Change API keys
   - Revoke OAuth tokens
   - Update passwords

2. **Generate new master key**:
   ```bash
   docker-compose down
   mv ./data ./data.backup
   docker-compose up -d  # Generates new key
   # Re-configure all services
   ```

---

## Rate Limiting

### Overview

MCP Unified implements multi-tier rate limiting to protect the API from abuse and ensure fair usage. Rate limits are applied per IP address and vary by endpoint type.

### Rate Limit Tiers

#### 1. General API Rate Limit
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: All `/api/*` endpoints (except tool invocations)
- **Purpose**: Prevent general API abuse
- **Configurable**: `RATE_LIMIT_GENERAL` environment variable

**Endpoints affected:**
- `GET /api/services` - List services
- `GET /api/services/:id` - Get service details
- `POST /api/services/:id` - Save credentials
- `DELETE /api/services/:id` - Delete service

#### 2. Tool Invocation Rate Limit
- **Limit**: 30 requests per minute per IP
- **Applies to**: `POST /api/tools/invoke`
- **Purpose**: Prevent rapid tool invocation abuse
- **Configurable**: `RATE_LIMIT_TOOLS` environment variable

**Why stricter?**
- Tool invocations make external API calls (Google, LinkedIn, etc.)
- Prevents hitting external API rate limits
- Protects against accidental loops or abuse

#### 3. OAuth Rate Limit
- **Limit**: 10 requests per 15 minutes per IP
- **Applies to**: `/auth/*` endpoints
- **Purpose**: Prevent OAuth flow abuse
- **Configurable**: `RATE_LIMIT_OAUTH` environment variable

### Rate Limit Headers

All rate-limited endpoints return standard rate limit headers:

```
RateLimit-Limit: 30
RateLimit-Remaining: 15
RateLimit-Reset: 1640995200
```

- **RateLimit-Limit**: Maximum number of requests allowed
- **RateLimit-Remaining**: Number of requests remaining in current window
- **RateLimit-Reset**: Unix timestamp when the rate limit resets

### Error Response

When rate limit is exceeded, you'll receive:

```json
{
  "error": "Too many tool invocations. Limit: 30 per minute. Please slow down and try again in a moment.",
  "retryAfter": "1 minute",
  "limit": 30,
  "window": "1 minute"
}
```

HTTP Status Code: `429 Too Many Requests`

### Configuration

Set these in your `.env` file or `docker-compose.yml`:

```env
# General API rate limit (requests per 15 minutes)
RATE_LIMIT_GENERAL=100

# Tool invocation rate limit (requests per minute)
RATE_LIMIT_TOOLS=30

# OAuth rate limit (requests per 15 minutes)
RATE_LIMIT_OAUTH=10
```

### How Rate Limiting Works

#### Per-IP Rate Limiting

- **Same IP = Shared Limit**: Multiple apps/clients from the same IP share the same rate limit
- **Different IPs = Separate Limits**: Each IP address has its own independent rate limit counter

#### Rate Limit Windows

Rate limits use **sliding windows**:
- **Tool Invocations**: 30 requests per **1 minute** (rolling window)
- **General API**: 100 requests per **15 minutes** (rolling window)
- **OAuth**: 10 requests per **15 minutes** (rolling window)

**Important**: The window **resets automatically** after the time period expires.

### Common Scenarios

#### Scenario 1: Multiple Apps from Same IP

**Problem**: Dashboard + External app both calling from `localhost`

**What Happens**:
- Both apps share the same rate limit (30/min)
- If dashboard uses 20 requests, external app only has 10 left
- If total exceeds 30, both get rate limited

**Solutions**:
1. Increase limit (see Configuration below)
2. Use different IPs (if possible)
3. Implement per-app rate limiting (advanced)

#### Scenario 2: Rapid Testing

**Problem**: Testing tools quickly in Tool Tester

**What Happens**:
- Each tool invocation counts toward limit
- After 30 requests in 1 minute, you get rate limited
- Must wait 1 minute for reset

**Solutions**:
1. Wait 1 minute - Limit resets automatically
2. Increase limit for development
3. Space out requests

### How to Fix Rate Limiting Issues

#### Solution 1: Increase Limits (Quick Fix)

**For Development**:
```env
RATE_LIMIT_TOOLS=100      # Increase from 30 to 100
RATE_LIMIT_GENERAL=500    # Increase from 100 to 500
RATE_LIMIT_OAUTH=50       # Increase from 10 to 50
```

**For Production**:
```env
RATE_LIMIT_TOOLS=60       # 1 request per second
RATE_LIMIT_GENERAL=200    # More headroom
RATE_LIMIT_OAUTH=20       # More OAuth attempts
```

**Restart API server** after changing limits.

#### Solution 2: Handle Rate Limits in Code

**Frontend (Dashboard/Tool Tester)**:
```typescript
async function invokeToolWithRetry(tool: string, args: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, args })
      });
      
      // Check rate limit headers
      const remaining = parseInt(response.headers.get('RateLimit-Remaining') || '0');
      const resetTime = parseInt(response.headers.get('RateLimit-Reset') || '0');
      
      if (response.status === 429) {
        const data = await response.json();
        const waitTime = resetTime > 0 
          ? Math.max(0, resetTime * 1000 - Date.now())
          : 60000; // Default 1 minute
        
        if (i < maxRetries - 1) {
          console.log(`Rate limited. Waiting ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(data.error || 'Rate limit exceeded');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

**Note**: Tool Tester now has automatic retry logic built-in for 429 errors.

#### Solution 3: Monitor Rate Limit Headers

```typescript
const response = await fetch('/api/tools/invoke', {...});
const remaining = parseInt(response.headers.get('RateLimit-Remaining') || '0');

if (remaining < 5) {
  console.warn('Rate limit low, slowing down requests');
  // Slow down or wait
}
```

### External API Rate Limit Handling

#### LinkedIn
- **Automatic retry**: Exponential backoff (5s, 10s, 20s)
- **Error handling**: Clear error messages with solutions

#### Google APIs
- **Quota limits**: Managed by Google Cloud Console
- **Error handling**: Returns clear quota exceeded errors
- **Solution**: Enable APIs, check quotas in Google Cloud Console

### Best Practices

1. **Monitor Rate Limit Headers**: Check `RateLimit-Remaining` to avoid limits
2. **Implement Exponential Backoff**: When you get 429 errors
3. **Batch Operations**: Group multiple operations when possible
4. **Cache Results**: Store results locally to avoid repeated requests

### FAQ

**Q: Will rate limiting block connections from different apps?**

**A**: Yes, if they're from the **same IP address**.
- Same IP (e.g., `localhost`): All apps share the same limit
- Different IPs: Each IP has its own independent limit

**Q: If I call the endpoint multiple times, will it block my requests?**

**A**: Yes, **temporarily**.
1. Make 30 requests in 1 minute ✅ All succeed
2. Make 31st request ❌ **429 error** (rate limited)
3. Wait 1 minute ✅ **Automatically works again**

**Q: Will it work again later?**

**A**: Yes! **Automatically**.
- Rate limits reset **automatically** after the time window
- Tool invocations: Resets every **1 minute**
- General API: Resets every **15 minutes**
- OAuth: Resets every **15 minutes**

---

## Docker Setup

### Quick Start

#### Prerequisites
- Docker and Docker Compose installed
- Ports 3001 and 5173 available (or modify in docker-compose.yml)

#### Option 1: Quick Start Script

**Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

**Windows (PowerShell):**
```powershell
.\docker-start.ps1
```

#### Option 2: Manual Setup

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 3: Using Makefile

```bash
make build    # Build images
make up       # Start containers
make logs     # View logs
make down     # Stop containers
```

### Architecture

The application runs in two containers:

1. **API Container** (`mcp-unified-api`)
   - Runs the Express API server
   - Handles tool invocations
   - Manages OAuth flows
   - Stores encrypted credentials

2. **Dashboard Container** (`mcp-unified-dashboard`)
   - Serves the React dashboard (built with Vite)
   - Proxies API requests to the API container
   - Uses Nginx for production serving

### Data Persistence

Credentials are stored in `./data` directory (mounted as volume):
- `credentials.db` - Encrypted SQLite database (AES-256-GCM)
- `.master.key` - Master encryption key (file permissions: 0o600)

**Important**: 
- ✅ Backup the `data/` directory! It contains all your encrypted credentials.
- ✅ **Credentials are NEVER exposed to LLM agents**
- ✅ Data directory is excluded from Docker images (mounted as volume only)
- ✅ All credentials encrypted at rest with AES-256-GCM

### Environment Variables

You can set environment variables in `docker-compose.yml` or create a `.env` file:

```env
MASTER_SECRET=your-secret-key-here
API_PORT=3001
MCP_DATA_DIR=/app/data

# Rate Limiting (requests per window)
RATE_LIMIT_GENERAL=100    # General API: 100 requests per 15 minutes
RATE_LIMIT_TOOLS=30       # Tool invocations: 30 requests per minute
RATE_LIMIT_OAUTH=10       # OAuth endpoints: 10 requests per 15 minutes
```

### Building Images

```bash
# Build API Image
docker build -t mcp-unified-api -f Dockerfile .

# Build Dashboard Image
docker build -t mcp-unified-dashboard -f Dockerfile.dashboard .

# Build All
docker-compose build
```

### Production Deployment

#### 1. Set Master Secret

Create a `.env` file:
```env
MASTER_SECRET=your-strong-random-secret-key-here
```

#### 2. Update Redirect URIs

If deploying to a domain, update:
- Google OAuth redirect URI in Google Cloud Console
- `redirect_uri` in dashboard → Google settings
- Update CORS origins in `src/api.ts`

#### 3. Build and Deploy

```bash
# Build production images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f dashboard
```

### Backup and Restore

#### Backup
```bash
# Backup data directory
tar -czf mcp-unified-backup-$(date +%Y%m%d).tar.gz data/
```

#### Restore
```bash
# Stop containers
docker-compose down

# Restore data
tar -xzf mcp-unified-backup-YYYYMMDD.tar.gz

# Start containers
docker-compose up -d
```

### Troubleshooting

#### Container won't start
```bash
# Check logs
docker-compose logs api
docker-compose logs dashboard

# Check container status
docker-compose ps

# Restart services
docker-compose restart
```

#### Port already in use
Edit `docker-compose.yml` to use different ports:
```yaml
ports:
  - "3002:3001"  # Host:Container
  - "5174:80"
```

#### Data directory permissions
```bash
# Fix permissions
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data
```

---

## Service Setup Guides

### Google Services

#### Enable Required APIs

1. **Gmail API**: https://console.cloud.google.com/apis/library/gmail.googleapis.com
2. **Google Drive API**: https://console.cloud.google.com/apis/library/drive.googleapis.com
3. **Google Calendar API**: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
4. **YouTube Data API v3**: https://console.cloud.google.com/apis/library/youtube.googleapis.com

Click "ENABLE" on each API. Wait 1-2 minutes for changes to propagate.

#### OAuth Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
   - Copy **Client ID** and **Client Secret**

3. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services** → **OAuth consent screen**
   - Fill in required fields:
     - App name
     - User support email
     - Developer contact email
   - Add **Test Users** (if app is in testing mode):
     - Scroll to "Test users" section
     - Click "+ ADD USERS"
     - Add your email address
     - Click "SAVE"

4. **Configure in Dashboard**:
   - Open dashboard → Google service
   - Enter Client ID and Client Secret
   - Click "Save"
   - Click "Connect with Google" or visit: http://localhost:3001/auth/google
   - Complete OAuth flow
   - You should be redirected back with success message

#### Troubleshooting

**Error: "Gmail API has not been used in project... or it is disabled"**
- Enable the API using the links above
- Wait 1-2 minutes for propagation

**Error: "Access blocked: project has not completed the Google verification process"**
- Add yourself as a test user in OAuth consent screen
- See steps above

**Error: "redirect_uri_mismatch"**
- Make sure redirect URI matches exactly: `http://localhost:3001/auth/google/callback`
- Check for trailing slashes or protocol mismatches

---

### LinkedIn

#### ⚠️ Important: Two-Factor Authentication (2FA)

The `linkedin-private-api` package **does not support 2FA**. If your LinkedIn account has 2FA enabled, you have two options:

#### Option 1: Temporarily Disable 2FA (Recommended for Testing)

1. Go to LinkedIn → Settings & Privacy → Sign in & security
2. Find "Two-step verification" 
3. Temporarily disable it
4. Try the API again
5. Re-enable 2FA after testing (for security)

#### Option 2: Use a Test Account (Best Practice)

1. Create a separate LinkedIn account specifically for API testing
2. **Do NOT enable 2FA on this test account**
3. Use this account's credentials in the dashboard
4. Keep your main account secure with 2FA enabled

#### Step-by-Step Setup

1. **Configure Credentials in Dashboard**:
   - Open the dashboard: http://localhost:5173
   - Click on **LinkedIn** service
   - Enter your LinkedIn credentials:
     - **Email**: Your LinkedIn email address
     - **Password**: Your LinkedIn password (must be the actual password, not a Google SSO password)
   - Click **Save**

2. **Verify Credentials**:
   - Make sure you can log into LinkedIn manually with these credentials
   - If you use Google SSO to log into LinkedIn, you need to:
     - Set a password for your LinkedIn account, OR
     - Use a different account that has a password

3. **Test the Connection**:
   - Go to Tool Tester in the dashboard
   - Try `getLinkedInProfile` (no arguments) to get your own profile
   - If it works, you're all set!

#### Common Issues

**Error: "LinkedIn authentication failed"**

**Causes:**
- ❌ Wrong email or password
- ❌ 2FA is enabled
- ❌ Account requires verification
- ❌ LinkedIn blocked the login attempt

**Solutions:**
1. Verify credentials: Double-check email/password in dashboard
2. Disable 2FA: Temporarily disable 2FA (see above)
3. Check LinkedIn: Log into LinkedIn in browser, check for security alerts
4. Use test account: Create a dedicated test account without 2FA

**Error: "Request failed with status code 401"**

The app now automatically handles session expiration:
- If you get a 401 error, the app will try to re-authenticate automatically
- If re-authentication fails, check your credentials
- Restart the API server if issues persist

**Error: "Request failed with status code 429" (Rate Limit)**

The app now handles rate limits automatically:
- **Automatic retry**: When a 429 error occurs, the app waits and retries automatically
- **Exponential backoff**: Wait times increase (5s, 10s, 20s) to avoid hitting limits again
- **Clear error message**: If retries fail, you'll get helpful guidance

**Solutions:**
1. Wait 5-10 minutes before trying again
2. Reduce request frequency
3. Use smaller `limit` values (e.g., `limit: 3` instead of `limit: 10`)

#### Security Best Practices

⚠️ **Important Security Notes:**

1. **Never use your main LinkedIn account** if it has 2FA enabled
2. **Use a dedicated test account** for API testing
3. **Credentials are encrypted** in the credential store, but still:
   - Don't share your credentials
   - Use a strong password
   - Consider rotating passwords regularly

---

### Discord

#### Connection Checklist

1. **Create Discord Application**:
   - Go to https://discord.com/developers/applications
   - Click **"New Application"**
   - Enter a name and click **"Create"**

2. **Create Bot**:
   - Go to **Bot** tab
   - Click **"Add Bot"** → **"Yes, do it!"**
   - Under **"Token"**, click **"Reset Token"** → Copy the token
   - **Enable Privileged Gateway Intents** (if needed):
     - Message Content Intent
     - Server Members Intent

3. **Invite Bot to Server**:
   - Go to **OAuth2** → **URL Generator**
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions (as needed)
   - Copy the generated URL
   - Open URL in browser and authorize bot

4. **Configure in Dashboard**:
   - Open dashboard → Discord service
   - Enter **Bot Token** (from step 2)
   - Click **Save**

#### Required Credentials

- **bot_token**: Bot token from Discord Developer Portal

#### Testing

Use Tool Tester to test:
- `discordGetCurrentUser` - Get bot info
- `discordSendMessage` - Send message to channel
- `discordGetMessages` - Get channel messages

---

### Slack

#### Connection Checklist

1. **Create Slack App**:
   - Go to https://api.slack.com/apps
   - Click **"Create New App"** → **"From scratch"**
   - Enter app name and select workspace
   - Click **"Create App"**

2. **Configure OAuth & Permissions**:
   - Go to **OAuth & Permissions** tab
   - Under **"Bot Token Scopes"**, add:
     - `chat:write` - Send messages
     - `channels:read` - View channels
     - `channels:history` - Read message history
     - `users:read` - View users
     - `files:write` - Upload files (optional)
   - Scroll up and click **"Install App to Workspace"**
   - Authorize the app
   - Copy **Bot User OAuth Token** (starts with `xoxb-`)

3. **Configure in Dashboard**:
   - Open dashboard → Slack service
   - Enter **Bot User OAuth Token**
   - Click **Save**

#### Required Credentials

- **bot_token**: Bot User OAuth Token (`xoxb-...`)

#### Testing

Use Tool Tester to test:
- `slackTestAuth` - Verify authentication
- `slackPostMessage` - Send message
- `slackListConversations` - List channels

---

### Twitch

#### Connection Checklist

1. **Register Twitch Application**:
   - Go to https://dev.twitch.tv/console/apps
   - Click **"Register Your Application"**
   - Enter name, OAuth Redirect URI (e.g., `http://localhost:3001/auth/twitch/callback`)
   - Select category
   - Click **"Create"**
   - Copy **Client ID** and **Client Secret**

2. **Get Access Token**:

   **For Public Data (Streams, Users)** - App Access Token:
   ```bash
   curl -X POST https://id.twitch.tv/oauth2/token \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "grant_type=client_credentials"
   ```
   Copy the `access_token` from response.

   **For User-Specific Actions** - User Access Token:
   - Use OAuth flow (requires user authorization)
   - Or use Twitch CLI: `twitch token`

3. **Configure in Dashboard**:
   - Open dashboard → Twitch service
   - Enter:
     - **Client ID**
     - **Client Secret**
     - **Access Token** (App Access Token for public data)
   - Click **Save**

#### Required Credentials

- **client_id**: Twitch Application Client ID
- **client_secret**: Twitch Application Client Secret
- **access_token**: App Access Token (or User Access Token)

#### Testing

Use Tool Tester to test:
- `twitchGetUsers` - Get user info
- `twitchGetStreams` - Get streams
- `twitchGetTopGames` - Get top games

---

### GitHub

#### Connection Checklist

1. **Create Personal Access Token**:
   - Go to https://github.com/settings/tokens
   - Click **"Generate new token"** → **"Generate new token (classic)"**
   - Enter note (e.g., "MCP Unified")
   - Select scopes (at minimum):
     - `repo` - Full control of private repositories
     - `read:user` - Read user profile data
     - `user:email` - Access user email addresses
   - Click **"Generate token"**
   - **Copy the token immediately** (you won't see it again!)

2. **Configure in Dashboard**:
   - Open dashboard → GitHub service
   - Enter **Personal Access Token**
   - Click **Save**

#### Required Credentials

- **access_token**: Personal Access Token (PAT)

#### Testing

Use Tool Tester to test:
- `githubGetCurrentUser` - Get user profile
- `githubGetUserRepos` - List repositories
- `githubSearchRepositories` - Search repositories

---

### Other Services

#### Notion
- **Integration Token**: Get from https://notion.so/my-integrations
- Create integration → Copy "Internal Integration Token"
- Configure in dashboard → Notion service

#### Telegram
- **Bot Token**: Get from @BotFather on Telegram
- Send `/newbot` → Follow instructions → Copy token
- Configure in dashboard → Telegram service

#### WhatsApp (Twilio)
- **Account SID** + **Auth Token**: Get from https://twilio.com/console
- Configure in dashboard → WhatsApp (Twilio) service

#### WhatsApp (Meta Cloud API)
- **Access Token** + **Phone Number ID**: Get from https://developers.facebook.com
- Configure in dashboard → WhatsApp (Meta) service

#### Outlook / Microsoft 365
- **Client ID** + **Client Secret**: Get from Azure Portal
- Configure OAuth redirect URI
- Configure in dashboard → Outlook service

---

## API Endpoints Reference

### 🟣 DISCORD

**Base URL**: `https://discord.com/api/v10`  
**Auth**: `Authorization: Bot YOUR_BOT_TOKEN`

#### Messages
- `GET    /channels/{channel_id}/messages` - Get channel messages
- `POST   /channels/{channel_id}/messages` - Send message
- `PATCH  /channels/{channel_id}/messages/{message_id}` - Edit message
- `DELETE /channels/{channel_id}/messages/{message_id}` - Delete message

#### Channels
- `GET    /channels/{channel_id}` - Get channel info
- `GET    /guilds/{guild_id}/channels` - List guild channels
- `POST   /guilds/{guild_id}/channels` - Create channel

#### Guilds (Servers)
- `GET    /guilds/{guild_id}` - Get guild info
- `GET    /guilds/{guild_id}/members` - List members

#### Users
- `GET    /users/@me` - Get current user
- `GET    /users/{user_id}` - Get user

---

### 🟢 SLACK

**Base URL**: `https://slack.com/api/`  
**Auth**: `Authorization: Bearer xoxb-YOUR-BOT-TOKEN`  
**Format**: All methods are POST requests

#### Messaging
- `chat.postMessage` - Send message
- `chat.update` - Update message
- `chat.delete` - Delete message

#### Conversations (Channels/DMs)
- `conversations.list` - List all channels
- `conversations.info` - Get channel info
- `conversations.history` - Get message history

#### Users
- `users.list` - List users
- `users.info` - Get user info

#### Auth / Team
- `auth.test` - Verify token
- `team.info` - Get workspace info

---

### 🟣 TWITCH

**Base URL**: `https://api.twitch.tv/helix`  
**Auth**: `Authorization: Bearer YOUR_ACCESS_TOKEN`  
**Required**: `Client-Id: YOUR_CLIENT_ID`

#### Users
- `GET  /users` - Get users (by id or login)
- `GET  /users/follows` - Get user follows

#### Streams
- `GET  /streams` - Get streams
- `GET  /streams/followed` - Get followed streams

#### Channels
- `GET   /channels` - Get channel info
- `PATCH /channels` - Update channel

#### Games / Categories
- `GET  /games` - Get games
- `GET  /games/top` - Get top games
- `GET  /search/categories` - Search categories

---

### ⚫ GITHUB

**Base URL**: `https://api.github.com`  
**Auth**: `Authorization: Bearer YOUR_PAT_OR_OAUTH_TOKEN`  
**Required**: `Accept: application/vnd.github+json`

#### Repos
- `GET    /user/repos` - List user repos
- `GET    /repos/{owner}/{repo}` - Get repo
- `POST   /user/repos` - Create repo
- `PATCH  /repos/{owner}/{repo}` - Update repo

#### Issues
- `GET    /repos/{owner}/{repo}/issues` - List issues
- `POST   /repos/{owner}/{repo}/issues` - Create issue
- `PATCH  /repos/{owner}/{repo}/issues/{issue_number}` - Update issue

#### Pull Requests
- `GET    /repos/{owner}/{repo}/pulls` - List PRs
- `POST   /repos/{owner}/{repo}/pulls` - Create PR
- `PUT    /repos/{owner}/{repo}/pulls/{pull_number}/merge` - Merge PR

#### Users
- `GET    /user` - Get current user
- `GET    /users/{username}` - Get user

#### Search
- `GET    /search/repositories` - Search repos
- `GET    /search/issues` - Search issues
- `GET    /search/code` - Search code

---

## Testing

### Quick Start - Test Everything at Once

Run both the API server and dashboard together:

```bash
npm run dev
```

This will start:
- **API Server** → http://localhost:3001
- **Dashboard** → http://localhost:5173

Open your browser to **http://localhost:5173** to see the MCP Control Center dashboard.

### Test Individual Components

#### 1. Test API Server Only

```bash
npm run dev:api
```

**Verify it's working:**
- Check terminal output: Should see `🌐 Dashboard API → http://localhost:3001`
- Test endpoint: Open http://localhost:3001/api/services in your browser
- Expected: JSON array with all available services

#### 2. Test Dashboard Only

**First, make sure API server is running** (in a separate terminal):
```bash
npm run dev:api
```

**Then start the dashboard:**
```bash
npm run dev:dashboard
```

**Verify it's working:**
- Open http://localhost:5173 in your browser
- You should see the "MCP Control Center" dashboard
- Should display all services (Google, Notion, Telegram, etc.)

### Testing Checklist

- [ ] API server starts without errors
- [ ] Dashboard starts without errors  
- [ ] Can access http://localhost:5173
- [ ] Can access http://localhost:3001/api/services
- [ ] Dashboard shows all services
- [ ] Can click on a service and see configuration form
- [ ] Can save credentials (they're encrypted)
- [ ] OAuth flow works (for Google/Outlook)
- [ ] Tool invocation works (with proper credentials)

### Test MCP Server (for Claude Desktop)

If you want to test the MCP server itself (not just the dashboard):

```bash
# Build the MCP server
npm run build

# Run the MCP server
npm run dev:mcp
# or
node dist/index.js
```

The MCP server will expose all 80+ tools to Claude Desktop when configured properly.

### Claude Desktop Config

```json
{
  "mcpServers": {
    "mcp-unified": {
      "command": "node",
      "args": ["/path/to/mcp-unified/dist/index.js"],
      "env": { "MCP_DATA_DIR": "~/.mcp-unified" }
    }
  }
}
```

---

## Theme Switching

### Overview

The MCP Unified dashboard supports **light** and **dark** theme switching with persistent preferences.

### Features

✅ **Light & Dark Themes** - Two complete color schemes
✅ **Theme Toggle Button** - Easy switching via header button
✅ **Persistent Preference** - Theme saved in localStorage
✅ **System Preference** - Detects system theme on first visit
✅ **Smooth Transitions** - Animated theme changes
✅ **CSS Variables** - All colors use CSS variables for easy customization

### How to Use

1. **Click the theme button** in the header (☀️ for dark mode, 🌙 for light mode)
2. Theme switches instantly
3. Preference is saved automatically

### Theme Colors

#### Dark Theme (Default)
- **Background**: Deep dark blues (`#09090f`, `#0f0f1a`, `#16162a`)
- **Text**: Light grays (`#e4e4f0`, `#8888aa`)
- **Borders**: Dark purples (`#1e1e35`, `#2a2a4a`)
- **Accent**: Purple (`#6c63ff`)

#### Light Theme
- **Background**: Whites and light grays (`#ffffff`, `#f8f9fa`, `#e9ecef`)
- **Text**: Dark grays (`#212529`, `#495057`)
- **Borders**: Light grays (`#dee2e6`, `#ced4da`)
- **Accent**: Same purple (`#6c63ff`) for consistency

### Customization

#### Change Theme Colors

Edit `dashboard/src/index.css`:

```css
[data-theme="light"] {
  --bg: #your-color;
  --text: #your-color;
  /* ... */
}
```

#### Change Default Theme

Edit `dashboard/src/contexts/ThemeContext.tsx`:

```typescript
const getInitialTheme = (): Theme => {
  return "light"; // Change default from "dark" to "light"
};
```

---

## Troubleshooting

### Dashboard shows "Failed to fetch"
- Make sure API server is running on port 3001
- Check browser console for CORS errors
- Verify proxy settings in `dashboard/vite.config.ts`

### API returns 404
- Check that the endpoint path is correct
- Verify the API server is running
- Check terminal for error messages

### Port already in use
- Change ports in:
  - `src/api.ts` (API_PORT environment variable, default 3001)
  - `dashboard/vite.config.ts` (server.port, default 5173)

### Credentials not saving
- Check that `~/.mcp-unified/` directory exists
- Verify write permissions
- Check terminal for encryption errors

### Google OAuth Issues

**Error: "Gmail API has not been used in project... or it is disabled"**
- Enable the API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
- Wait 1-2 minutes for propagation

**Error: "Access blocked: project has not completed the Google verification process"**
- Add yourself as a test user in OAuth consent screen
- Go to: https://console.cloud.google.com/apis/credentials/consent
- Scroll to "Test users" → "+ ADD USERS" → Add your email → Save

**Error: "redirect_uri_mismatch"**
- Make sure redirect URI matches exactly: `http://localhost:3001/auth/google/callback`
- Check for trailing slashes or protocol mismatches

### LinkedIn Issues

**Error: "LinkedIn authentication failed"**
- Verify credentials are correct
- Disable 2FA temporarily (or use test account)
- Check LinkedIn account for security alerts

**Error: "Request failed with status code 401"**
- App will try to re-authenticate automatically
- If it fails, check credentials and restart API server

**Error: "Request failed with status code 429" (Rate Limit)**
- App handles this automatically with retry
- Wait 5-10 minutes if retries fail
- Reduce request frequency

### Rate Limiting Issues

**Getting rate limited too often**
- Increase limits in `.env` file
- Implement request batching
- Add caching layer
- Use Redis for distributed limiting

**Different apps share the same limit**
- Use different IPs (if possible)
- Implement per-app authentication
- Use Redis with app-specific keys
- Increase overall limits

**Rate limit resets but still getting errors**
- Check which limit you hit (1 min vs 15 min)
- Are multiple apps hitting the limit?
- Check `RateLimit-Reset` header for actual reset time
- Verify server time is correct

---

## Workflow & Rate Limiting Behavior

### Complete Request Lifecycle

#### Successful Request

```
1. Dashboard sends request
   ↓
2. Nginx proxies to API
   ↓
3. Rate limit check (PASS)
   ↓
4. Request validation (PASS)
   ↓
5. Decrypt credentials
   ↓
6. Call external API
   ↓
7. External API responds
   ↓
8. Mask credentials in response
   ↓
9. Add rate limit headers
   ↓
10. Return to dashboard
```

#### Rate Limited Request

```
1. Dashboard sends request
   ↓
2. Nginx proxies to API
   ↓
3. Rate limit check (FAIL)
   ↓
4. Return 429 error
   ├─ Error message
   ├─ Retry-After header
   └─ RateLimit headers
   ↓
5. Dashboard displays error
   ↓
6. User waits or implements retry
```

#### External API Rate Limited Request

```
1. Dashboard sends request
   ↓
2. Rate limit check (PASS)
   ↓
3. Call external API (LinkedIn)
   ↓
4. External API returns 429
   ↓
5. Automatic retry with backoff
   ├─ Wait 5s → Retry
   ├─ Wait 10s → Retry
   └─ Wait 20s → Retry
   ↓
6. If still failing:
   └─ Return error to user
   ↓
7. Dashboard displays error
   ↓
8. User waits before retrying
```

### Rate Limit Storage

#### In-Memory Store (Default)

**Pros:**
- Fast
- No dependencies
- Simple

**Cons:**
- Resets on restart
- Not shared across instances
- Lost if container restarts

#### Redis Store (Production)

**Pros:**
- Persistent
- Shared across instances
- Survives restarts

**Cons:**
- Requires Redis
- Additional dependency

---

## Summary

✅ **80+ tools** across 12 services
✅ **AES-256-GCM encryption** for all credentials
✅ **Multi-tier rate limiting** with automatic retry
✅ **Docker support** with data persistence
✅ **Light/Dark themes** with persistent preferences
✅ **Comprehensive error handling** and troubleshooting guides
✅ **Complete API documentation** for all services

**Your credentials are secure** - they never leave your machine unencrypted and are never exposed to LLM agents.

---

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Verify credentials are correct
3. Check API logs for detailed error messages
4. Ensure required scopes/permissions are granted
5. Review service-specific setup guides above

For security vulnerabilities, contact the maintainer privately (do not create public issues).
