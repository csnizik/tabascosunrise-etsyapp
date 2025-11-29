# GitHub Copilot Instructions for TabascoSunrise Etsy App

## Project Overview

Automated Etsy-to-Facebook catalog sync system using Next.js 14+ (App Router), TypeScript, Vercel Edge Config, and Vercel Blob storage. Single-shop owner application (not multi-tenant SaaS).

## Tech Stack

- **Framework**: Next.js 14+ with App Router, TypeScript strict mode
- **Storage**: Vercel Edge Config (tokens), Vercel Blob (CSV feeds)
- **Styling**: Tailwind CSS (no CSS modules)
- **API**: Etsy Open API v3 (OAuth 2.0)
- **Testing**: Playwright for e2e validation
- **Deployment**: Vercel with Cron Jobs

## Code Style Standards

- TypeScript strict mode, async/await over promises
- Descriptive variable names, JSDoc for complex functions
- Next.js App Router conventions only
- Small, focused components
- Tailwind for all styling

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/etsy/{authorize,callback}/route.ts
│   │   ├── sync/{manual,cron}/route.ts
│   │   └── feed/route.ts
│   ├── dashboard/page.tsx
│   └── page.tsx
├── lib/
│   ├── etsy/{client,oauth,types}.ts
│   ├── facebook/{catalog,types}.ts
│   ├── storage/{edge-config,blob}.ts
│   └── utils/{logger,errors}.ts
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

### Etsy API Endpoints

**Get shop by name** (not user_id):
```
GET /v3/application/shops?shop_name=TabascoSunrise
```

**Get listings:**
```
GET /v3/application/shops/{shop_id}/listings/active
```

**Headers:**
```typescript
{
  'x-api-key': process.env.ETSY_API_KEY,
  'Authorization': `Bearer ${userId}.${accessToken}`
}
```

**Rate Limits:** 5 QPS, 5000 QPD - implement token bucket algorithm

### Facebook Catalog CSV

**Required fields (exact format):**
- id, title, description, availability, condition, price, link, image_link, brand
- Price: `"12.99 USD"` (convert from Etsy's `{amount: 1299, divisor: 100}`)
- Availability: Always `"in stock"` (digital products)
- Condition: Always `"new"`
- Brand: `"TabascoSunrise"`
- Escape quotes, commas, newlines in CSV

### Error Handling

- Wrap all external calls in try-catch with context logging
- Return appropriate HTTP status codes (401, 403, 500)
- Never expose secrets in errors
- Implement exponential backoff for 429/5xx errors
- Log: timestamp, endpoint, error message, context

### Security

- Validate `CRON_SECRET` for cron endpoints
- Never commit `.env.local`
- Sanitize user inputs
- Use PKCE + state for OAuth
- Use Vercel API token for Edge Config writes (not connection string token)

## Definition of Done (DoD)

**Every task MUST meet ALL criteria before marking complete:**

### 1. Code Quality

- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] ESLint passes with no warnings
- [ ] Code follows project style standards
- [ ] JSDoc comments on complex functions
- [ ] No hardcoded secrets or sensitive data

### 2. Functionality

- [ ] Feature works as described in acceptance criteria
- [ ] All edge cases handled (empty data, errors, missing fields)
- [ ] Error messages are clear and actionable
- [ ] Logging implemented for debugging

### 3. Testing (MANDATORY)

**For API Routes:**
- [ ] Unit tests for core logic functions
- [ ] Integration test mocking external APIs
- [ ] Error scenario tests (401, 403, 429, 500, network timeout)

**For UI Components:**
- [ ] Playwright e2e test covering happy path
- [ ] Screenshots captured showing:
  - Initial state
  - Loading state
  - Success state
  - Error state
- [ ] Test runs in CI environment successfully

**For Full Features:**
- [ ] Complete user flow tested end-to-end
- [ ] Screenshots prove feature works in browser
- [ ] Manual testing checklist completed

### 4. Documentation

- [ ] README updated if user-facing changes
- [ ] Environment variables documented
- [ ] API endpoints documented (if new)
- [ ] Known limitations noted

### 5. Deployment Readiness

- [ ] Works in production environment (not just localhost)
- [ ] Environment variables configured correctly
- [ ] No console errors in browser/logs
- [ ] Tested with real Etsy/Vercel APIs (not just mocks)

### 6. Pull Request Requirements

