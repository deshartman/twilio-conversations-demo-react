# Twilio Conversations Demo - Server

Twilio serverless functions that provide authentication and conversation event handling for the Twilio Conversations Demo React application.

## Quick Start

### Prerequisites

- Node.js 20+
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) installed and configured
- Twilio Conversations Service configured

### Environment Setup

Create a `.env` file in the server directory with your Twilio credentials:

```env
ACCOUNT_SID=your_twilio_account_sid
TWILIO_API_KEY_SID=your_api_key_sid
TWILIO_API_KEY_SECRET=your_api_key_secret
CONVERSATION_SERVICE_SID=your_conversations_service_sid
PUSH_CREDENTIAL_SID=your_push_credential_sid  # Optional
```

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

Generates Twilio access tokens for client authentication.

**Parameters:**
- `identity` - Username (user00 or user01)  
- `password` - User password (00resu or 10resu)

**⚠️ SECURITY CRITICAL**: Change the default passwords in `src/get-access-token.ts`:

```typescript
const users: Record<string, string> = {
    user00: "your_secure_password_1",
    user01: "your_secure_password_2"
};
```

### POST /post-event

Handles conversation events and webhooks from Twilio.

### POST /pre-event  

Pre-processes conversation events before they're delivered.

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
- `TWILIO_API_KEY_SID` - API Key for authentication
- `TWILIO_API_KEY_SECRET` - API Key secret
- `CONVERSATION_SERVICE_SID` - Twilio Conversations Service SID

### Optional Variables
- `PUSH_CREDENTIAL_SID` - For push notifications

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

### Logs
- Local: Check console output
- Production: Use Twilio Console Function logs

## Development

### File Structure
```
server/
├── src/
│   ├── get-access-token.ts    # Authentication endpoint
│   ├── post-event.ts          # Event webhook handler  
│   └── pre-event.ts           # Pre-event processor
├── dist/                      # Compiled output
│   ├── functions/             # Serverless functions
│   └── assets/                # React client assets
└── tsconfig.json              # TypeScript config
```

### Local Testing
Functions are available at:
- `http://localhost:3003/get-access-token`
- `http://localhost:3003/post-event`
- `http://localhost:3003/pre-event`

React app served at: `http://localhost:3003/`