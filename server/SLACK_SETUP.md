# Slack Channel Integration Setup Guide

This guide walks you through configuring a Slack app to integrate with Twilio Conversations via shared Slack channels.

## Overview

This integration allows:
- Adding Slack users to Twilio Conversations by email
- Two-way messaging between Twilio Conversations and Slack channels
- Media/file sharing between platforms
- Each Twilio Conversation gets its own shared Slack channel
- Channel name automatically matches the Conversation name

## Architecture

```
Twilio Conversation ←→ Twilio Functions ←→ Slack Channel
                         (Bridge)
```

**Message Flow:**
- **Slack → Twilio**: Slack Events API webhook (`slack-webhook.ts`) receives channel messages and forwards to Twilio
- **Twilio → Slack**: Post-event webhook (`post-event.ts`) receives Twilio messages, auto-creates channel on first message, and forwards to Slack channel

**Loop Prevention**: Messages are tagged with `source: 'slack'` attribute to prevent infinite forwarding

**Channel Management**: Channels are auto-created when the first message is sent, with names matching the Twilio Conversation name

## Prerequisites

1. A Slack workspace where you are an admin
2. Twilio account with Conversations API enabled
3. Public HTTPS endpoint for webhooks (ngrok for dev, Twilio Functions for prod)

## Step-by-Step Setup

### 1. Create Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter:
   - **App Name**: e.g., "Twilio Conversations Bridge"
   - **Workspace**: Select your workspace
5. Click **"Create App"**

### 2. Configure OAuth Scopes

Navigate to **OAuth & Permissions** in the sidebar.

#### Bot Token Scopes

Click **"Add an OAuth Scope"** under **Bot Token Scopes** and add:

| Scope | Purpose | Required For |
|-------|---------|--------------|
| `users:read.email` | Look up users by email | Adding participants ✅ CRITICAL |
| `users:read` | Get user information | Webhook processing |
| `chat:write` | Send messages to Slack | Forwarding Twilio → Slack ✅ CRITICAL |
| `channels:read` | Read channel information | Webhook processing ✅ CRITICAL |
| `channels:manage` | Create channels | Auto-creating channels ✅ CRITICAL |
| `channels:history` | Read channel messages | Message context |
| `channels:join` | Join channels | Bot channel membership |
| `files:read` | Download shared files | Media forwarding |

**⚠️ CRITICAL**: Without `users:read.email`, `chat:write`, `channels:read`, and `channels:manage`, the integration will not work.

**Note**: If you previously had `im:write`, `im:read`, and `im:history` scopes for DM-based integration, you can remove those and replace them with the channel scopes listed above.

### 3. Install App to Workspace

1. Scroll up to **"OAuth Tokens for Your Workspace"**
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 4. Add Credentials to Environment

Edit `server/.env` and add/update:

```env
# Slack Configuration
SLACK_APP_ID=A01XXXXXXXXX
SLACK_CLIENT_ID=9999999999999.9999999999999
SLACK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SLACK_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SLACK_OAUTH_BOT_TOKEN=xoxb-9999999999999-9999999999999-xxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to find these values:**
- Go to [https://api.slack.com/apps](https://api.slack.com/apps) → Your App
- **Basic Information** section:
  - App ID: `SLACK_APP_ID`
  - Client ID: `SLACK_CLIENT_ID`
  - Client Secret: `SLACK_CLIENT_SECRET`
  - Signing Secret: `SLACK_SIGNING_SECRET`
- **OAuth & Permissions** section:
  - Bot User OAuth Token: `SLACK_OAUTH_BOT_TOKEN`

### 5. Deploy Serverless Functions

#### For Local Development (ngrok)

1. Start ngrok:
   ```bash
   ngrok http 3003
   ```

2. Note your ngrok URL (e.g., `https://abc123.ngrok.io`)

3. Start your server:
   ```bash
   cd server
   npm run dev
   ```

#### For Production (Twilio Functions)

```bash
npm run deploy
```

Note your Twilio Functions domain (e.g., `https://your-service-xxxx.twil.io`)

### 6. Configure Slack Event Subscriptions

1. In your Slack app, navigate to **Event Subscriptions**
2. Toggle **"Enable Events"** to **ON**
3. Enter your **Request URL**:
   - **Dev**: `https://abc123.ngrok.io/slack-webhook`
   - **Prod**: `https://your-service-xxxx.twil.io/slack-webhook`

