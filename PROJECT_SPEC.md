# TabascoSunrise Etsy Facebook Catalog Sync - Project Specification

## Executive Summary
Automated system to sync Etsy shop listings to Facebook Product Catalog, enabling Facebook Shops integration for cross-stitch pattern PDFs sold on Etsy.

## Business Problem
- Manual product management across Etsy and Facebook is time-consuming
- Facebook Shops requires domain verification and catalog setup
- Etsy integration requires OAuth 2.0 and regular syncing
- Need automated daily/weekly updates without manual intervention

## Solution Architecture

### System Components
1. **OAuth Service** - One-time Etsy authorization
2. **Token Manager** - Automatic token refresh
3. **Sync Service** - Fetch listings from Etsy
4. **Catalog Generator** - Transform to Facebook CSV format
5. **Feed Hosting** - Serve CSV via stable URL
6. **Scheduler** - Automated daily syncs
7. **Dashboard** - Monitor status and manual triggers

### Data Flow
```
Etsy API → Token Check → Fetch Listings → Transform to CSV → 
Upload to Blob → Generate URL → Facebook Reads Feed
```

## Technical Requirements

### Functional Requirements
- FR1: User can authorize app with Etsy (one-time)
- FR2: System auto-refreshes expired tokens
- FR3: System fetches all active listings daily
- FR4: System generates Facebook-compliant CSV
- FR5: CSV accessible via stable HTTPS URL
- FR6: User can trigger manual sync via dashboard
- FR7: Dashboard shows last sync time and status
- FR8: System handles errors gracefully

### Non-Functional Requirements
- NFR1: CSV updates within 5 minutes of sync trigger
- NFR2: 99% uptime for feed URL
- NFR3: Handle up to 1000 listings
- NFR4: Respect Etsy rate limits (5 QPS)
- NFR5: Zero cost for storage (use free tiers)
- NFR6: Secure token storage
- NFR7: No user interaction after initial OAuth

## API Specifications

### Etsy API v3

**Authentication Endpoints:**
```
GET https://www.etsy.com/oauth/connect
POST https://api.etsy.com/v3/public/oauth/token
```

**Data Endpoints:**
```
GET /v3/application/shops/{shop_id}/listings/active
GET /v3/application/shops/{shop_id}
```

**Rate Limits:**
- 5 requests per second
- 5,000 requests per day

**OAuth Scopes:**
- `listings_r` - Read listing data
- `shops_r` - Read shop information

### Facebook Catalog CSV Spec

**Required Fields:**
| Field | Format | Example |
|-------|--------|---------|
| id | string | "123456789" |
| title | string | "Vintage Rose Cross Stitch Pattern" |
| description | text | "Beautiful 14-count pattern..." |
| availability | enum | "in stock" |
| condition | enum | "new" |
| price | string | "12.99 USD" |
| link | url | "https://etsy.com/listing/..." |
| image_link | url | "https://i.etsystatic.com/..." |
| brand | string | "TabascoSunrise" |

**Optional Fields:**
- additional_image_link
- product_type
- google_product_category

## Implementation Phases

### Phase 1: MVP (Current)
- OAuth authorization flow
- Token storage in Edge Config
- Manual sync via dashboard
- CSV generation
- Blob storage and feed URL

### Phase 2: Automation (Future)
- Scheduled daily syncs via Vercel Cron
- Email notifications on sync failures
- Sync history log

### Phase 3: Enhancement (Future)
- SEO keyword analysis
- Sales analytics dashboard
- Price optimization suggestions

## Edge Cases & Error Handling

### OAuth Errors
- State mismatch → Restart flow
- Code expired → Show error, restart
- Refresh token expired → Re-authorize

### API Errors
- Rate limit hit → Exponential backoff
- Network timeout → Retry 3x
- Invalid response → Log and alert

### Data Issues
- Missing required field → Use default or skip
- Invalid image URL → Use placeholder
- Zero listings → Generate empty CSV

## Security Considerations

### Secrets Management
- All API keys in environment variables
- Tokens stored in Edge Config (encrypted at rest)
- CRON_SECRET for webhook authentication
- No secrets in git repository

### Data Protection
- OAuth PKCE flow (not just state)
- HTTPS for all external requests
- Rate limiting on public endpoints
- Input validation on all user data

## Monitoring & Observability

### Key Metrics
- Sync success rate
- Token refresh success rate
- Average sync duration
- CSV file size
- API error rate

### Logging
- OAuth events (auth, refresh, error)
- Sync events (start, complete, failure)
- API rate limit warnings
- Edge Config read/write ops

## Testing Strategy

### Unit Tests
- OAuth helper functions
- CSV formatter
- Token expiry logic
- Error handlers

### Integration Tests
- Full OAuth flow
- Etsy API mocking
- CSV generation
- Blob upload

### Manual Testing
- OAuth flow in browser
- Dashboard functionality
- Manual sync trigger
- CSV download and validation

## Deployment Plan

### Vercel Setup
1. Create new Vercel project
2. Connect GitHub repo
3. Add environment variables
4. Create Edge Config store
5. Create Blob store
6. Enable Cron Jobs

### Etsy Setup
1. Update callback URL to production
2. Test OAuth flow in production
3. Verify scopes are correct

### Facebook Setup
1. Add feed URL to Business Manager
2. Verify catalog populates
3. Monitor for errors

## Success Criteria
- OAuth completes without errors
- CSV generates with all active listings
- Feed URL accessible 24/7
- Daily syncs run automatically
- Zero manual intervention required
- Facebook catalog stays in sync

## Rollback Plan
- If sync fails, previous CSV remains available
- Manual sync always available as backup
- Can revert to manual CSV uploads if needed

## Future Enhancements
- Multi-shop support
- Pinterest integration
- Instagram Shopping
- Analytics dashboard
- A/B testing for titles
- AI-powered descriptions

## Appendix

### Etsy Listing Data Structure
```typescript
interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  url: string;
  images: Array<{ url_fullxfull: string }>;
  state: 'active' | 'inactive' | 'draft';
  // ... other fields
}
```

### Facebook CSV Example
```csv
id,title,description,availability,condition,price,link,image_link,brand
123456,Pattern 1,Description 1,in stock,new,12.99 USD,https://...,https://...,TabascoSunrise
```
