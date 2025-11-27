# GitHub Copilot Instructions for TabascoSunrise Etsy App

## Project Overview

Building an automated Etsy-to-Facebook catalog sync system using Next.js 14+ (App Router), TypeScript, Vercel Edge Config, and Vercel Blob storage.

## Tech Stack

- **Framework**: Next.js 14+ with App Router, TypeScript
- **Storage**: Vercel Edge Config (tokens), Vercel Blob (CSV feeds)
- **Styling**: Tailwind CSS
- **API**: Etsy Open API v3 (OAuth 2.0)
- **Deployment**: Vercel with Cron Jobs

## Code Style Preferences

- Use TypeScript strict mode
- Prefer async/await over promises
- Use descriptive variable names
- Add JSDoc comments for complex functions
- Use Next.js App Router conventions (not Pages Router)
- Keep components small and focused
- Use Tailwind for all styling (no CSS modules)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/etsy/
│   │   │   ├── callback/route.ts    # OAuth callback handler
│   │   │   └── authorize/route.ts   # Initiate OAuth flow
│   │   ├── sync/
│   │   │   ├── manual/route.ts      # Manual sync trigger
│   │   │   └── cron/route.ts        # Automated cron sync
│   │   └── feed/route.ts            # Serve CSV feed to Facebook
│   ├── dashboard/
│   │   └── page.tsx                 # Dashboard UI
│   └── page.tsx                     # Landing/auth page
├── lib/
│   ├── etsy/
│   │   ├── client.ts               # Etsy API client
│   │   ├── oauth.ts                # OAuth helper functions
│   │   └── types.ts                # Etsy API type definitions
│   ├── facebook/
│   │   ├── catalog.ts              # Catalog formatter
│   │   └── types.ts                # Facebook catalog types
│   ├── storage/
│   │   ├── edge-config.ts          # Token storage operations
│   │   └── blob.ts                 # CSV feed storage
│   └── utils/
│       ├── logger.ts               # Logging utility
│       └── errors.ts               # Error handling
└── types/
    └── index.ts                    # Shared type definitions
```

## Key Implementation Requirements

### 1. OAuth Flow (PKCE)

- Generate code_verifier and code_challenge using crypto
- Store state and code_verifier in Edge Config during flow
- Exchange authorization code for access_token and refresh_token
- Store tokens securely in Edge Config
- Access token expires in 1 hour, refresh token in 90 days

### 2. Token Management

- Check token expiry before each API call
- Auto-refresh tokens when needed
- Handle refresh token expiration gracefully
- Edge Config keys: `etsy_access_token`, `etsy_refresh_token`, `etsy_token_expiry`

### 3. Etsy API Integration

Required endpoints:

- GET `/v3/application/shops/{shop_id}/listings/active` - Fetch active listings
- GET `/v3/application/shops/{shop_id}` - Get shop details
- POST `/v3/public/oauth/token` - Get/refresh tokens

Headers required:

```typescript
{
  'x-api-key': process.env.ETSY_API_KEY,
  'Authorization': `Bearer ${userId}.${accessToken}`
}
```

### 4. Facebook Catalog CSV Format

Required fields (CSV headers):
- id (listing_id)
- title (listing title)
- description (listing description)
- availability (in stock / out of stock)
- condition (new)
- price (format: "19.99 USD")
- link (Etsy listing URL)
- image_link (primary image URL)
- brand (shop name: "TabascoSunrise")

### 5. Error Handling
- Wrap all external API calls in try-catch
- Log errors with context
- Return appropriate HTTP status codes
- Never expose secrets in error messages
- Handle rate limits (5 QPS, 5000 QPD)

### 6. Security

- Validate CRON_SECRET for cron endpoints
- Never commit .env.local
- Sanitize all user inputs
- Use PKCE for OAuth (not just state)
- Store tokens encrypted in Edge Config

## Environment Variables Reference

```
ETSY_API_KEY - From Etsy Developer Portal
ETSY_SHARED_SECRET - From Etsy Developer Portal
ETSY_REDIRECT_URI - OAuth callback URL
ETSY_SCOPES - OAuth scopes (listings_r shops_r)
EDGE_CONFIG - Auto-set by Vercel
BLOB_READ_WRITE_TOKEN - Auto-set by Vercel
CRON_SECRET - Random secret for cron auth
```

## Common Patterns

### Etsy API Call with Auto-Refresh

```typescript
async function fetchWithRefresh(endpoint: string) {
  const token = await getValidToken(); // Checks expiry, refreshes if needed
  const response = await fetch(`https://api.etsy.com/v3${endpoint}`, {
    headers: {
      'x-api-key': process.env.ETSY_API_KEY!,
      'Authorization': `Bearer ${token.userId}.${token.accessToken}`
    }
  });
  return response.json();
}
```

### Edge Config Token Operations

```typescript
import { get, set } from '@vercel/edge-config';

