# GitHub Copilot Instructions for TabascoSunrise Etsy App

## Project Overview

Etsy shop management assistant providing automated catalog sync, analytics, and workflow automation. Built with Next.js 14+ (App Router), TypeScript, Vercel Edge Config, and Vercel Blob storage. Single-shop owner application.

## Tech Stack

- **Framework**: Next.js 14+ with App Router, TypeScript strict mode
- **Storage**: Vercel Edge Config (configuration/tokens), Vercel Blob (file storage)
- **Styling**: Tailwind CSS (no CSS modules)
- **API**: Etsy Open API v3 (OAuth 2.0)
- **Testing**: Playwright for E2E validation (on-demand)
- **Deployment**: Vercel with Cron Jobs

## Code Style Standards

- TypeScript strict mode, async/await over promises
- Descriptive variable names, JSDoc for complex functions
- Next.js App Router conventions only
- Small, focused components with single responsibility
- Tailwind for all styling (utility-first approach)
- Prefer composition over inheritance
- Extract reusable logic into `/lib` utilities

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/etsy/{authorize,callback}/route.ts
│   │   ├── sync/{manual,cron}/route.ts
│   │   ├── feed/route.ts
│   │   └── [feature]/route.ts
│   ├── dashboard/page.tsx
│   └── page.tsx
├── lib/
│   ├── etsy/{client,oauth,types}.ts
│   ├── facebook/{catalog,types}.ts
│   ├── storage/{edge-config,blob}.ts
│   ├── analytics/[feature].ts
│   └── utils/{logger,errors}.ts
├── components/
│   ├── ui/{button,card,dialog}.tsx
│   └── [feature]/{Component}.tsx
└── types/index.ts
```

## Critical Requirements

### OAuth Implementation (PKCE Required)

- Generate code_verifier (128 chars), code_challenge (SHA256 base64url)
- Store state + code_verifier in Edge Config with 15-minute TTL
- Delete state immediately after validation in callback
- Handle Edge Config propagation delay (wait 1 second after write)
- Token format: `${userId}.${accessToken}`

### Token Management

- Check expiry 5 minutes early to avoid race conditions
- Auto-refresh before each API call
- Store: `{ access_token, refresh_token, expires_at: ISO string, user_id }`
- Access token: 1 hour, Refresh token: 90 days

### Etsy API Integration

**Get shop by name** (not user_id):
```
GET /v3/application/shops?shop_name={shop_name}
```

**Get listings with images**:
```
GET /v3/application/listings?listing_ids={ids}&includes=Images
```

**Headers:**
```typescript
{
  'x-api-key': process.env.ETSY_API_KEY,
  'Authorization': `Bearer ${accessToken}` // Note: Do NOT prepend user_id
}
```

**Rate Limits:** 5 QPS, 5000 QPD - implement token bucket algorithm

### Facebook Catalog CSV Format

**Required fields (exact order):**
```
id,title,description,availability,condition,price,link,image_link,additional_image_link,brand
```

**Field transformations:**
- Price: `"12.99 USD"` (convert from Etsy's `{amount: 1299, divisor: 100}`)
- Availability: `"in stock"` or `"out of stock"`
- Condition: Always `"new"`
- Brand: Shop name
- image_link: `images[0].url_fullxfull`
- additional_image_link: Comma-separated URLs of images[1-8]
- Escape quotes, commas, newlines in CSV

### Error Handling

- Wrap all external calls in try-catch with context logging
- Return appropriate HTTP status codes (401, 403, 429, 500)
- Never expose secrets in errors
- Implement exponential backoff for 429/5xx errors
- Log: timestamp, endpoint, error message, context
- Use custom error classes from `lib/utils/errors.ts`

### Security

- Validate `CRON_SECRET` for cron endpoints
- Never commit `.env.local`
- Sanitize user inputs
- Use PKCE + state for OAuth
- Use Vercel API token for Edge Config writes
- Check authorization before returning sensitive data

## Definition of Done (DoD)

**Every task MUST meet ALL criteria before marking complete:**

### 1. Code Quality

- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] ESLint passes with no warnings
- [ ] Code follows project style standards
- [ ] JSDoc comments on complex functions
- [ ] No hardcoded secrets or sensitive data
- [ ] No `any` types without justification
- [ ] Error handling for all async operations

### 2. Functionality

- [ ] Feature works as described in acceptance criteria
- [ ] All edge cases handled (empty data, errors, missing fields)
- [ ] Error messages are clear and actionable
- [ ] Logging implemented for debugging
- [ ] Works with real APIs (not just mocks)

### 3. Testing Strategy (Conditional)

**Determine testing needs based on change type:**

#### Backend/API Changes (No UI Impact)
- [ ] TypeScript compilation verified
- [ ] Production build succeeds
- [ ] Code reviewed for logic errors
- [ ] Manual API testing completed
- **Skip E2E tests** - no browser interaction

#### Frontend/UI Changes
- [ ] All backend checks above
- [ ] Playwright E2E test written
- [ ] Test covers happy path + error states
- [ ] Screenshots captured (see Testing Requirements)
- [ ] Manual browser testing completed

**When to write E2E tests:**
- ✅ New user-facing features
- ✅ UI component changes
- ✅ User flows (OAuth, sync, dashboard)
- ❌ API endpoints only
- ❌ Type definitions
- ❌ Utility functions
- ❌ CSS/styling-only changes (manual verification)

### 4. Documentation

- [ ] README updated if user-facing changes
- [ ] Environment variables documented
- [ ] API endpoints documented (if new)
- [ ] Known limitations noted

### 5. Deployment Readiness

- [ ] Works in production environment (not just localhost)
- [ ] Environment variables configured correctly
- [ ] No console errors in browser/logs
- [ ] Tested with real Etsy/Vercel APIs

### 6. Pull Request Requirements

- [ ] PR description explains what/why
- [ ] Screenshots included for UI changes
- [ ] Breaking changes clearly called out
- [ ] Closes relevant issue with `Closes #XX`

