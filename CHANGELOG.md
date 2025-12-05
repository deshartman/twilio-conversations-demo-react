# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2025-12-05

### pnpm Support & Missing Dependencies

This release adds full pnpm package manager support and fixes missing Twilio Paste component dependencies.

### Added

#### pnpm Package Manager Support
- **pnpm-workspace.yaml** - Created workspace configuration for pnpm monorepo support
- **Package manager documentation** - Updated README with comprehensive pnpm installation and usage instructions
- **Troubleshooting guide** - Added detailed section for package manager issues and common errors
- **Alternative installation methods** - Documented both pnpm (recommended) and npm (alternative) workflows

#### Missing Twilio Paste Dependencies
Added 8 missing @twilio-paste packages that were imported but not declared in dependencies:
- `@twilio-paste/button` (^14.0.0) - Button components used throughout the UI
- `@twilio-paste/help-text` (^13.0.0) - Help text components for forms
- `@twilio-paste/input` (^9.0.0) - Input field components
- `@twilio-paste/label` (^13.0.0) - Label components for form fields
- `@twilio-paste/media-object` (^10.0.0) - Media object layout components
- `@twilio-paste/menu` (^14.0.0) - Menu and dropdown components
- `@twilio-paste/modal` (^16.0.0) - Modal dialog components
- `@twilio-paste/toast` (^12.0.0) - Toast notification components

### Fixed

#### Build Failures
- **Module not found errors** - Resolved "Can't resolve '@twilio-paste/button'" and similar errors
- **Workspace dependency resolution** - Fixed pnpm workspace recognition issues
- **Peer dependency conflicts** - Ensured all Twilio Paste packages use compatible versions

#### Documentation
- **Prerequisites section** - Added explicit package manager requirements
- **Quick Start Checklist** - Added package manager setup item
- **Installation instructions** - Rewritten with pnpm as primary option
- **Troubleshooting section** - Comprehensive package manager issue resolution guide

### Changed

#### README.md Enhancements
- **pnpm-first approach** - Installation instructions now prioritize pnpm with npm as alternative
- **Workspace configuration explanation** - Documents the role of pnpm-workspace.yaml file
- **Expected warnings documented** - Explains that pnpm workspace warning is normal and expected
- **Command equivalence noted** - Clarifies that `pnpm run` works wherever `npm run` is used

#### Package Manager Workflow
- **Consistent commands** - All npm commands work with pnpm (e.g., `pnpm run dev`)
- **Lock file guidance** - Clear instructions on managing multiple lock files
- **Fresh install procedures** - Documented cleanup steps when switching package managers

### Technical Details

#### Dependency Versions
All added Twilio Paste packages use versions compatible with existing packages:
- Version ranges chosen to match peer dependencies (avoiding v15+ button with other v14 components)
- No peer dependency warnings after installation
- Full compatibility with @twilio-paste/core ^20.12.0

#### Workspace Configuration
```yaml
# pnpm-workspace.yaml
packages:
  - 'client'
  - 'server'
```

### Migration Guide

#### Using pnpm (Recommended)
```bash
# Clean existing installations
rm -rf node_modules client/node_modules server/node_modules

# Remove npm lock files (keep pnpm-lock.yaml)
rm package-lock.json client/package-lock.json server/package-lock.json
rm server/yarn.lock

# Install with pnpm (workspace config now included)
pnpm install

# Run development server
pnpm run dev
```

#### Using npm (Alternative)
```bash
# Requires npm 7+ for workspace support
npm install
npm run dev
```

### Compatibility
- **Node.js 20+** - Required (matches server engine requirement)
- **Node.js 22** - Tested and working (shows engine warning but functions correctly)
- **pnpm 10.x** - Fully supported
- **npm 7+** - Workspace support required

---

*pnpm monorepo support added with all missing dependencies resolved.*

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