// Store token
await set('etsy_tokens', {
  access_token,
  refresh_token,
  expires_at: new Date(Date.now() + 3600000).toISOString()
});

// Retrieve token
const tokens = await get('etsy_tokens');
```

## Testing Locally

- Use `http://localhost:3000` for redirect URI during dev
- Update Etsy app settings to include localhost callback
- Run: `npm run dev`
- Test OAuth: Visit `/api/auth/etsy/authorize`

## Deployment Checklist

1. Create Edge Config in Vercel Dashboard
2. Connect Edge Config to project
3. Create Blob store in Vercel Dashboard
4. Update ETSY_REDIRECT_URI to production URL
5. Update Etsy app callback URL to production
6. Set up Vercel Cron Job for `/api/sync/cron`
7. Test manual sync via dashboard

## Current Status

- [x] Project initialized
- [x] Dependencies installed
- [ ] OAuth flow implementation
- [ ] Token management in Edge Config
- [ ] Etsy API client
- [ ] Facebook catalog formatter
- [ ] CSV generation and Blob storage
- [ ] Dashboard UI
- [ ] Cron job setup

## Issue Sizing Guidelines

Use t-shirt sizing for all issues based on these criteria:

### XS (Extra Small) - 1-2 hours

**Characteristics:**
- Single file change or creation
- Well-defined with clear acceptance criteria
- No dependencies on other tasks
- Minimal testing required
- Low complexity, straightforward implementation

**Examples:**
- Add a simple utility function
- Update environment variable
- Add TypeScript interface
- Create a basic UI component with existing patterns
- Fix typo or update documentation

### S (Small) - 2-4 hours
**Characteristics:**
- 2-3 related files
- Clear requirements with minimal ambiguity
- May have 1-2 minor dependencies
- Standard testing needed
- Moderate complexity

**Examples:**
- Implement a single API route
- Create a form with validation
- Add logging to existing service
- Build a simple data transformer
- Wire up existing components

### M (Medium) - 4-8 hours (1 day)

**Characteristics:**
- Multiple files across 2-3 directories
- Requires some investigation or design decisions
- Has several dependencies
- Comprehensive testing needed
- Moderate to high complexity

**Examples:**
- Complete OAuth callback flow
- Build a dashboard page with multiple features
- Implement token refresh logic
- Create CSV generator with validation
- Full CRUD operations for a resource

### L (Large) - 8-16 hours (2 days)

**Characteristics:**
- Major feature spanning multiple directories
- Requires design discussion or research
- Multiple dependencies and integration points
- Extensive testing and edge cases
- High complexity or unfamiliar territory

**Examples:**
- Complete OAuth flow (authorize + callback + storage)
- Full Etsy API client with error handling
- End-to-end sync service
- Dashboard with real-time status updates
- Complex state management implementation

### XL (Extra Large) - 16+ hours (3+ days)

**Characteristics:**
- Epic-level feature or major refactor
- Multiple sub-tasks that could be separate issues
- Significant architectural decisions
- Cross-cutting concerns affecting many files
- Should likely be broken down into smaller issues

**Examples:**
- Complete MVP from scratch
- Major architecture refactor
- Multiple related features as one unit
- Full integration with external service (all endpoints)
- Performance optimization across entire app

**NOTE:** If you're sizing something as XL, strongly consider breaking it into multiple L or M issues instead.

### Sizing Decision Tree

1. **How many files?**
   - 1 file → XS or S
   - 2-3 files → S or M
   - 4-6 files → M or L
   - 7+ files → L or XL

2. **How familiar is the pattern?**
   - Copy existing pattern → -1 size
   - New pattern, clear docs → Same size
   - Unfamiliar, needs research → +1 size

3. **How many dependencies?**
   - None → -1 size
   - 1-2 → Same size
   - 3+ → +1 size

4. **Testing complexity?**
   - Simple unit test → Same size
   - Integration test needed → +1 size
   - Multiple test scenarios → +1 size

5. **Risk level?**
   - Low (easy rollback) → Same size
   - Medium (affects other features) → +1 size
   - High (critical path) → +1 size

### Examples from This Project

**XS Issues:**
- Add EtsyListing type definition
- Create logger utility
- Add environment variable

**S Issues:**
- Implement PKCE helper functions
- Create authorize route
- Build basic dashboard layout

**M Issues:**
- Complete OAuth callback with token storage
- Implement token refresh logic
- Build Facebook CSV formatter
- Create manual sync API endpoint

**L Issues:**
- Full OAuth flow (authorize + callback + storage + error handling)
- Etsy API client with rate limiting and retries
- Dashboard with status, manual trigger, and error display

**XL Issues:**
- Complete end-to-end sync pipeline
- Full MVP from current state

## Notes for Copilot

- This is for a single shop owner (me), not a multi-tenant SaaS
- No database needed - Edge Config is sufficient
- Focus on reliability over features
- Digital products (PDFs) - no inventory tracking needed
- Rate limit: 5 requests/sec, 5000/day - be conservative
