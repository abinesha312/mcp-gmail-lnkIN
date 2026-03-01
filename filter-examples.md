# Gmail Filter Examples (mcp-gmail-linkedin)

Examples for using the Gmail filter tools exposed by the fused Gmail + LinkedIn MCP server. All tool names use camelCase.

## Quick Start

After Gmail OAuth is set up, you can create and manage filters via the MCP tools **createFilter**, **listFilters**, **getFilter**, **deleteFilter**, and **createFilterFromTemplate**.

## Common Use Cases

### 1. Newsletter and marketing

Use the **fromSender** template to file newsletters under a label and optionally archive:

- Tool: **createFilterFromTemplate**
- Template: `fromSender`
- Parameters: `senderEmail`, `labelIds`, `archive`

### 2. Work and team mail

Create filters for specific senders (e.g. managers, team lists) and apply labels or mark as read.

### 3. Attachments and size

- **withAttachments**: label emails that have attachments.
- **largeEmails**: label emails larger than a given size (use **createFilterFromTemplate** with `largeEmails` and `sizeInBytes`).

### 4. Text and mailing lists

- **containingText**: match emails containing specific text; optional `markImportant`.
- **mailingList**: match list or subject identifier; optional archive.

## Best Practices

1. Start with templates (**createFilterFromTemplate**) before custom criteria.
2. Test search with **searchEmails** to validate query/criteria before creating a filter.
3. Use a clear label hierarchy and **getOrCreateLabel** where needed.
4. Review filters with **listFilters** and **getFilter**; remove unused ones with **deleteFilter**.
5. Combine with **batchModifyEmails** when applying labels to existing messages.

## Limits

- Gmail allows up to 1,000 filters per account.
- Forwarding actions require a verified destination address.
- Some system labels cannot be removed by filters.
