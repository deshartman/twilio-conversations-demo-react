# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-08-29

### Major Changes - Monorepo Migration

This release represents a complete architectural restructuring from a single React application to a full-stack monorepo with integrated client-server deployment.

### Added

#### Server Package (`server/`)
- **New Twilio serverless functions** for backend API handling
  - `get-access-token.ts` - Generates Twilio access tokens for client authentication
  - `post-event.ts` - Handles conversation events and webhooks
  - `pre-event.ts` - Pre-processes conversation events
- **Integrated asset serving** - Server now serves the built React client from `/dist/assets/`
- **TypeScript configuration** optimized for Twilio serverless runtime
- **Automated deployment** to Twilio Functions and Assets

#### Monorepo Infrastructure
- **Root package.json** with npm workspaces configuration
- **Unified build system** - Single command builds both client and server
- **Concurrent development** - `npm run dev` starts both client dev server and serverless functions
- **Shared dependency management** - Common dev dependencies hoisted to root level

### Changed

#### Client Package (`client/`)
- **Build output redirected** to `../server/dist/assets/` for integrated deployment
- **Package structure** moved from root to `client/` subdirectory
- **Build optimization** - Source maps disabled for production builds
- **Asset cleanup** - Automated removal of previous build artifacts

#### Development Workflow
- **Unified commands** from root directory:
  - `npm run dev` - Start both client and server in development mode
  - `npm run build` - Build client assets into server, then compile server functions  
  - `npm run start` - Start production server with integrated client assets
  - `npm run deploy` - Deploy full-stack application to Twilio platform

#### Dependency Management
- **Shared dev dependencies** moved to root level (TypeScript, ESLint, Prettier)
- **Workspace-specific dependencies** remain in respective packages
- **Dependency deduplication** through npm workspaces

### Migration Notes

#### From Previous Architecture
- **Before**: Standalone React app requiring separate static hosting
- **After**: Integrated full-stack application with serverless backend

#### Deployment Changes
- **Client assets** now deployed automatically with server functions
- **Single deployment command** handles both frontend and backend
- **No separate hosting** required - everything serves from Twilio platform

#### Development Changes
- **New directory structure**: All client code moved to `client/` folder
- **Server functions** handle authentication and API logic previously done client-side
- **Concurrent development** allows simultaneous frontend and backend development

### Technical Details

#### Build Process Integration
1. Client builds React app into `server/dist/assets/`
2. Server compiles TypeScript functions to `server/dist/functions/`
3. Twilio deployment includes both assets and functions

#### Workspace Configuration
- **Client workspace**: React application with UI components
- **Server workspace**: Twilio serverless functions and runtime
- **Root workspace**: Shared tooling and unified scripts

### Breaking Changes

- **File structure**: All client files moved from root to `client/` directory
- **Build output**: Client no longer builds to `build/` directory
- **Deployment**: Requires Twilio CLI and serverless deployment instead of static hosting
- **Environment**: Server functions may require additional Twilio configuration

### Compatibility

- **Node.js**: Requires Node.js 20+ (server requirement)
- **Twilio CLI**: Required for deployment (`npm install -g @twilio/cli`)
- **Client dependencies**: All previous client functionality preserved

---

*Migration completed from standalone React app to integrated full-stack monorepo architecture.*