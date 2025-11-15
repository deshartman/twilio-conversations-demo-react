# Twilio Conversations Demo - Server

Twilio serverless functions that provide authentication, conversation event handling, and multi-channel participant management (SMS, WhatsApp, Chat) for the Twilio Conversations Demo React application.

## Features

- **Token Generation**: Secure access token creation for client authentication
- **Multi-Channel Support**: Add SMS, WhatsApp, and Chat participants to conversations
- **Friendly Name System**: Automatic message enrichment with participant friendly names via pre-event webhooks
- **Proxy Number Configuration**: Centralized proxy number management for SMS/WhatsApp routing
- **User Management**: Create and manage Conversation users with friendly names
- **Event Processing**: Pre-event and post-event webhook handlers

## Quick Start

### Prerequisites

- Node.js 20+
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) installed and configured
- Twilio Conversations Service configured with webhooks
- SMS-capable phone number (for SMS participants)
- WhatsApp sender (for WhatsApp participants)
- [ngrok](https://ngrok.com) for local development webhook testing

### Environment Setup

Create a `.env` file in the server directory with your Twilio credentials:

```env
# Required - Twilio Credentials
ACCOUNT_SID=your_twilio_account_sid
AUTH_TOKEN=your_twilio_auth_token
CONVERSATION_SERVICE_SID=your_conversations_service_sid

# Required - Proxy Numbers for SMS/WhatsApp
SMS_PROXY_NUMBER=+1234567890
WHATSAPP_PROXY_NUMBER=+1234567890

# Optional - For production, API keys are recommended
TWILIO_API_KEY_SID=your_api_key_sid
TWILIO_API_KEY_SECRET=your_api_key_secret

# Optional - Push Notifications
PUSH_CREDENTIAL_SID=your_push_credential_sid

# Optional - AI Integration
RESPONSE_SERVER_URL=your_ai_response_server
```

### Webhook Configuration

The application requires webhook configuration for friendly name enrichment:

**For Development (with ngrok):**
1. Start server: `npm start` (runs on port 3003)
2. Start ngrok: `ngrok http 3003`
3. Configure in Twilio Console Conversation Service:
   - Pre-Event URL: `https://your-ngrok-url.ngrok.io/pre-event`
   - Post-Event URL: `https://your-ngrok-url.ngrok.io/post-event`
   - Subscribe to: `onMessageAdd`

**For Production:**
- Pre-Event URL: `https://your-domain.twil.io/pre-event`
- Post-Event URL: `https://your-domain.twil.io/post-event`

### Development

```bash
# Install dependencies
npm install

# Start local development server
npm start
```

The server runs on `http://localhost:3003` and serves:
- **Functions**: Authentication and event handlers
- **Assets**: Built React client application

### Deployment

```bash
# Build and deploy to Twilio Functions
npm run deploy
```

## API Functions

### GET /get-access-token

Generates Twilio access tokens for client authentication and creates/updates users with friendly names.

**Query Parameters:**
- `identity` - Username (user00 or user01 by default)
- `password` - User password (default passwords MUST be changed)
- `friendlyName` - Optional friendly name for the user

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "identity": "user00",
  "conversationSid": "CHxxxx"
}
```

**⚠️ SECURITY CRITICAL**: Change the default passwords in `src/get-access-token.ts`:

```typescript
const users: Record<string, string> = {
    user00: "your_secure_password_1",  // Change from default
    user01: "your_secure_password_2"   // Change from default
};
```

### GET /get-config

Returns server configuration including proxy numbers for SMS and WhatsApp routing.

**Response:**
```json
{
  "smsProxyNumber": "+1234567890",
  "whatsappProxyNumber": "+1234567890"
}
```

### POST /add-users

Adds chat users to conversations with optional friendly names.

**Request Body:**
```json
{
  "conversationSid": "CHxxxx",
  "userIdentity": "user123",
  "friendlyName": "John Doe"
}
```

**Features:**
- Creates user if it doesn't exist
- Updates user with friendly name
- Adds participant to conversation
- Sets participant attributes with friendly name

### POST /create-user

Creates or updates a Conversation user with a friendly name.

**Request Body:**
```json
{
  "userIdentity": "user123",
  "friendlyName": "John Doe"
}
```

### POST /pre-event

**Webhook handler for Twilio Conversation pre-events** - Required for friendly name enrichment.

Intercepts `onMessageAdd` events before messages are stored and enriches them with friendly names.

**Process:**
1. Receives message before it's saved
2. Fetches participant details
3. Extracts friendly name from:
   - Messaging binding (SMS/WhatsApp)
   - User object (Chat)
   - Participant attributes (fallback)
4. Prepends friendly name to message: `[Friendly Name] message content`
5. Stores metadata in message attributes

**Response Format:**
```json
{
  "body": "[John Doe] Hello everyone!",
  "attributes": "{\"preProcessed\":true,\"friendlyName\":\"John Doe\",\"originalBody\":\"Hello everyone!\"}"
}
```

### POST /post-event

Handles conversation post-events and webhooks from Twilio for logging and AI integration.

**Supported Events:**
- `onMessageAdd` - Processes messages for AI responses
- Other conversation events for logging

### POST /add-participant

Adds participants to existing conversations. **Note:** This function is primarily used for programmatic participant addition. The client typically uses SDK methods directly for SMS/WhatsApp, and `/add-users` for chat participants.

**Request Body:**
```json
{
  "conversationSid": "CHxxxx",
  "participantData": {
    "messagingBinding.address": "+15551234567",
    "messagingBinding.proxyAddress": "+14155551234",
    "messagingBinding.friendlyName": "John Doe"
  }
}
```

## Architecture

### Serverless Runtime
- Built on Twilio Functions platform
- TypeScript compilation to JavaScript
- Automatic scaling and deployment

### Asset Serving
- Serves the React client from `/dist/assets/`
- Integrated deployment with client build
- Single endpoint for full-stack application

### Development Workflow
1. Client builds into `dist/assets/`
2. TypeScript compiles to `dist/functions/`
3. Twilio CLI deploys both assets and functions

## Configuration

### Required Environment Variables
- `ACCOUNT_SID` - Your Twilio Account SID
- `AUTH_TOKEN` - Your Twilio Auth Token (or use API keys below)
- `CONVERSATION_SERVICE_SID` - Twilio Conversations Service SID
- `SMS_PROXY_NUMBER` - Phone number for SMS routing (E.164 format: +1234567890)
- `WHATSAPP_PROXY_NUMBER` - Phone number for WhatsApp routing (E.164 format: +1234567890)

### Optional Variables (Recommended for Production)
- `TWILIO_API_KEY_SID` - API Key for authentication (more secure than AUTH_TOKEN)
- `TWILIO_API_KEY_SECRET` - API Key secret
- `PUSH_CREDENTIAL_SID` - For push notifications
- `RESPONSE_SERVER_URL` - For AI agent integration

### Proxy Number Configuration

Proxy numbers are essential for SMS and WhatsApp integration:

- **Purpose**: Route messages between your Twilio service and participant phone numbers
- **Format**: Must be in E.164 format (e.g., `+14155551234`)
- **SMS**: Requires an active SMS-capable Twilio phone number
- **WhatsApp**: Requires an approved WhatsApp sender number
- **Configuration**: Set once in `.env`, used automatically by the application

Without proxy numbers configured, SMS and WhatsApp participants cannot be added to conversations.

## Security Notes

### Authentication
- Demo uses hardcoded users for testing only
- **Production**: Implement proper user management system
- Change default passwords immediately

### CORS
- Currently allows all origins (`*`) for development
- **Production**: Restrict to your domain

### Token Management
- Access tokens expire after 1 hour
- Tokens scoped to specific conversation service

## Scripts

- `npm run build` - Compile TypeScript functions
- `npm start` - Start local development server  
- `npm run deploy` - Deploy to Twilio Functions
- `npm test` - Run TypeScript type checking

## Troubleshooting

### Common Issues

**Build Errors**: Ensure `@types/node` is installed and TypeScript configuration is correct.

**Authentication Failures**: Verify environment variables and Twilio credentials.

**CORS Issues**: Check that your client domain is properly configured.

**Proxy Numbers Not Working**:
- Verify `SMS_PROXY_NUMBER` and `WHATSAPP_PROXY_NUMBER` are set in `.env`
- Ensure numbers are in E.164 format: `+1234567890`
- Confirm numbers are active in your Twilio account
- For WhatsApp, ensure sender is approved and registered

**Friendly Names Not Appearing**:
- Check that pre-event webhook is configured in Conversation Service
- Verify webhook URL is accessible (test with curl or browser)
- For local dev, ensure ngrok tunnel is active
- Check that `onMessageAdd` event is subscribed in webhook config
- Review function logs for errors

**Webhook Errors**:
- Confirm ngrok is running and forwarding to port 3003
- Test webhook URL: `https://your-ngrok-url.ngrok.io/pre-event`
- Check Twilio Console webhook logs for delivery status
- Verify webhook URLs don't have trailing slashes
- Ensure pre-event returns proper response format