4. Slack will send a verification challenge - if your function is running, it will respond automatically ✅

5. Under **Subscribe to bot events**, click **"Add Bot User Event"** and add:
   - `message.channels` - Messages sent in public channels with the bot
   - `file_shared` - Files shared in conversations

6. Click **"Save Changes"**

**Note**: If you previously had `message.im` for DM-based integration, remove it and replace with `message.channels`.

**⚠️ Important**: If you see "invalid_url" or verification fails:
- Check that your server is running
- Verify the URL is publicly accessible
- Check server logs for errors

### 7. Verify Slack Webhook Signature (Optional Security Check)

The `slack-webhook.ts` function verifies all incoming requests using HMAC-SHA256 signature verification. This prevents unauthorized requests.

If you want to disable verification (NOT recommended for production):
```typescript
// In slack-webhook.ts, comment out signature verification
// if (!verifySlackSignature(...)) { ... }
```

## Usage

### Adding a Slack Participant

1. Open the Conversations Demo app
2. Join a conversation
3. Click the settings icon → **"Manage Participants"**
4. Click **"Add Participant"** dropdown → Select **"Slack Participant"**
5. Enter the Slack user's email address (e.g., `user@example.com`)
6. Click **"Save"**

The system will:
1. Look up the Slack user by email
2. Create a Twilio user with identity `slack:user@example.com`
3. Add them as a participant
4. Enable Slack integration for the conversation
5. Note: Slack channel will be auto-created when the first message is sent

### Sending Messages

**From Twilio to Slack:**
- When you send the first message in a Twilio conversation with Slack participants, a Slack channel is automatically created
- The channel name matches the conversation name (e.g., "Customer Support" → `#customer-support`)
- All subsequent messages are forwarded to this shared Slack channel
- All Slack participants in the conversation can see messages in the same channel

**From Slack to Twilio:**
- All Slack participants share the same channel for each Twilio conversation
- Any message sent in the Slack channel is automatically forwarded to the Twilio conversation
- The sender appears as their Slack identity (`slack:email@example.com`)

**Message Flow:**
1. Add Slack participant(s) to Twilio conversation via email
2. Send first message from Twilio → Slack channel auto-created
3. All participants invited to the channel
4. Messages flow bidirectionally between Twilio conversation and Slack channel

### Media/Files

- Files sent from Twilio → Slack appear as file notifications with download info
- Files sent from Slack → Twilio are downloaded and uploaded to Twilio Media Content Service (MCS)

## Understanding Slack Duplicate Events

### Why Slack Sends Duplicate Webhooks

Slack's Events API may deliver the same event multiple times. This is documented behavior and occurs because:

1. **Infrastructure Reliability**: Slack's distributed infrastructure sends events from multiple servers for redundancy
2. **Retry Logic**: If your endpoint is slow to respond (>3 seconds), Slack may retry the webhook
3. **Network Issues**: Temporary network problems can cause Slack to re-send events

**This is normal and expected behavior** - not a configuration issue. The official Slack documentation states: "Your app should be prepared to receive the same event more than once."

### How This Integration Handles Duplicates

The integration uses **message-based deduplication** to prevent duplicate messages from appearing in Twilio Conversations:

1. Before adding a message, the webhook checks the last 20 messages in the conversation
2. If a message with the same author and body was added in the last 30 seconds, it skips adding the duplicate
3. Both webhook calls are processed, but only the first one actually creates a message

**Why not event-based deduplication?**

