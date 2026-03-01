import { useState, useMemo } from "react";

export default function DocumentationModal({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState("overview");

  const sections = {
    overview: {
      title: "Overview",
      content: `# ⬡ MCP Unified Control Center

**80+ tools across 12 services in one unified MCP server.**

MCP Unified is a powerful integration platform that connects multiple services through a single interface. All your credentials are encrypted and stored securely on your machine.

## What is MCP?

MCP (Model Context Protocol) allows AI assistants to interact with external services and APIs. This dashboard lets you configure and manage all your service credentials in one place.

## Services Supported

- **Gmail** - Send emails, manage labels, create filters
- **Google Drive** - List files, create folders, manage documents
- **Google Calendar** - List events, create calendar entries
- **YouTube** - Search videos, get video details
- **LinkedIn** - Search jobs, find people, get feed posts
- **Notion** - List databases, search pages, create pages
- **Telegram** - Send messages, get updates, manage bots
- **WhatsApp** - Send messages via Twilio or Meta
- **Discord** - Send messages, manage channels, get guild info
- **Slack** - Post messages, list channels, manage conversations
- **Twitch** - Get streams, search channels, manage clips
- **GitHub** - Manage repos, create issues, handle pull requests`
    },
    gettingStarted: {
      title: "Getting Started",
      content: `# Getting Started

## Step 1: Configure Services

1. **Click on any service card** in the dashboard
2. **Enter your credentials**:
   - API keys
   - OAuth tokens
   - Bot tokens
   - Client IDs/Secrets
3. **Click "Save"** - Credentials are encrypted automatically

## Step 2: Complete OAuth (if needed)

Some services require OAuth authentication:

1. **Click "Connect with [Service]"** button
2. **Authorize the application** in your browser
3. **Return to dashboard** - You'll see a success message

## Step 3: Test Your Tools

1. **Click "▶ Tool Tester"** in the header
2. **Select a tool** from the sidebar
3. **Fill in parameters** (required fields marked with *)
4. **Click "▶ Run"** to test
5. **View results** in the output panel

## Step 4: Use with MCP

Once configured, tools are available to MCP-compatible AI assistants:

\`\`\`json
{
  "mcpServers": {
    "mcp-unified": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": { "MCP_DATA_DIR": "~/.mcp-unified" }
    }
  }
}
\`\`\`

Add this to your Claude Desktop config:
\`~/Library/Application Support/Claude/claude_desktop_config.json\``
    },
    security: {
      title: "Security & Privacy",
      content: `# Security & Privacy

## 🔒 Credential Protection

**Your credentials are NEVER exposed to LLM agents or external services.**

### Encryption

- **Algorithm**: AES-256-GCM (military-grade encryption)
- **Storage**: Encrypted SQLite database
- **Master Key**: Auto-generated or custom (via MASTER_SECRET)
- **Location**: \`./data/\` directory (or \`~/.mcp-unified/\`)

### What Gets Encrypted

✅ All API keys
✅ OAuth tokens (access & refresh)
✅ Client secrets
✅ Passwords
✅ Bot tokens

### What Stays Local

🔐 Credentials NEVER leave your machine:
- ❌ Not sent to LLM providers
- ❌ Not sent to external APIs (except when you invoke tools)
- ❌ Not logged in plaintext
- ❌ Not exposed in API responses (masked as ••••XXXX)

### Docker Security

- Data directory mounted as volume (not in image)
- Credentials excluded from Docker images
- Environment variables for sensitive config

See [SECURITY.md](../SECURITY.md) for complete details.`
    },
    toolTester: {
      title: "Using Tool Tester",
      content: `# Tool Tester Guide

## What is Tool Tester?

Tool Tester lets you test any API tool directly from the dashboard without needing an MCP client.

## How to Use

1. **Open Tool Tester**
   - Click "▶ Tool Tester" button in header
   - Or use keyboard shortcut (if configured)

2. **Select a Tool**
   - Browse tools in the left sidebar
   - Tools are grouped by service
   - Click any tool to select it

3. **Fill Parameters**
   - Required fields marked with red *
   - Default values pre-filled where available
   - Hover over fields for hints

4. **Run the Tool**
   - Click "▶ Run" button
   - Wait for response
   - View results or errors

## Parameter Types

- **Strings**: Plain text input
- **Numbers**: Automatically converted
- **Arrays**: Comma-separated values (e.g., "user1,user2")
- **Booleans**: "true"/"false" or "1"/"0"
- **Dates**: ISO format (e.g., "2024-01-01T10:00:00Z")

## Common Errors

### "Service not configured"
→ Configure the service in dashboard first

### "OAuth not completed"
→ Complete OAuth flow for that service

### "Rate limit exceeded"
→ Wait a few minutes and try again

### "Invalid credentials"
→ Check your credentials in dashboard

## Tips

- Start with simple tools (like "Get Bot Info")
- Check service status indicator (green/yellow dot)
- Use "Test Auth" tools to verify credentials
- Check error messages for specific guidance`
    },
    rateLimiting: {
      title: "Rate Limiting",
      content: `# Rate Limiting

The API is protected with multi-tier rate limiting to prevent abuse.

## How It Works

### Per-IP Rate Limiting

**Important**: Rate limits are tracked **per IP address**:
- ✅ **Same IP = Shared Limit**: Multiple apps from same IP (e.g., localhost) share the limit
- ✅ **Different IPs = Separate Limits**: Each IP gets its own independent limit
- ✅ **Automatic Reset**: Limits reset automatically after the time window expires
- ✅ **Temporary Blocking**: You'll get 429 errors temporarily, then it works again

### Rate Limit Tiers

#### General API
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: Configuration endpoints
- **Resets**: Automatically after 15 minutes

#### Tool Invocations
- **Limit**: 30 requests per minute per IP
- **Applies to**: All tool calls
- **Resets**: Automatically after 1 minute
- **Why stricter**: Prevents external API abuse

#### OAuth Endpoints
- **Limit**: 10 requests per 15 minutes per IP
- **Applies to**: OAuth flows
- **Resets**: Automatically after 15 minutes

## Will It Block My Requests?

### Yes, But Temporarily

1. **Exceed limit** → Get 429 error
2. **Wait for window** → Limit resets automatically
3. **Try again** → Works normally

**Example**:
- Make 30 requests in 1 minute ✅
- Make 31st request ❌ 429 error
- Wait 1 minute ✅ Works again automatically

## Common Scenarios

### Multiple Apps from Same IP

**Problem**: Dashboard + External app both from localhost

**Solution**: 
- They share the same limit (30/min total)
- Increase limit: \`RATE_LIMIT_TOOLS=100\` in .env
- Or use different IPs if possible

### Rapid Testing

**Problem**: Testing tools quickly hits limit

**Solution**:
- Wait 1 minute for automatic reset
- Or increase limit for development
- Tool Tester now has automatic retry with backoff

## How to Fix Rate Limiting

### Quick Fix: Increase Limits

Edit \`.env\` file:

\`\`\`env
# Development (higher limits)
RATE_LIMIT_TOOLS=100
RATE_LIMIT_GENERAL=500

# Production (balanced)
RATE_LIMIT_TOOLS=60
RATE_LIMIT_GENERAL=200
\`\`\`

**Restart API server** after changing.

### Check Rate Limit Headers

All responses include:

\`\`\`
RateLimit-Limit: 30
RateLimit-Remaining: 15
RateLimit-Reset: 1640995200
\`\`\`

- **Remaining**: Requests left in current window
- **Reset**: Unix timestamp when limit resets

### Automatic Retry

Tool Tester now automatically:
- Detects 429 errors
- Waits for reset time
- Retries up to 3 times
- Shows wait progress

## Best Practices

- ✅ **Monitor headers** - Check RateLimit-Remaining
- ✅ **Batch operations** - Combine multiple requests
- ✅ **Cache results** - Avoid repeated requests
- ✅ **Space out requests** - Don't spam the API
- ✅ **Increase limits** - For development/testing

## Troubleshooting

**"Getting rate limited too often"**:
→ Increase limits in .env file

**"Different apps share limit"**:
→ They're from same IP - increase overall limit or use different IPs

**"Still getting errors after waiting"**:
→ Check which limit you hit (1 min vs 15 min window)

See [RATE_LIMIT_BEHAVIOR.md](../RATE_LIMIT_BEHAVIOR.md) for complete details.`
    },
    troubleshooting: {
      title: "Troubleshooting",
      content: `# Troubleshooting

## Common Issues

### API Not Reachable

**Error**: "API not reachable. Run: npm run dev:api"

**Solution**:
1. Check API server is running: \`npm run dev:api\`
2. Verify port 3001 is available
3. Check firewall settings
4. Try restarting the API server

### Service Not Configured

**Error**: "[Service] not configured"

**Solution**:
1. Go to dashboard → Select service
2. Enter required credentials
3. Click "Save"
4. Try tool again

### OAuth Errors

**Error**: "OAuth not completed" or "403: access_denied"

**Solutions**:
- **Google**: Add test users in Google Cloud Console
- **Google**: Enable required APIs (Gmail, Drive, Calendar, YouTube)
- **Outlook**: Verify redirect URI matches Azure config
- Complete OAuth flow again

### LinkedIn Authentication Failed

**Error**: "LinkedIn authentication failed"

**Solutions**:
- Disable 2FA temporarily (or use test account)
- Verify email/password are correct
- Check LinkedIn for security alerts
- Wait 5-10 minutes if rate limited

### Rate Limit Exceeded

**Error**: "Too many requests" (429)

**Solutions**:
- Wait for rate limit window to reset
- Reduce request frequency
- Use smaller limit values
- Check rate limit headers

### Docker Issues

**Container won't start**:
- Check logs: \`docker-compose logs api\`
- Verify ports aren't in use
- Check data directory permissions

**Credentials not persisting**:
- Verify \`./data\` directory is mounted
- Check file permissions
- Ensure volume is configured correctly

## Getting Help

1. **Check error messages** - They often contain specific guidance
2. **Review documentation** - See service-specific guides
3. **Check logs** - API logs show detailed errors
4. **Verify credentials** - Double-check all credentials

## Service-Specific Guides

- [Google OAuth Setup](../GOOGLE_OAUTH_QUICK_FIX.md)
- [LinkedIn Setup](../LINKEDIN_SETUP_GUIDE.md)
- [Enable Google APIs](../ENABLE_GOOGLE_APIS.md)
- [Integration Checklists](../INTEGRATION_CHECKLISTS.md)`
    },
    docker: {
      title: "Docker Setup",
      content: `# Docker Setup

## Quick Start

\`\`\`bash
docker-compose up -d
\`\`\`

## Access

- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3001

## Data Persistence

Credentials stored in \`./data/\` directory:
- \`credentials.db\` - Encrypted database
- \`.master.key\` - Master encryption key

**Important**: Backup the \`data/\` directory!

## Environment Variables

Create \`.env\` file:

\`\`\`env
MASTER_SECRET=your-secret-key-here
API_PORT=3001
DASHBOARD_PORT=5173
RATE_LIMIT_GENERAL=100
RATE_LIMIT_TOOLS=30
RATE_LIMIT_OAUTH=10
\`\`\`

## Commands

\`\`\`bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose build
\`\`\`

## Troubleshooting

**Port already in use**:
- Edit \`docker-compose.yml\` to change ports

**Data directory permissions**:
\`\`\`bash
chmod 700 ./data
\`\`\`

**Container won't start**:
\`\`\`bash
docker-compose logs api
docker-compose restart
\`\`\`

See [DOCKER.md](../DOCKER.md) for complete Docker documentation.`
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}
    >
      <div style={{ background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:12, width:"100%", maxWidth:900, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.7)" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"var(--mono)", fontWeight:600, color:"var(--accent)", fontSize:14 }}>📚 Documentation</span>
          <button onClick={onClose} style={{ background:"none", color:"var(--text3)", fontSize:18, cursor:"pointer", border:"none", padding:0, width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
          {/* Sidebar */}
          <div style={{ width:200, borderRight:"1px solid var(--border)", overflowY:"auto", padding:"12px 0", background:"var(--bg3)" }}>
            {Object.entries(sections).map(([key, section]) => (
              <button 
                key={key}
                onClick={() => setActiveSection(key)}
                style={{ 
                  display:"block", 
                  width:"100%", 
                  textAlign:"left", 
                  padding:"10px 16px", 
                  background: activeSection===key ? "var(--bg2)" : "transparent", 
                  color: activeSection===key ? "var(--accent)" : "var(--text2)", 
                  borderLeft: `3px solid ${activeSection===key ? "var(--accent)" : "transparent"}`, 
                  fontSize:12, 
                  fontFamily:"var(--mono)",
                  cursor:"pointer",
                  border:"none",
                  transition:"all 0.15s"
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== key) {
                    e.currentTarget.style.background = "var(--bg2)";
                    e.currentTarget.style.color = "var(--text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== key) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text2)";
                  }
                }}
              >
                {section.title}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:"auto", padding:24 }}>
            <div style={{ color:"var(--text)", fontSize:13, lineHeight:1.8, fontFamily:"var(--sans)" }}>
              {useMemo(() => {
                const content = sections[activeSection as keyof typeof sections].content;
                const lines = content.split('\n');
                const elements: JSX.Element[] = [];
                let inCodeBlock = false;
                let codeBlockContent: string[] = [];
                let codeBlockLang = '';

                lines.forEach((line, idx) => {
                  // Code blocks
                  if (line.startsWith('```')) {
                    if (inCodeBlock) {
                      // End code block
                      const code = codeBlockContent.join('\n');
                      elements.push(
                        <pre key={`code-${idx}`} style={{ 
                          background:"var(--bg3)", 
                          border:"1px solid var(--border)", 
                          borderRadius:6, 
                          padding:14, 
                          overflowX:"auto", 
                          fontFamily:"var(--mono)", 
                          fontSize:11, 
                          color:"var(--text2)", 
                          margin:"12px 0",
                          lineHeight:1.6
                        }}>
                          <code>{code}</code>
                        </pre>
                      );
                      codeBlockContent = [];
                      inCodeBlock = false;
                    } else {
                      // Start code block
                      inCodeBlock = true;
                      codeBlockLang = line.slice(3).trim();
                    }
                    return;
                  }

                  if (inCodeBlock) {
                    codeBlockContent.push(line);
                    return;
                  }

                  // Headers
                  if (line.startsWith('# ')) {
                    elements.push(
                      <h1 key={idx} style={{ fontSize:20, fontWeight:600, color:"var(--accent)", marginTop:elements.length===0?0:24, marginBottom:12, fontFamily:"var(--mono)" }}>
                        {line.slice(2)}
                      </h1>
                    );
                    return;
                  }
                  if (line.startsWith('## ')) {
                    elements.push(
                      <h2 key={idx} style={{ fontSize:16, fontWeight:600, color:"var(--text)", marginTop:elements.length===0?0:20, marginBottom:10, fontFamily:"var(--mono)" }}>
                        {line.slice(3)}
                      </h2>
                    );
                    return;
                  }
                  if (line.startsWith('### ')) {
                    elements.push(
                      <h3 key={idx} style={{ fontSize:14, fontWeight:600, color:"var(--text2)", marginTop:elements.length===0?0:16, marginBottom:8 }}>
                        {line.slice(4)}
                      </h3>
                    );
                    return;
                  }

                  // Lists
                  if (line.match(/^[-*] /)) {
                    const text = line.slice(2);
                    elements.push(
                      <div key={idx} style={{ marginLeft:20, marginBottom:6, display:"flex", alignItems:"flex-start" }}>
                        <span style={{ marginRight:8, color:"var(--accent)", fontSize:16 }}>•</span>
                        <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600">$1</strong>').replace(/`([^`]+)`/g, '<code style="background:var(--bg3);padding:2px 4px;border-radius:3px;font-family:var(--mono);font-size:10px;color:var(--accent)">$1</code>') }} />
                      </div>
                    );
                    return;
                  }
                  if (line.match(/^\d+\. /)) {
                    const match = line.match(/^(\d+)\. (.+)$/);
                    if (match) {
                      elements.push(
                        <div key={idx} style={{ marginLeft:20, marginBottom:6, display:"flex", alignItems:"flex-start" }}>
                          <span style={{ marginRight:8, color:"var(--accent)", fontFamily:"var(--mono)", minWidth:20 }}>{match[1]}.</span>
                          <span dangerouslySetInnerHTML={{ __html: match[2].replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600">$1</strong>').replace(/`([^`]+)`/g, '<code style="background:var(--bg3);padding:2px 4px;border-radius:3px;font-family:var(--mono);font-size:10px;color:var(--accent)">$1</code>') }} />
                        </div>
                      );
                    }
                    return;
                  }

                  // Empty lines
                  if (line.trim() === '') {
                    elements.push(<div key={idx} style={{ height:8 }} />);
                    return;
                  }

                  // Regular text with inline formatting
                  const formatted = line
                    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:var(--text)">$1</strong>')
                    .replace(/`([^`]+)`/g, '<code style="background:var(--bg3);padding:2px 6px;border-radius:4px;font-family:var(--mono);font-size:11px;color:var(--accent);border:1px solid var(--border)">$1</code>')
                    .replace(/✅/g, '<span style="color:var(--green)">✅</span>')
                    .replace(/❌/g, '<span style="color:var(--red)">❌</span>')
                    .replace(/🔐/g, '<span style="color:var(--accent)">🔐</span>')
                    .replace(/🟣/g, '<span style="color:#5865F2">🟣</span>')
                    .replace(/🟢/g, '<span style="color:#4A154B">🟢</span>')
                    .replace(/⚫/g, '<span style="color:#181717">⚫</span>');
                  
                  elements.push(
                    <p key={idx} style={{ marginBottom:8 }} dangerouslySetInnerHTML={{ __html: formatted }} />
                  );
                });

                return elements;
              }, [activeSection])}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