## Testing Requirements

### When to Write E2E Tests

**Write Playwright tests for:**
- User authentication flows
- Data entry forms
- Dashboard interactions
- Visual state changes
- Multi-step workflows

**Skip Playwright tests for:**
- API route changes without UI
- Type definition updates
- Utility function additions
- Backend service changes
- CSV generation logic (unit test instead)

### Playwright Test Structure

Create `tests/e2e/{feature}.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('happy path description', async ({ page }) => {
    // Navigate
    await page.goto('http://localhost:3000/dashboard');

    // Screenshot: Initial state
    await page.screenshot({
      path: 'tests/screenshots/feature-initial.png',
      fullPage: true
    });

    // Interact
    await page.click('text=Sync Now');

    // Screenshot: Loading state
    await page.screenshot({
      path: 'tests/screenshots/feature-loading.png'
    });

    // Assert success
    await expect(page.locator('text=Sync Complete')).toBeVisible();

    // Screenshot: Success state
    await page.screenshot({
      path: 'tests/screenshots/feature-success.png'
    });
  });

  test('error state', async ({ page }) => {
    // Test error handling...
    await page.screenshot({
      path: 'tests/screenshots/feature-error.png'
    });
  });
});
```

### Screenshot Requirements (When E2E Tests Required)

Each test MUST capture:
1. **Initial state** - Before user action
2. **Loading state** - During processing
3. **Success state** - Confirmation visible
4. **Error state** - Clear error message

Save to: `tests/screenshots/{feature}-{state}.png`

### Running Tests

**During Development:**
```bash
npm run dev          # Start dev server
npm run test:e2e     # Run Playwright tests
```

**In CI (On-Demand):**
- E2E tests run via separate workflow
- Triggered by: `@copilot run e2e tests` comment
- Or manually via Actions tab

## Environment Variables
```env
# Etsy API (from Developer Portal)
ETSY_API_KEY=
ETSY_SHARED_SECRET=
ETSY_REDIRECT_URI=https://your-app.vercel.app/api/auth/etsy/callback
ETSY_SCOPES=listings_r shops_r

# Shop Configuration
ETSY_SHOP_NAME=TabascoSunrise

# Vercel (auto-set when storage connected)
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_xxx?token=xxx
EDGE_CONFIG_ID=ecfg_xxx
EDGE_CONFIG_TOKEN=vercel_token_xxx  # Vercel API token for writes
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Security
CRON_SECRET=<generate: openssl rand -base64 32>
```

## Common Patterns

### Etsy API with Auto-Refresh
```typescript
async function makeAuthenticatedRequest(endpoint: string) {
  const tokens = await getValidTokens(); // Auto-refreshes if needed

  const response = await fetch(`https://api.etsy.com/v3${endpoint}`, {
    headers: {
      'x-api-key': process.env.ETSY_API_KEY!,
      'Authorization': `Bearer ${tokens.access_token}` // Just access_token
    }
  });

  if (!response.ok) {
    throw new EtsyApiError(response.status, endpoint, await response.text());
  }

  return response.json();
}
```

### Edge Config Operations
```typescript
import { patch } from '@vercel/edge-config';
import { get } from '@vercel/edge-config';