- [ ] PR description explains what/why
- [ ] Screenshots included for UI changes
- [ ] Test results included (pass/fail)
- [ ] Breaking changes clearly called out
- [ ] Closes relevant issue with `Closes #XX`

## Testing Requirements

### Playwright Setup

Create `tests/e2e/{feature}.spec.ts` for each user-facing feature:
```typescript
import { test, expect } from '@playwright/test';

test('OAuth flow completes successfully', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=Connect to Etsy');

  // Take screenshot at each step
  await page.screenshot({ path: 'tests/screenshots/oauth-start.png' });

  // Continue test...
  await expect(page.locator('text=Connected')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/oauth-success.png' });
});
```

### Required Test Coverage

- **OAuth flow**: Start → Etsy consent → Callback → Dashboard
- **Manual sync**: Click button → Loading → Success/Error
- **Feed URL**: Copy button → Clipboard check
- **Error states**: Expired auth, API failures, network errors

### Screenshot Requirements

Each test MUST capture:
1. Initial state (before action)
2. Loading/processing state
3. Success state (with visible confirmation)
4. Error state (with clear error message)

Save to: `tests/screenshots/{feature}-{state}.png`

## Environment Variables
```env
# Etsy (from Developer Portal)
ETSY_API_KEY=x9asgw4xr1qujte68pus54al
ETSY_SHARED_SECRET=j56ebg2tbr
ETSY_REDIRECT_URI=http://localhost:3000/api/auth/etsy/callback
ETSY_SCOPES=listings_r shops_r

# Vercel (auto-set when connected)
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_xxx?token=xxx
EDGE_CONFIG_ID=ecfg_xxx
EDGE_CONFIG_TOKEN=vercel_token_xxx (Vercel API token, not connection string token)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Security
CRON_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

## Common Patterns

### Etsy API with Auto-Refresh
```typescript
async function fetchWithRefresh(endpoint: string) {
  const token = await getValidToken(); // Auto-refreshes if needed
  const response = await fetch(`https://api.etsy.com/v3${endpoint}`, {
    headers: {
      'x-api-key': process.env.ETSY_API_KEY!,
      'Authorization': `Bearer ${token.userId}.${token.accessToken}`
    }
  });

  if (!response.ok) {
    throw new EtsyApiError(response.status, await response.text());
  }

  return response.json();
}
```

### Edge Config Operations
```typescript
import { patch } from '@vercel/edge-config';

// Write (using Vercel API token)
await patch(process.env.EDGE_CONFIG_ID!, [
  { operation: 'upsert', key: 'etsy_tokens', value: tokens }
]);

// Wait for propagation
await new Promise(resolve => setTimeout(resolve, 1000));

// Read
import { get } from '@vercel/edge-config';
const tokens = await get('etsy_tokens');
```

## Known Issues & Workarounds

1. **Edge Config write tokens**: Use Vercel API token (starts with `vercel_token_`), not connection string token
2. **OAuth state expiry**: 15-minute TTL, cleanup after use
3. **Etsy API endpoint**: Use `/shops?shop_name=TabascoSunrise`, not `/users/{id}/shops`
4. **Rate limiting**: Implement before hitting limits (5 QPS, 5K QPD)

## Issue Sizing Guide

- **XS (1-2h)**: Single file, no dependencies, minimal testing
- **S (2-4h)**: 2-3 files, clear requirements, standard testing
- **M (4-8h)**: Multiple files, some investigation, comprehensive testing
- **L (8-16h)**: Major feature, multiple dependencies, extensive testing
- **XL (16+h)**: Break into smaller issues

**Rule**: If sizing XL, split into multiple M/L issues.

## Pre-Flight Checklist (Before Starting Work)

- [ ] Read issue acceptance criteria completely
- [ ] Understand DoD requirements
- [ ] Identify test scenarios needed
- [ ] Plan screenshot capture points
- [ ] Check for dependencies on other issues
- [ ] Review related code in codebase

## Validation Checklist (Before Requesting Review)

- [ ] All DoD items checked
- [ ] Playwright tests written and passing
- [ ] Screenshots captured and included in PR
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Tested in production-like environment
- [ ] PR description complete with test results

## Notes

- Single shop owner app (not multi-tenant)
- Digital products only (no inventory tracking)
- Reliability > Features
- Conservative rate limiting
- Edge Config sufficient (no database needed)
