# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-01-07

### Enhanced Build System & TypeScript Fixes

This release improves the development experience with centralized build orchestration and resolves TypeScript runtime compatibility issues.

### Added

#### Centralized Build System
- **Unified build scripts** - All build commands moved to root `package.json` for consistent workflow
- **Granular build steps** - Individual commands for `clean`, `build:client`, `build:server`
- **Simplified commands** - Single `npm run start` now builds and runs everything
- **Better error handling** - Improved build failure reporting and dependency resolution

#### Development Experience Improvements  
- **Streamlined workflow** - Consistent command patterns using workspace syntax
- **Enhanced debugging** - Better visibility into build process steps
- **Dependency validation** - Proper dependency declarations for all runtime types

### Fixed

#### TypeScript Runtime Compatibility
- **Serverless runtime types** - Added missing `@twilio-labs/serverless-runtime-types` dependency to server package
- **Import resolution** - Updated Twilio SDK imports to use modern direct import pattern:
  - `import AccessToken from 'twilio/lib/jwt/AccessToken'`
  - `const { ChatGrant } = AccessToken`
- **Response object handling** - Fixed Response class instantiation for Twilio runtime environment
- **Type checking** - Resolved TypeScript compilation errors in server functions

#### Build Process Issues
- **Command execution** - Fixed `twilio-run` command not found error using `npx` prefix
- **Asset deployment** - Ensured client assets correctly build to server directory
- **Dependency hoisting** - Resolved workspace dependency resolution issues

### Changed

#### Deployment Strategy (Breaking Change)
- **Twilio Functions only** - Removed support for standalone deployment options (Vercel, GitHub Codespaces, static hosting)
- **Integrated backend requirement** - Client no longer supports external token service URLs
- **Simplified configuration** - Eliminated need for `REACT_APP_ACCESS_TOKEN_SERVICE_URL` environment variable
- **Unified platform** - All deployments now target Twilio Functions platform exclusively

#### Build Script Organization
- **Root package.json scripts**:
  - `npm run build` - Complete build process (clean → client → server)
  - `npm run start` - Build and start server (replaces separate build + start)
  - `npm run deploy` - Build and deploy to Twilio Functions
  - `npm run clean` - Remove server/dist directory

#### Package Structure
- **Server package.json** - Simplified to essential scripts only (`test`, `build`, `start`)
- **Client package.json** - Removed redundant prebuild and complex BUILD_PATH handling
- **Consistent workspace patterns** - All commands use standardized workspace syntax

### Technical Details

#### Fixed Import Patterns
```typescript
// Before (causing TypeScript errors)
import { Response } from '@twilio/runtime-handler';

// After (working properly)
import AccessToken from 'twilio/lib/jwt/AccessToken';
const response = new (Response as any)();
```

#### Dependency Resolution
- **Runtime types properly declared** in server dependencies
- **Build tools accessible** via npx for cross-platform compatibility
- **Workspace commands** correctly reference child package scripts

### Migration Guide

#### From v2.0.x
- **Deployment platform change** - Only Twilio Functions deployment supported (Vercel/static hosting removed)
- **Environment variable removal** - Delete `REACT_APP_ACCESS_TOKEN_SERVICE_URL` from client/.env (no longer needed)
- **Configuration simplification** - Client automatically connects to integrated backend
- **Improved reliability** - Build process now more robust and predictable
- **Enhanced developer experience** - Simpler command structure and better error messages

#### New Recommended Workflow
```bash
# Development (builds and starts server)
npm run start

# Individual build steps (if needed)  
npm run clean
npm run build:client
npm run build:server

# Full deployment
npm run deploy
```

### Compatibility
- **Node.js 20+** - Required for Twilio serverless runtime
- **TypeScript 4.9+** - Full type checking and compilation support
- **All previous functionality preserved** - No feature regressions

---

*Build system enhanced with centralized orchestration and TypeScript runtime compatibility fixes.*

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