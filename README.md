# Twilio Conversations Demo - Full Stack Application

![SDK Version](https://img.shields.io/badge/SDK%20version-2.1.0-blue.svg) ![Monorepo](https://img.shields.io/badge/Architecture-Monorepo-green.svg)

## Overview

This is a complete full-stack Twilio Conversations demo application built as a monorepo. It demonstrates how to build a modern chat application with:

- **React Frontend** - Modern UI built with Twilio Paste design system
- **Serverless Backend** - Twilio Functions for authentication and event handling
- **Integrated Deployment** - Single command deploys both client and server to Twilio platform
- **Multi-Channel Support** - SMS, WhatsApp, and Chat participants in unified conversations
- **Friendly Names** - Human-readable names for all participant types with automatic message enrichment

The application allows users to create and join conversations, add participants with friendly names across multiple channels (SMS, WhatsApp, Chat), exchange messages, and includes support for media sharing and push notifications. All authentication and conversation management is handled through the integrated Twilio serverless functions.

### How It Works

1. **Client** builds into the server's assets folder
2. **Server** provides authentication tokens and handles conversation events
3. **Single deployment** to Twilio Functions serves both the React app and API endpoints
4. **Users authenticate** with the built-in token service and connect to Twilio Conversations
5. **Pre-event webhooks** automatically enrich messages with friendly names before storage
6. **Proxy numbers** route SMS/WhatsApp messages through your Twilio numbers

## Get Started

### Prerequisites

- Node.js 20+
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) installed and configured
- Twilio Account with Conversations Service
- [ngrok](https://ngrok.com) (for local development with webhooks) - Required to expose local server for Twilio webhooks during development
- Active Twilio phone numbers (at least one SMS-capable and one WhatsApp-enabled for full functionality)

### Quick Start Checklist

Getting started with this application requires a few Twilio resources. Here's the complete checklist:

- [ ] **Node.js 20+** installed
- [ ] **Twilio Account** created
- [ ] **Conversation Service** created in Twilio Console
- [ ] **SMS-capable phone number** purchased (for SMS participants)
- [ ] **WhatsApp sender** configured (for WhatsApp participants)
- [ ] **ngrok** installed (for local webhook development)
- [ ] **Environment variables** configured in `server/.env`
- [ ] **Webhooks** configured in Conversation Service (with ngrok for dev)
- [ ] **Default passwords** changed in `server/src/get-access-token.ts`

### Environment Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd twilio-conversations-demo-react
   npm install
   ```

2. **Set up Twilio Conversation Service and Webhooks:**

   Before configuring your environment, you need to create and configure a Conversation Service:

   a. **Create a Conversation Service:**
      - Visit the [Twilio Console - Conversations](https://www.twilio.com/console/conversations/services)
      - Click "Create new service"
      - Note the Service SID for your `.env` file

   b. **Configure Webhooks:**

      **For Development (using ngrok):**
      - Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com)
      - Start your local server: `npm run dev`
      - In another terminal, expose your local server: `ngrok http 3003`
      - Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)
      - In your Conversation Service settings, configure webhooks:
        - **Pre-Event Webhook URL**: `https://abc123.ngrok.io/pre-event`
        - **Post-Event Webhook URL**: `https://abc123.ngrok.io/post-event`
        - **Events to subscribe**: `onMessageAdd` (required for friendly name enrichment)

      **For Production:**
      - After deploying with `npm run deploy`, get your Functions domain
      - Update Conversation Service webhooks:
        - **Pre-Event Webhook URL**: `https://your-domain.twil.io/pre-event`
        - **Post-Event Webhook URL**: `https://your-domain.twil.io/post-event`

3. **Configure proxy numbers for SMS/WhatsApp:**

   You need active Twilio phone numbers to route SMS and WhatsApp messages:

   - **SMS**: Purchase or use an existing [SMS-capable phone number](https://www.twilio.com/console/phone-numbers)
   - **WhatsApp**: Set up a [WhatsApp Sender](https://www.twilio.com/console/sms/whatsapp/senders)

   These numbers act as proxies that route messages to/from participants in your conversations.

4. **Configure server environment:**

   Create `server/.env` with your Twilio credentials:
   ```env
   # Required - Twilio Credentials
   ACCOUNT_SID=your_twilio_account_sid
   AUTH_TOKEN=your_twilio_auth_token
   CONVERSATION_SERVICE_SID=your_conversations_service_sid

   # Required - Proxy Numbers for SMS/WhatsApp routing
   SMS_PROXY_NUMBER=+1234567890
   WHATSAPP_PROXY_NUMBER=+1234567890

   # Optional - Push Notifications
   PUSH_CREDENTIAL_SID=your_push_credential_sid

   # Optional - AI Integration
   RESPONSE_SERVER_URL=your_ai_response_server
   ```

   **Note on API Keys vs Auth Token:**
   - You can use either `AUTH_TOKEN` or API key pair (`TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET`)
   - For production, API keys are recommended for better security

5. **⚠️ CRITICAL SECURITY**: Change default passwords in `server/src/get-access-token.ts`:
   ```typescript
   const users: Record<string, string> = {
       user00: "your_secure_password_1",  // Change from "00resu"
       user01: "your_secure_password_2"   // Change from "10resu"
   };
   ```

### Development Build and Run

Start both client and server for development:

```bash
# Start development servers (client on :3000, server on :3003)
npm run dev
```

This runs:
- React development server with hot reload
- Twilio Functions local server 
- Client connects to local server for tokens

### Deploy Build and Run  

Build and deploy the complete application:

```bash
# Build both client and server, deploy to Twilio Functions
npm run deploy
```

This process:
1. Builds React app into server assets
2. Compiles TypeScript server functions  
3. Deploys everything to Twilio Functions platform
4. Your app is live at your Twilio Functions domain

### Production Testing Locally

Test the production build locally before deploying:

```bash
# Build everything and run locally
npm run start
```

Visit `http://localhost:3003` to test the complete application.

## Generating Access Tokens

The application includes a built-in token service that authenticates users and generates Twilio access tokens.

### Default Test Users

The demo includes two test users:
- **Username**: `user00`, **Password**: `00resu` (default - **MUST CHANGE**)
- **Username**: `user01`, **Password**: `10reresu` (default - **MUST CHANGE**)

### 🔒 Security Configuration

**BEFORE DEPLOYING TO PRODUCTION:**

1. **Change passwords** in `server/src/get-access-token.ts`
2. **Restrict CORS** origins from `*` to your domain
3. **Implement proper user management** - current system is for demo only

### Required Twilio Configuration

Set up these resources in your Twilio Console:

1. **Conversations Service** - [Create here](https://www.twilio.com/console/conversations/services)
   - Configure webhooks (see Environment Setup section above)
   - Pre-Event URL for message enrichment with friendly names
   - Post-Event URL for event logging and AI integration

2. **Phone Numbers**:
   - **SMS Number** - [Purchase here](https://www.twilio.com/console/phone-numbers) - Required for SMS participant support
   - **WhatsApp Sender** - [Set up here](https://www.twilio.com/console/sms/whatsapp/senders) - Required for WhatsApp participant support

3. **API Keys** (Optional, recommended for production) - [Create here](https://www.twilio.com/console/project/api-keys)

4. **Push Credentials** (Optional) - [Create here](https://www.twilio.com/console/project/credentials/push-credentials)

### Webhook Development Workflow

For local development, the application requires webhook access for message enrichment:

1. **Start local server**: `npm run dev` (runs on port 3003)
2. **Open ngrok tunnel**: In a separate terminal: `ngrok http 3003`
3. **Copy ngrok URL**: Note the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. **Update Conversation Service webhooks**: In Twilio Console, set:
   - Pre-Event URL: `https://abc123.ngrok.io/pre-event`
   - Post-Event URL: `https://abc123.ngrok.io/post-event`
5. **Test**: Add participants with friendly names and send messages
6. **Monitor**: Watch ngrok terminal for webhook requests

**Important Notes:**
- ngrok URLs change each time you restart ngrok (unless using a paid account with custom subdomains)
- You'll need to update webhook URLs in Twilio Console after each ngrok restart
- The pre-event webhook is required for friendly name enrichment to work
- Without webhooks configured, messages will still send but won't include friendly names

## Architecture

### Monorepo Structure

```
twilio-conversations-demo-react/
├── client/                    # React application
│   ├── src/                  # React components and logic
│   ├── public/               # Static assets  
│   └── package.json          # Client dependencies
├── server/                   # Twilio Functions
│   ├── src/                  # TypeScript serverless functions
│   ├── dist/                 # Compiled output
│   │   ├── functions/        # Deployed serverless functions
│   │   └── assets/           # Built React app (auto-generated)
│   └── package.json          # Server dependencies  
├── package.json              # Root workspace configuration
└── CHANGELOG.md              # Version history
```

### Deployment Architecture

```mermaid
graph TB
    A[Client React App] -->|builds into| B[Server Assets]
    C[Server Functions] -->|compiles to| D[Server Functions Dist]
    B --> E[Twilio Functions Platform]
    D --> E
    E -->|serves| F[Complete Application]
```

### Centralized Build System (v2.1.0+)

All build commands are centralized at the root level for simplified development:

**Main Commands:**
- `npm run build` - **Full build**: cleans, builds client to server assets, compiles server TypeScript
- `npm run start` - **Build + start**: complete build then starts local server on port 3003
- `npm run deploy` - **Build + deploy**: complete build then deploys to Twilio Functions
- `npm run dev` - **Development**: same as `npm run start` (build + local server)

**Individual Build Steps:**
- `npm run clean` - Removes server/dist directory
- `npm run build:client` - Builds React app to `../server/dist/assets`  
- `npm run build:server` - Compiles TypeScript server functions

**Other Commands:**
- `npm run test` - Run all tests
- `npm run lint` - Lint client code

## Features

### Client Application
- Modern React UI with Twilio Paste design system
- Real-time messaging and conversation management
- **Multi-Channel Participants**: Add SMS, WhatsApp, and Chat users to unified conversations
- **Friendly Names**: Assign human-readable names to all participant types
- **Automatic Proxy Routing**: SMS/WhatsApp messages routed through configured proxy numbers
- Media file sharing and message reactions
- Push notification support (with Firebase setup)
- Responsive design for mobile and desktop

### Server Functions
- **Authentication**: Token generation with user credentials
- **Event Handling**: Webhook processing for conversation events
- **Message Enrichment**: Pre-event webhook automatically prepends friendly names to messages
- **Proxy Configuration**: Centralized proxy number management via environment variables
- **Participant Management**: Functions for adding SMS, WhatsApp, and Chat participants
- **Asset Serving**: Integrated React app hosting
- **CORS Support**: Cross-origin request handling

### Friendly Name System
The application implements a comprehensive friendly name system:

1. **User Input**: When adding participants, users can optionally specify a friendly name (e.g., "John Doe")
2. **Storage**: Friendly names are stored in:
   - Messaging bindings (for SMS/WhatsApp participants)
   - User objects (for chat participants)
   - Participant attributes (fallback for chat users)
3. **Message Enrichment**: The `pre-event` webhook intercepts `onMessageAdd` events and:
   - Fetches participant details to retrieve friendly name
   - Prepends friendly name to message body: `[Friendly Name] message content`
   - Stores original message and metadata in message attributes
4. **Display**: Messages show with friendly names automatically, making multi-channel conversations more readable

### Proxy Number System
Proxy numbers enable SMS and WhatsApp integration:

- **Configuration**: Set once in `server/.env` as `SMS_PROXY_NUMBER` and `WHATSAPP_PROXY_NUMBER`
- **Automatic Routing**: Client fetches proxy numbers from server and uses them automatically
- **No Manual Entry**: Users don't need to configure proxy numbers per conversation
- **Channel Isolation**: Separate proxy numbers for SMS and WhatsApp channels
- **Message Flow**:
  - Outbound: Your proxy number → Participant's number
  - Inbound: Participant's number → Your proxy number → Conversation

### Development Experience
- **Monorepo**: Unified dependency management
- **TypeScript**: Full type safety across client and server
- **Hot Reload**: Live development with automatic rebuilds
- **Single Deploy**: One command deployment process

## Push Notifications (Optional)

To enable push notifications, set up Firebase:

1. **Create Firebase project** at [Firebase Console](https://firebase.google.com)
2. **Enable Cloud Messaging API (Legacy)** in project settings
3. **Create Twilio Push Credential** using Firebase Server Key
4. **Configure client** by replacing `public/firebase-config.example` with your `firebase-config.js`
5. **Add credential SID** to your `server/.env` as `PUSH_CREDENTIAL_SID`

## Troubleshooting

### Common Issues

**Build Failures**: Ensure Node.js 20+ and all dependencies installed

**Authentication Errors**: Verify Twilio credentials in `server/.env`

**CORS Issues**: Check server function CORS configuration

**Token Failures**: Ensure API keys have Conversations grants

**Friendly Names Not Appearing**:
- Verify webhooks are configured in Conversation Service
- Check that pre-event webhook URL is accessible (test with curl or browser)
- For local development, ensure ngrok tunnel is active
- Check server logs for webhook errors
- Verify `onMessageAdd` event is enabled in webhook configuration

**Cannot Add SMS/WhatsApp Participants**:
- Verify `SMS_PROXY_NUMBER` and `WHATSAPP_PROXY_NUMBER` are set in `server/.env`
- Ensure proxy numbers are active and SMS/WhatsApp enabled
- Check phone number format (must include country code, e.g., +1234567890)
- For WhatsApp, ensure sender is approved and registered

**Webhook Not Receiving Events**:
- Confirm ngrok is running and forwarding to port 3003
- Test ngrok URL in browser: `https://your-ngrok-url.ngrok.io/pre-event` should return a response
- Check Twilio Console webhook logs for delivery failures
- Verify webhook URLs don't have trailing slashes
- Check that ngrok URL matches what's configured in Twilio Console

**Messages Send But No Friendly Name**:
- This indicates webhooks aren't configured or not working
- Check that pre-event webhook is set to your server's `/pre-event` endpoint
- Verify webhook is returning a successful response (check Twilio logs)
- Test webhook manually: POST to your webhook URL with sample data

### Local Development
- Client runs on `http://localhost:3000` (dev mode) or served from `http://localhost:3003` (start mode)
- Server runs on `http://localhost:3003`
- React dev server proxies API calls to local server
- **ngrok required** for webhooks to work during local development
- ngrok runs on separate terminal: `ngrok http 3003`

### Production Deployment
- Everything served from single Twilio Functions domain
- Client assets served from root path
- API endpoints at `/get-access-token`, `/pre-event`, `/post-event`, etc.
- Webhooks point directly to your Functions domain (no ngrok needed)
- Update webhook URLs in Conversation Service after deployment

## Recent Feature Additions

### Friendly Name System (v2.0+)
The application now includes comprehensive friendly name support:
- Add human-readable names when adding any participant type (SMS, WhatsApp, Chat)
- Automatic message enrichment via pre-event webhook
- Friendly names prepended to all messages: `[Friendly Name] message content`
- Stored across multiple locations for reliability (messaging bindings, user objects, participant attributes)

**Commits**: `9fb211b`, `c5b31bb`, `edb9209`

### Proxy Number Configuration (v2.0+)
Simplified SMS and WhatsApp integration:
- Configure proxy numbers once in environment variables
- Client automatically fetches and uses proxy numbers
- No manual proxy number entry required per conversation
- Centralized configuration for easier deployment

**Commits**: `9338502`, `edb9209`

**Migration from manual proxy entry**:
- Remove any hardcoded proxy numbers from client code
- Add `SMS_PROXY_NUMBER` and `WHATSAPP_PROXY_NUMBER` to `server/.env`
- Update Conversation Service webhook configuration

## Migration Notes

### From v2.0.x to v2.1.0

Version 2.1.0 introduces improved build system and TypeScript compatibility:
- **Centralized build commands** - All build orchestration moved to root package.json
- **Fixed TypeScript issues** - Resolved serverless runtime types and import compatibility
- **Simplified workflow** - Single `npm run start` command builds and runs everything
- **Better dependency management** - Proper serverless runtime types dependency added

**Required Actions**:
- Add proxy number environment variables to `server/.env`
- Configure webhooks in Conversation Service (if not already done)
- For local development, set up ngrok tunnel for webhook testing

### From v1.x to v2.x

Version 2.0.0 represents a major architectural change from standalone React app to integrated full-stack monorepo. See [CHANGELOG.md](CHANGELOG.md) for complete migration details.

Key changes:
- All client code moved to `client/` directory  
- Server functions added for authentication and events
- Unified build and deployment process
- Single Twilio Functions deployment target

## License

MIT