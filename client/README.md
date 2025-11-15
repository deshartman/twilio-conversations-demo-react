# Twilio Conversations Demo - Client Application

![SDK Version](https://img.shields.io/badge/SDK%20version-2.1.0-blue.svg)

## Overview

Modern React client application for Twilio Conversations, built with the Twilio Paste design system. This client is part of a monorepo architecture and integrates seamlessly with the serverless backend for a complete full-stack experience.

## Features

### Multi-Channel Conversations
Support for multiple participant types in unified conversations:
- **Chat participants** - Regular users with real-time messaging
- **SMS participants** - Users participating via SMS with friendly name support
- **WhatsApp participants** - Users participating via WhatsApp with friendly name support
- **AI Agent participants** - AI agents for automated responses

### Friendly Name System
- Add human-readable names when adding any participant type
- Friendly names automatically displayed in message threads
- Names enriched server-side via pre-event webhooks
- Seamless experience across all participant types

### Modern UI/UX
- **Twilio Paste Design System** - Professional, accessible component library
- **Real-time Updates** - WebSocket-based messaging with instant delivery
- **Media Sharing** - Send and receive images, files, and other media
- **Message Reactions** - React to messages with emoji
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Push Notifications** - Optional Firebase integration for notifications
- **Multi-language Support** - English, Spanish, and French

### Technical Implementation
- **Framework**: React with TypeScript
- **State Management**: Redux Toolkit
- **UI Components**: Twilio Paste design system
- **Real-time**: Twilio Conversations SDK with WebSocket connections
- **Build**: Vite for fast development and optimized production builds
- **Integration**: Builds directly into server assets for unified deployment

## Architecture

This client is part of a monorepo and integrates with the server component:

```
Root Directory
├── client/          ← You are here
│   ├── src/        # React application source
│   ├── public/     # Static assets
│   └── package.json
└── server/
    ├── src/        # Serverless functions
    └── dist/
        ├── functions/   # Compiled server functions
        └── assets/      # Client builds here ←
```

### Build Integration

The client builds directly into the server's assets directory:
- **Development**: Client runs on port 3000 with hot reload, proxies API calls to server on port 3003
- **Production**: Client builds to `../server/dist/assets/` and is served by Twilio Functions
- **Deployment**: Single deployment to Twilio Functions serves both client and server

## Development

### Prerequisites

This client is designed to run as part of the monorepo. For setup instructions, see the [root README](../README.md).

Quick requirements:
- Node.js 20+
- Server configured with environment variables
- Twilio Conversation Service with webhooks

### Running the Client

**Important**: Always run from the root directory, not from the client directory.

```bash
# From root directory
npm run dev       # Development mode (client + server)
npm run start     # Production build + start
npm run deploy    # Deploy to Twilio Functions
```

### Development Mode

In development mode:
1. Client runs on `http://localhost:3000` with hot reload
2. Server runs on `http://localhost:3003`
3. Client proxies API calls to server automatically
4. Changes to React code hot reload instantly
5. Authentication handled by integrated server

### Production Build

The client builds to `../server/dist/assets/`:
```bash
npm run build:client  # From root directory
```

Build output is optimized and ready for serving by Twilio Functions.

## Authentication

Authentication is handled by the integrated server (`/get-access-token` endpoint). The client:

1. Prompts user for username and password
2. Sends credentials to server
3. Receives JWT access token
4. Initializes Twilio Conversations SDK with token
5. Automatically handles token refresh

**Default Test Users** (MUST change passwords in `server/src/get-access-token.ts`):
- Username: `user00`, Password: (change default)
- Username: `user01`, Password: (change default)

## Push Notifications (Optional)

Push notifications are optional and use Firebase. For detailed setup, see the [root README](../README.md#push-notifications-optional).

Quick steps:
1. Create Firebase project and enable Cloud Messaging API (Legacy)
2. Create Twilio Push Credential with Firebase Server Key
3. Add `PUSH_CREDENTIAL_SID` to `server/.env`
4. Replace `public/firebase-config.example` with your `firebase-config.js`
5. Enable push notifications in Conversation Service settings

## Key Components

### State Management
- **Redux Toolkit** for global state
- Slices for conversations, messages, participants, user
- Async thunks for API calls and SDK operations

### API Integration
The client communicates with the server through:
- **`/get-access-token`** - Authentication and token generation
- **`/get-config`** - Fetch proxy numbers for SMS/WhatsApp
- **`/add-users`** - Add chat participants with friendly names
- **SDK Direct** - SMS/WhatsApp added via SDK with server-provided proxy numbers

### UI Components
Built with Twilio Paste:
- **ConversationView** - Main conversation interface with message list
- **MessageInput** - Compose and send messages with media
- **ParticipantsList** - View and manage conversation participants
- **AddParticipantModals** - Add SMS, WhatsApp, and Chat participants with friendly names
- **Settings** - User preferences and configuration

### Friendly Name Flow
1. User adds participant with friendly name in UI
2. Client sends to appropriate endpoint (SDK for SMS/WhatsApp, `/add-users` for Chat)
3. Server stores friendly name in appropriate location
4. Pre-event webhook enriches messages with friendly names
5. Client displays messages with friendly names automatically

## Project Structure

```
client/
├── src/
│   ├── api.ts                 # API calls to server
│   ├── App.tsx               # Main application component
│   ├── store/                # Redux store and slices
│   │   ├── store.ts         # Store configuration
│   │   ├── conversationsSlice.ts
│   │   ├── messagesSlice.ts
│   │   └── ...
│   ├── components/
│   │   ├── conversations/   # Conversation components
│   │   ├── message/         # Message components
│   │   ├── modals/          # Add participant modals
│   │   ├── settings/        # Settings components
│   │   └── ...
│   └── types/               # TypeScript type definitions
├── public/
│   └── firebase-config.example  # Firebase config template
└── package.json
```

## Development Tips

### Hot Reload
Changes to React components hot reload instantly in development mode. No need to restart the server.

### Debugging
- React DevTools for component inspection
- Redux DevTools for state inspection
- Browser console for SDK events and errors
- Network tab for API calls

### Proxy Configuration
The client uses Vite's proxy feature to forward API calls to the server in development:
```javascript
// vite.config.ts
server: {
  proxy: {
    '/get-access-token': 'http://localhost:3003',
    '/get-config': 'http://localhost:3003',
    // ...
  }
}
```

## Building for Production

The client build is integrated with the monorepo build system:

```bash
# From root directory
npm run build         # Builds both client and server
npm run build:client  # Client only
```

Build outputs to `../server/dist/assets/` where it's served by Twilio Functions.

## License

MIT
