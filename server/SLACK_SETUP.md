# Slack Direct Message Integration Setup Guide

This guide walks you through configuring a Slack app to integrate with Twilio Conversations via Direct Messages (DMs).

## Overview

This integration allows:
- Adding Slack users to Twilio Conversations by email
- Two-way messaging between Twilio Conversations and Slack DMs
- Media/file sharing between platforms
- Each Slack user gets their own private DM with the bot

## Architecture

```
Twilio Conversation ←→ Twilio Functions ←→ Slack DMs
                         (Bridge)
```

**Message Flow:**
- **Slack → Twilio**: Slack Events API webhook (`slack-webhook.ts`) receives DM messages and forwards to Twilio
- **Twilio → Slack**: Post-event webhook (`post-event.ts`) receives Twilio messages and forwards to Slack DMs

**Loop Prevention**: Messages are tagged with `source: 'slack'` attribute to prevent infinite forwarding

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
| `im:write` | Open DM channels | Creating DM with user ✅ CRITICAL |
| `im:read` | Read DM information | Webhook processing |
| `im:history` | Access DM history | Message context |
| `files:read` | Download shared files | Media forwarding |

**⚠️ CRITICAL**: Without `users:read.email`, `chat:write`, and `im:write`, the integration will not work.

### 3. Install App to Workspace

1. Scroll up to **"OAuth Tokens for Your Workspace"**
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 4. Configure App Home (CRITICAL)

Navigate to **App Home** in the sidebar.

**⚠️ CRITICAL STEP**: Without this configuration, users will see "Sending messages to this app has been turned off" and cannot send messages from Slack.

1. Scroll down to **"Show Tabs"** section
2. Find **"Messages Tab"**
3. **Toggle it ON** (green)
4. ✅ **Check the box**: "Allow users to send Slash commands and messages from the messages tab"
5. Click **"Save Changes"** if prompted

**After enabling Messages Tab:**
- You MUST **reinstall the app** to your workspace (go back to "Install App" → "Reinstall to Workspace")
- Users may need to **restart their Slack client** (desktop app or browser) for the change to take effect

### 5. Add Credentials to Environment

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

### 6. Deploy Serverless Functions

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

### 7. Configure Slack Event Subscriptions

1. In your Slack app, navigate to **Event Subscriptions**
2. Toggle **"Enable Events"** to **ON**
3. Enter your **Request URL**:
   - **Dev**: `https://abc123.ngrok.io/slack-webhook`
   - **Prod**: `https://your-service-xxxx.twil.io/slack-webhook`

4. Slack will send a verification challenge - if your function is running, it will respond automatically ✅

5. Under **Subscribe to bot events**, click **"Add Bot User Event"** and add:
   - `message.im` - Messages sent in DMs with the bot
   - `file_shared` - Files shared in conversations

6. Click **"Save Changes"**

**⚠️ Important**: If you see "invalid_url" or verification fails:
- Check that your server is running
- Verify the URL is publicly accessible
- Check server logs for errors

### 8. Verify Slack Webhook Signature (Optional Security Check)

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
2. Open a DM channel with that user
3. Create a Twilio user with identity `slack:user@example.com`
4. Add them as a participant
5. Store the mapping in conversation attributes

### Sending Messages

**From Twilio to Slack:**
- Any message sent in the Twilio conversation is automatically forwarded to the Slack user's DM

**From Slack to Twilio:**

**How to Access the Bot:**
1. In your Slack workspace, look for the **"Apps"** section in the left sidebar
2. Click on **"Twilio Conversation API"** (or your bot's name)
3. Click on the **"Messages"** tab at the top
4. Type your message in the input field and send

**Message Flow:**
- Slack user sends a message through the bot's Messages Tab
- Message is automatically forwarded to the Twilio conversation
- The sender appears as their Slack identity (`slack:email@example.com`)

**⚠️ Important**: Users must use the Messages Tab interface (accessed through the Apps section), not regular Direct Messages. Regular DM channels may show "Sending messages to this app has been turned off".

### Media/Files

- Files sent from Twilio → Slack appear as file notifications with download info
- Files sent from Slack → Twilio are downloaded and uploaded to Twilio Media Content Service (MCS)

## Troubleshooting

### Error: "Missing Slack OAuth scope: users:read.email"

**Cause**: The Slack bot token doesn't have the `users:read.email` scope.

**Solution**:
1. Go to **OAuth & Permissions** → **Bot Token Scopes**
2. Add `users:read.email` scope
3. **Reinstall the app** to your workspace (required for new scopes)
4. Copy the new bot token to `.env` as `SLACK_OAUTH_BOT_TOKEN`
5. Restart your server

### Error: "Missing Slack OAuth scope: im:write"

**Cause**: The bot token doesn't have the `im:write` scope.

**Solution**:
1. Add `im:write` scope in **OAuth & Permissions**
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

### Error: "Sending messages to this app has been turned off"

**Symptom**: When you try to send messages to the bot in Slack, you see the message "Sending messages to this app has been turned off" and the input field is disabled.

**Cause**: The Messages Tab is not enabled in your Slack app's App Home configuration.

**Solution**:
1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) → Your App
2. Navigate to **App Home** in the left sidebar
3. Scroll down to **"Show Tabs"** section
4. Find **"Messages Tab"** and toggle it **ON** (green)
5. ✅ Check the box: **"Allow users to send Slash commands and messages from the messages tab"**
6. Click **"Save Changes"**
7. **CRITICAL**: Go to **"Install App"** in sidebar → Click **"Reinstall to Workspace"**
8. **Restart your Slack client** (desktop app) or refresh your browser
9. Try accessing the bot again through the **Apps** section in your Slack sidebar
10. Click on the **"Messages"** tab at the top of the bot's interface

**Note**: Direct messages that were opened programmatically by the bot may remain disabled. Users should access the bot through the Apps section and use the Messages Tab interface.

### Messages Not Forwarding from Slack to Twilio

**Check**:
1. Event Subscriptions configured correctly
2. Request URL verified successfully
3. `message.im` event subscribed
4. Server logs show incoming webhook requests

**Debug**:
```bash
# Check server logs
tail -f server/logs/twilio-run.log

# Or check browser console for webhook logs
```

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
- `slack-webhook.ts` line 235 sets `source: 'slack'` in message attributes
- `post-event.ts` line 97 checks `source !== 'slack'`

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

When a Slack participant is added, the conversation attributes are updated:

```json
{
  "slackParticipants": {
    "U01XXXXXXXXX": {
      "participantSid": "MBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "channelId": "D01XXXXXXXXX",
      "email": "user@example.com"
    }
  }
}
```

- **Key**: Slack User ID
- **participantSid**: Twilio participant SID
- **channelId**: Slack DM channel ID
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

## Migration from Channel-Based Integration

If you previously configured Slack for channels instead of DMs:

**Remove these scopes:**
- `channels:read`
- `channels:history`
- `groups:read`
- `groups:history`

**Remove these events:**
- `message.channels`
- `message.groups`

**Add the DM scopes and events** as documented above, then **reinstall the app**.