**Missing Environment Variables**:
- Verify all required variables are set in `.env`
- Check for typos in variable names
- Restart server after changing `.env` file
- Use `context.VARIABLE_NAME` in functions, not `process.env.VARIABLE_NAME`

### Logs
- Local: Check console output
- Production: Use Twilio Console Function logs
- Webhook debugging: Check ngrok terminal for request logs

### TypeScript Best Practices

This server follows Twilio Serverless TypeScript best practices:

- Use `context.getTwilioClient()` instead of manual Twilio client initialization
- Access environment variables via `context.VARIABLE_NAME`
- Never use `(context as any)` - always use proper typing
- All environment interfaces extend `ServerlessEnvironment` with index signature
- Return plain objects via callback, not HTTP responses

See `CLAUDE.md` in project root for detailed guidelines.

## Development

### File Structure
```
server/
├── src/
│   ├── get-access-token.ts    # Authentication & token generation
│   ├── get-config.ts          # Proxy number configuration
│   ├── add-users.ts           # Add chat users with friendly names
│   ├── create-user.ts         # Create/update users
│   ├── pre-event.ts           # Pre-event webhook (message enrichment)
│   ├── post-event.ts          # Post-event webhook (logging & AI)
│   └── add-participant.ts     # Add participants (programmatic)
├── dist/                      # Compiled output
│   ├── functions/             # Serverless functions (compiled JS)
│   └── assets/                # React client assets (from client build)
├── .env                       # Environment variables (not committed)
└── tsconfig.json              # TypeScript config
```

### Local Testing
Functions are available at:
- `http://localhost:3003/get-access-token`
- `http://localhost:3003/get-config`
- `http://localhost:3003/add-users`
- `http://localhost:3003/create-user`
- `http://localhost:3003/pre-event`
- `http://localhost:3003/post-event`
- `http://localhost:3003/add-participant`

React app served at: `http://localhost:3003/`

**Testing Webhooks Locally:**
Webhooks require ngrok to expose your local server:
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Start ngrok
ngrok http 3003

# Configure webhook URLs in Twilio Console with ngrok URL
```