Event-based deduplication (using Slack's `event_id` field) would be ideal, but it requires external storage (Redis, Twilio Sync, etc.) because:
- Twilio Functions are stateless serverless functions
- Each concurrent webhook request runs in a separate isolated instance
- In-memory caches don't persist between parallel function invocations

For most use cases, message-based deduplication is simpler and works reliably without external dependencies.

### What You'll See in Logs

When duplicates arrive, you'll see:

```
=== SLACK EVENT RECEIVED ===
Event Type: message
...
Checking for duplicate messages...
Message added to conversation: CHxxxx

=== SLACK EVENT RECEIVED ===  # Second webhook with same message
Event Type: message
...
Checking for duplicate messages...
⚠️  Duplicate message detected, skipping add
```

Both webhooks return 200 status (success), but only the first one creates a message in Twilio Conversations.

## Troubleshooting

### Error: "Missing Slack OAuth scope: users:read.email"

**Cause**: The Slack bot token doesn't have the `users:read.email` scope.

**Solution**:
1. Go to **OAuth & Permissions** → **Bot Token Scopes**
2. Add `users:read.email` scope
3. **Reinstall the app** to your workspace (required for new scopes)
4. Copy the new bot token to `.env` as `SLACK_OAUTH_BOT_TOKEN`
5. Restart your server

### Error: "Missing Slack OAuth scope: channels:manage"

**Cause**: The bot token doesn't have the required channel scopes.

**Solution**:
1. Add `channels:manage`, `channels:read`, `channels:history`, and `channels:join` scopes in **OAuth & Permissions**
2. **Reinstall the app** to workspace
3. Update bot token in `.env`
4. Restart server

### Error: "Slack user not found"

**Possible causes**:
- Email address is not associated with any Slack user
- User is not in the same workspace as the bot
- Email case-sensitivity issue

**Solution**:
- Verify the email exactly matches the user's Slack profile email
- Check Slack workspace → User profile → Email

### Error: "Unable to add participant" / 404 on endpoint

**Possible causes**:
- Server not running
- Wrong endpoint URL
- Conversation SID invalid

**Solution**:
- Check server logs: `npm run dev` or check Twilio Functions logs
- Verify conversation exists and SID is correct
- Check browser console for detailed error logs (temp logging enabled)

### Messages Not Forwarding from Slack to Twilio

**Check**:
1. Event Subscriptions configured correctly
2. Request URL verified successfully
3. `message.channels` event subscribed
4. Bot has been invited to the Slack channel
5. Server logs show incoming webhook requests

**Debug**:
```bash
# Check server logs
tail -f server/logs/twilio-run.log

# Or check browser console for webhook logs
```

### Duplicate Messages Appearing in Twilio

**Symptom**: Same Slack message appears twice in Twilio Conversations.

**Cause**: Slack's Events API intentionally sends duplicate webhooks for reliability (see "Understanding Slack Duplicate Events" section above).

**Solution**: ✅ **Already handled automatically**. The integration detects and prevents duplicate messages from being added to conversations. You may see duplicate webhook calls in the logs, but only one message will appear in the conversation.

### Messages Not Forwarding from Twilio to Slack

**Check**:
1. Post-event webhook configured in Twilio Console
2. Conversation attributes contain `slackParticipants` mapping
3. Bot token has `chat:write` scope
4. Server logs show outgoing Slack API calls

### Infinite Message Loop

**Symptom**: Messages keep bouncing back and forth forever.

**Cause**: Loop prevention not working (should be implemented via `source: 'slack'` attribute).

**Solution**: Check that:
- `slack-webhook.ts` sets `source: 'slack'` in message attributes when forwarding from Slack
- `post-event.ts` checks `source !== 'slack'` before forwarding to Slack
- Bot messages are ignored in `slack-webhook.ts` (checks for `bot_id`)

### System Messages Appearing in Conversation

**Symptom**: Seeing "has joined the channel" or other system messages in Twilio Conversations.

**Cause**: Slack sends system messages (channel joins, leaves, etc.) as `message` events with specific subtypes.

**Solution**: The integration automatically filters out these system message types:
- `channel_join` / `channel_leave` - User join/leave notifications
- `channel_archive` / `channel_unarchive` - Channel archive status changes
- `channel_name` / `channel_purpose` / `channel_topic` - Channel metadata changes
- `pinned_item` / `unpinned_item` - Pin status changes

These messages are logged as "ignored_system_message" and won't appear in Twilio Conversations.

**Note**: Users without email addresses (e.g., some bot accounts) are also automatically skipped to prevent `slack:undefined` identities.

## Configuration Reference

### Environment Variables

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `SLACK_APP_ID` | Yes | Slack App ID | `A01XXXXXXXXX` |
| `SLACK_CLIENT_ID` | Yes | OAuth Client ID | `9999999999999.9999999999999` |
| `SLACK_CLIENT_SECRET` | Yes | OAuth Client Secret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `SLACK_SIGNING_SECRET` | Yes | Webhook signature verification | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `SLACK_OAUTH_BOT_TOKEN` | Yes | Bot authentication token | `xoxb-xxxx-xxxx-xxxx` |
| `CONVERSATION_SERVICE_SID` | Yes | Twilio Conversations Service SID | `ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

### Slack Identity Format

Slack users are identified with the prefix `slack:` followed by their email:

```
slack:user@example.com
```

This distinguishes them from chat participants (no prefix) and SMS/WhatsApp (phone number prefixes).

### Conversation Attributes Structure

When Slack participants are added, the conversation attributes are updated:

```json
{
  "slackEnabled": true,
  "slackChannel": {
    "channelId": "C04ABC123",
    "channelName": "customer-support",
    "createdAt": "2025-11-16T10:30:00Z"
  },
  "slackParticipants": {
    "U01XXXXXXXXX": {
      "participantSid": "MBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "email": "alice@example.com"
    },
    "U02YYYYYYYYY": {
      "participantSid": "MBzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
      "email": "bob@example.com"
    }
  }
}
```

- **slackEnabled**: Boolean flag indicating Slack integration is active
- **slackChannel**: Object containing Slack channel information (added on first message)
  - **channelId**: Slack channel ID
  - **channelName**: Slack channel name (sanitized from conversation name)
  - **createdAt**: Timestamp when channel was created
- **slackParticipants**: Object mapping Slack User IDs to participant info
  - **Key**: Slack User ID
  - **participantSid**: Twilio participant SID
  - **email**: User's email address

## API Endpoints

### POST /add-slack-participant

Adds a Slack user to a Twilio conversation.

**Request:**
```json
{
  "slackEmail": "user@example.com",
  "conversationSid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Response (Success):**
```json
{
  "success": true,
  "participant": {
    "sid": "MBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "identity": "slack:user@example.com",
    "attributes": "...",
    "dateCreated": "2024-01-15T10:30:00Z",
    "dateUpdated": "2024-01-15T10:30:00Z"
  },
  "user": {
    "sid": "USxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "identity": "slack:user@example.com",
    "friendlyName": "John Doe"
  },
  "slackUser": {
    "id": "U01XXXXXXXXX",
    "name": "johndoe",
    "email": "user@example.com",
    "channelId": "D01XXXXXXXXX"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Missing Slack OAuth scope: users:read.email",
  "details": "Please add the users:read.email scope to your Slack app and reinstall it",
  "code": "missing_scope"
}
```

### POST /slack-webhook

Receives Slack Events API webhooks.

**Events Handled:**
- `url_verification` - Challenge request during setup
- `message.im` - DM messages
- `file_shared` - File sharing events

## Security Considerations

1. **Webhook Signature Verification**: All Slack webhooks are verified using HMAC-SHA256
2. **Token Storage**: Bot tokens should be stored securely in environment variables, never in code
3. **HTTPS Only**: All webhook endpoints must use HTTPS
4. **Rate Limiting**: Consider implementing rate limiting for production use
5. **Error Handling**: Errors are logged but don't expose sensitive information

## Additional Resources

- [Slack API Documentation](https://api.slack.com/docs)
- [Slack Events API](https://api.slack.com/events-api)
- [Slack Web API](https://api.slack.com/web)
- [Twilio Conversations API](https://www.twilio.com/docs/conversations/api)
- [Twilio Serverless Functions](https://www.twilio.com/docs/serverless)

## Support

For issues with:
- **Slack API**: Check [Slack API Status](https://status.slack.com/)
- **Twilio Conversations**: Check [Twilio Status](https://status.twilio.com/)
- **This Integration**: Check server logs and browser console (temp logging enabled)

## Temporary Logging

Comprehensive logging has been added to help with debugging:

**Server-side** (`add-slack-participant.ts`):
- Logs all Slack API calls with request/response details
- Identifies missing OAuth scopes
- Provides direct links to fix scope issues

**Client-side** (`api.ts`):
- Logs all requests to `/add-slack-participant`
- Logs full error responses for debugging
- Shows error codes and details

**To remove temporary logging** after debugging is complete:
1. Search for `// TEMP LOGGING - Remove after debugging` in codebase
2. Remove the temp logging functions and their calls
3. Clean up console.log statements marked with TEMP

## Migration from DM-Based Integration

If you previously configured Slack for DMs instead of channels:

**Remove these scopes:**
- `im:write`
- `im:read`
- `im:history`

**Remove these events:**
- `message.im`

**Add the channel scopes and events** as documented above, then **reinstall the app**.

**Note**: Existing DM-based conversations will need to be migrated manually. New conversations will automatically use the channel-based approach.