// Write (requires EDGE_CONFIG_TOKEN)
await patch(process.env.EDGE_CONFIG_ID!, [
  { operation: 'upsert', key: 'etsy_tokens', value: tokens }
]);

// Wait for propagation (critical for OAuth)
await new Promise(resolve => setTimeout(resolve, 1000));

// Read (uses EDGE_CONFIG connection string)
const tokens = await get('etsy_tokens');
```

### Blob Storage Operations
```typescript
import { put } from '@vercel/blob';

const blob = await put('catalog.csv', csvContent, {
  access: 'public',
  contentType: 'text/csv',
});

// Returns: { url: string, downloadUrl: string }
```

## Workflow Optimization Rules

**CRITICAL: Minimize CI/CD overhead**

### Setup Workflow (copilot-setup-steps.yml)

**ALWAYS include:**
- Repository checkout
- Node.js setup with npm cache
- Dependency installation (`npm ci`)
- TypeScript compilation check
- Production build verification
- Security checks

**NEVER include by default:**
- Playwright browser installation
- E2E test execution
- Development server startup
- Unit test runs (unless specifically needed)

**Reasoning:** Setup workflow validates code compiles and builds. E2E testing happens on-demand in separate workflow.

### E2E Workflow (e2e-on-demand.yml)

**Only triggers when:**
- Manual dispatch requested
- Comment: `@copilot run e2e tests`
- UI files changed (`src/app/**/page.tsx`, `src/components/**`)

**Never triggers for:**
- API route changes only
- Type definition changes
- Utility function changes
- Documentation updates

### Decision Tree: Which Workflow?
```
Does this PR change user-visible UI?
├─ No → Use lean setup workflow only
│         - TypeScript check
│         - Build verification
│         - Skip E2E tests
│
└─ Yes → Use setup + trigger E2E
          - Setup validates compilation
          - E2E validates user experience
          - Comment to trigger: @copilot run e2e tests
```

## Issue Sizing Guide

- **XS (1-2h)**: Single file, no dependencies, no E2E tests needed
- **S (2-4h)**: 2-3 files, clear requirements, maybe E2E test
- **M (4-8h)**: Multiple files, some investigation, E2E tests likely
- **L (8-16h)**: Major feature, multiple dependencies, comprehensive E2E
- **XL (16+h)**: Break into smaller issues

**Rule**: If sizing XL, split into multiple M/L issues.

## Pre-Flight Checklist (Before Starting Work)

- [ ] Read issue acceptance criteria completely
- [ ] Determine if E2E tests needed (UI changes?)
- [ ] Understand DoD requirements
- [ ] Identify test scenarios needed
- [ ] Check for dependencies on other issues
- [ ] Review related code in codebase

## Validation Checklist (Before Requesting Review)

- [ ] All DoD items checked
- [ ] TypeScript compiles without errors
- [ ] Production build succeeds
- [ ] E2E tests written IF UI changes (otherwise skip)
- [ ] Manual testing completed
- [ ] No console errors
- [ ] PR description complete

## Known Issues & Workarounds

1. **Edge Config tokens**: Use Vercel API token (`EDGE_CONFIG_TOKEN`) for writes, connection string (`EDGE_CONFIG`) for reads
2. **OAuth state**: 15-minute TTL, wait 1 second after write for propagation
3. **Etsy Authorization header**: Use `Bearer ${access_token}` - do NOT prepend `user_id`
4. **Rate limiting**: Implement before hitting limits (5 QPS, 5000 QPD)

## Etsy API Common Gotchas

### ❌ Wrong: Including user_id in Authorization
```typescript
Authorization: `Bearer ${user_id}.${access_token}` // WRONG
```

### ✅ Right: Just the access token
```typescript
Authorization: `Bearer ${access_token}` // CORRECT
```

### ❌ Wrong: Using getShopsByUser
```typescript
GET /v3/application/users/{user_id}/shops // NOT AVAILABLE
```

### ✅ Right: Using shop name
```typescript
GET /v3/application/shops?shop_name=TabascoSunrise // CORRECT
```

## Notes

- Single shop owner app (not multi-tenant)
- Reliability > Features
- Conservative rate limiting
- Edge Config sufficient for configuration storage
- Blob storage for generated files
- Minimize CI time - test only what's necessary
