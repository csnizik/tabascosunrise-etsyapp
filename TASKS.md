# Development Tasks

## Phase 1: Core Infrastructure

### Task 1: Environment & Types Setup
- [ ] Create `src/types/index.ts` with Etsy and Facebook type definitions
- [ ] Create `src/lib/utils/logger.ts` for logging
- [ ] Create `src/lib/utils/errors.ts` for custom error classes
- [ ] Test: Verify types compile without errors

### Task 2: OAuth Implementation
- [ ] Create `src/lib/etsy/oauth.ts` with PKCE helpers
- [ ] Create `src/app/api/auth/etsy/authorize/route.ts`
- [ ] Create `src/app/api/auth/etsy/callback/route.ts`
- [ ] Test: Complete OAuth flow locally

### Task 3: Token Management
- [ ] Create `src/lib/storage/edge-config.ts` for token operations
- [ ] Implement token refresh logic in `src/lib/etsy/client.ts`
- [ ] Add token expiry checking
- [ ] Test: Token refresh works automatically

### Task 4: Etsy API Client
- [ ] Create `src/lib/etsy/client.ts` with API methods
- [ ] Implement `getShopListings()` method
- [ ] Implement `getShopDetails()` method
- [ ] Add rate limiting logic
- [ ] Test: Fetch listings successfully

### Task 5: Facebook Catalog Generator
- [ ] Create `src/lib/facebook/catalog.ts`
- [ ] Implement CSV formatter
- [ ] Handle missing/optional fields
- [ ] Test: Generate valid CSV from mock data

### Task 6: Blob Storage
- [ ] Create `src/lib/storage/blob.ts`
- [ ] Implement CSV upload to Vercel Blob
- [ ] Generate stable feed URL
- [ ] Test: Upload and retrieve CSV

### Task 7: Sync Service
- [ ] Create `src/app/api/sync/manual/route.ts`
- [ ] Implement full sync logic
- [ ] Add error handling
- [ ] Test: Manual sync works end-to-end

### Task 8: Dashboard UI
- [ ] Create `src/app/dashboard/page.tsx`
- [ ] Show auth status
- [ ] Show last sync info
- [ ] Add manual sync button
- [ ] Display feed URL
- [ ] Test: UI loads and functions correctly

### Task 9: Cron Job
- [ ] Create `src/app/api/sync/cron/route.ts`
- [ ] Add CRON_SECRET validation
- [ ] Configure Vercel cron schedule
- [ ] Test: Cron triggers successfully

### Task 10: Feed Endpoint
- [ ] Create `src/app/api/feed/route.ts`
- [ ] Serve CSV from Blob
- [ ] Add caching headers
- [ ] Test: Facebook can read feed

## Phase 2: Polish & Deploy
- [ ] Add loading states to dashboard
- [ ] Add error messages to UI
- [ ] Write README with setup instructions
- [ ] Deploy to Vercel
- [ ] Configure production environment variables
- [ ] Test production OAuth flow
- [ ] Connect to Facebook Business Manager
- [ ] Verify catalog syncs

## Current Status
Working on: Task 1 - Environment & Types Setup
