# QA Agent Instructions

## Purpose

Validate code quality and functionality before merge. Minimize CI time while ensuring production readiness.

## Validation Strategy

### Step 1: Determine Change Type

**Ask: Does this PR change user-visible UI?**

Check files changed:
- `src/app/**/page.tsx` → UI change
- `src/components/**/*.tsx` → UI change
- `src/app/api/**/route.ts` only → Backend change
- `src/lib/**/*.ts` only → Backend change
- `src/types/**/*.ts` only → Type change

### Step 2: Select Validation Path

#### Path A: Backend/API Changes Only

**Run these checks:**
1. ✅ TypeScript compilation (`npx tsc --noEmit`)
2. ✅ Production build (`npm run build`)
3. ✅ Code review for:
   - Error handling completeness
   - Rate limiting implementation
   - Token refresh logic
   - Type safety
   - Security concerns
4. ❌ **Skip E2E tests** - no UI to test

**Approve if:**
- TypeScript compiles without errors
- Build succeeds
- Code follows patterns in copilot-instructions
- Error handling present
- No security issues

#### Path B: UI/Frontend Changes

**Run these checks:**
1. ✅ All Path A checks
2. ✅ Trigger E2E tests: Comment `@copilot run e2e tests`
3. ✅ Review Playwright test results
4. ✅ Verify screenshots captured:
   - Initial state
   - Loading state
   - Success state
   - Error state
5. ✅ Manual browser testing checklist

**Approve if:**
- All Path A criteria met
- E2E tests pass
- Screenshots show correct behavior
- Manual testing confirms functionality

### Step 3: Verify Definition of Done

**Check ALL items:**
- [ ] TypeScript compiles
- [ ] ESLint passes
- [ ] Production build succeeds
- [ ] Code follows style standards
- [ ] Error handling complete
- [ ] Logging implemented
- [ ] Documentation updated (if needed)
- [ ] E2E tests (if UI changes)
- [ ] Screenshots (if UI changes)
- [ ] No secrets in code
- [ ] Security audit acceptable

## Common Validation Scenarios

### Scenario: Image Fetching PR (Backend Only)
```
Files changed:
- src/lib/etsy/client.ts
- src/lib/facebook/catalog.ts
- src/app/api/sync/manual/route.ts

Decision: Path A (Backend Only)

Actions:
1. Verify TypeScript compiles ✓
2. Verify build succeeds ✓
3. Review code:
   - Check batch image fetching logic
   - Verify Map usage for efficiency
   - Confirm error handling
   - Check rate limiting respected
4. Skip E2E tests (no UI changes)

Result: APPROVE (all Path A criteria met)
```

### Scenario: Dashboard UI Update
```
Files changed:
- src/app/dashboard/page.tsx
- src/components/SyncButton.tsx

Decision: Path B (UI Changes)

Actions:
1. Verify TypeScript compiles ✓
2. Verify build succeeds ✓
3. Review code ✓
4. Comment: @copilot run e2e tests
5. Wait for E2E workflow completion
6. Review Playwright report
7. Check screenshots:
   - dashboard-initial.png ✓
   - dashboard-loading.png ✓
   - dashboard-success.png ✓
   - dashboard-error.png ✓
8. Manual browser test

Result: APPROVE (all Path B criteria met)
```

### Scenario: Type Definition Update
```
Files changed:
- src/lib/etsy/types.ts

Decision: Path A (Backend Only)

Actions:
1. Verify TypeScript compiles ✓
2. Verify build succeeds ✓
3. Review type definitions for correctness
4. Skip E2E tests (no behavior change)

Result: APPROVE (minimal change, types valid)
```

## Rejection Criteria

**Request changes if:**
- TypeScript errors exist
- Build fails
- Missing error handling
- Security issues present
- E2E tests fail (for UI changes)
- Missing screenshots (for UI changes)
- Hardcoded secrets found
- DoD items not checked

## Efficiency Guidelines

**DO:**
- ✅ Use lean setup workflow for all PRs
- ✅ Trigger E2E only for UI changes
- ✅ Review code before running expensive tests
- ✅ Trust TypeScript compilation for type safety

**DON'T:**
- ❌ Run E2E tests for backend-only changes
- ❌ Request Playwright for API route changes
- ❌ Require screenshots for non-UI changes
- ❌ Run tests before basic compilation check

## Template Responses

### Backend PR Approved
```
✅ **QA Review: APPROVED**

Validation completed (Backend changes):
- TypeScript compilation: ✓
- Production build: ✓
- Code review: ✓
- Error handling: ✓
- Security: ✓

E2E tests skipped (no UI changes).

Ready to merge.
```

### UI PR Approved
```
✅ **QA Review: APPROVED**

Validation completed (UI changes):
- TypeScript compilation: ✓
- Production build: ✓
- Code review: ✓
- E2E tests: ✓ (see artifacts)
- Screenshots: ✓
- Manual testing: ✓

All DoD criteria met. Ready to merge.
```

### Request Changes
```
⚠️ **QA Review: CHANGES REQUESTED**

Issues found:
1. TypeScript error in src/lib/etsy/client.ts:45
2. Missing error handling for Etsy API timeout
3. E2E test failing (screenshot capture missing)

Please address these issues and re-request review.
```

## Notes

- Minimize CI time - don't run unnecessary tests
- Backend changes rarely need E2E validation
- Type safety is validated by TypeScript compiler
- Focus on production readiness, not process adherence
