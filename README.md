# TabascoSunrise Etsy App

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment & Types Setup

This project uses TypeScript with strict mode enabled. Key configuration and utilities:

### Shared Utilities

- **Logger** (`src/lib/utils/logger.ts`): Environment-aware logging with `logInfo`, `logWarn`, `logError`. Disabled in production unless `LOG_ENABLED=true`.
- **Errors** (`src/lib/utils/errors.ts`): Custom error classes (`AppError`, `OAuthError`, `TokenError`, etc.) and `toPublicError()` for safe API responses.

### Type Definitions

- **Shared Types** (`src/types/index.ts`): Common types like `ApiResponse<T>`, `SyncStatus`, `SyncResult`
- **Etsy Types** (`src/lib/etsy/types.ts`): `EtsyListing`, `EtsyShop`, `EtsyTokens`, `EtsyPrice`, `EtsyImage`, `RateLimitState`
- **Facebook Types** (`src/lib/facebook/types.ts`): `FacebookProduct`, `FacebookAvailability`, `FacebookCondition`

## Facebook Catalog Formatter

The Facebook Catalog formatter (`src/lib/facebook/catalog.ts`) transforms Etsy listings into Facebook Product Catalog CSV format.

### Features

- **CSV Generation**: Produces Facebook-compliant CSV with all required fields
- **Data Transformation**: Converts Etsy price format to Facebook format (e.g., "12.99 USD")
- **HTML Sanitization**: Strips HTML tags from descriptions with iterative processing
- **Field Validation**: Truncates titles (150 chars) and descriptions (5000 chars)
- **CSV Escaping**: Properly escapes commas, quotes, and newlines
- **Availability Detection**: Checks listing state and quantity for accurate availability
- **Placeholder Images**: Uses placeholder for listings without images

### Usage

```typescript
import { formatListingsToCSV } from '@/lib/facebook/catalog';
import type { EtsyListing } from '@/lib/etsy/types';

// Transform Etsy listings to Facebook CSV
const listings: EtsyListing[] = await etsyClient.getShopListings('12345');
const csv = formatListingsToCSV(listings, 'TabascoSunrise');

// CSV output example:
// id,title,description,availability,condition,price,link,image_link,brand
// 123456,Pattern Title,Description text,in stock,new,12.99 USD,https://...,https://...,TabascoSunrise
```

### CSV Fields

| Field | Source | Notes |
|-------|--------|-------|
| id | `listing_id` | Converted to string |
| title | `title` | Truncated to 150 chars |
| description | `description` | HTML stripped, truncated to 5000 chars |
| availability | `state`, `quantity` | "in stock" if active with quantity > 0 |
| condition | - | Always "new" |
| price | `price` | Formatted as "XX.XX USD" |
| link | `url` | Direct Etsy listing URL |
| image_link | `images[0].url_fullxfull` | Placeholder if no image |
| brand | `shopName` | Passed as parameter |

### Helper Functions

| Function | Description |
|----------|-------------|
| `formatPrice(price)` | Converts Etsy price object to "XX.XX USD" format |
| `sanitizeDescription(text)` | Strips HTML, normalizes whitespace, truncates |
| `truncateTitle(title)` | Truncates to max 150 characters |
| `escapeCSV(value)` | Escapes special characters for CSV |
| `getPrimaryImageUrl(listing)` | Gets first image URL or placeholder |
| `getAvailability(listing)` | Determines in stock/out of stock status |
| `isValidListing(listing)` | Validates required fields are present |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `LOG_ENABLED` | Set to `true` to enable logging in production |
| `NODE_ENV` | Standard Node.js environment (`development`, `production`) |
| `ETSY_API_KEY` | Etsy API key from Developer Portal |
| `EDGE_CONFIG` | Vercel Edge Config connection string (auto-set by Vercel) |
| `EDGE_CONFIG_ID` | Edge Config ID for write operations |
| `EDGE_CONFIG_TOKEN` | Edge Config token for write operations |

## Etsy API Client

The Etsy API client (`src/lib/etsy/client.ts`) provides a robust interface for interacting with the Etsy API.

### Features

- **Automatic Token Refresh**: Tokens are automatically refreshed before API calls if expired
- **Rate Limiting**: Respects Etsy's rate limits (5 requests/second, 5000 requests/day)
- **Retry Logic**: Exponential backoff with jitter for transient errors (429, 5xx)
- **Pagination**: Automatically handles pagination for listings
- **Comprehensive Logging**: Request/response logging for debugging

### Usage

```typescript
import { EtsyClient } from '@/lib/etsy/client';

// Create client instance
const client = new EtsyClient();

// Fetch all active listings for a shop
const listings = await client.getShopListings('12345');

// Fetch shop details
const shop = await client.getShopDetails('12345');
```

### Rate Limiting

The client implements a token bucket algorithm for per-second limiting and tracks daily request counts in Edge Config:

- **QPS Limit**: 5 requests per second
- **QPD Limit**: 5000 requests per day
- **Daily Reset**: Midnight UTC

When limits are approached, the client automatically queues requests with appropriate delays.

### Error Handling

The client throws specific error types:
- `TokenError`: Authentication failures
- `RateLimitError`: Rate limit exceeded
- `EtsyApiError`: Other API errors with status code and endpoint context
- `ConfigError`: Missing configuration

### API Methods

| Method | Description |
|--------|-------------|
| `getShopListings(shopId)` | Fetch all active listings with pagination |
| `getShopDetails(shopId)` | Fetch shop information |
| `makeRequest<T>(endpoint)` | Internal method for custom API calls |

## Feed Serving Endpoint

The Feed Serving Endpoint (`src/app/api/feed/route.ts`) provides a public URL for Facebook to poll the product catalog CSV.

### Features

- **Public Access**: No authentication required - Facebook can poll directly
- **Caching**: 1-hour cache with `Cache-Control: public, max-age=3600`
- **ETag Support**: Conditional requests with `If-None-Match` return 304 Not Modified when unchanged
- **Last-Modified Header**: For cache validation with upload timestamp
- **Content-Length Header**: Helps clients pre-allocate buffers
- **Gzip Compression**: Automatic compression for payloads > 1KB when client supports it
- **CORS Support**: Allows cross-origin access from any domain
- **Enhanced Metrics**: Logs user-agent, referer, IP, and Facebook bot detection
- **Error Handling**: Returns 404 if no CSV available, 500 for storage errors

### API

**GET /api/feed**

Returns the Facebook catalog CSV file.

#### Response Headers

| Header | Value |
|--------|-------|
| Content-Type | `text/csv; charset=utf-8` |
| Cache-Control | `public, max-age=3600` |
| ETag | SHA-256 hash of content for conditional requests |
| Last-Modified | Blob upload timestamp in UTC |
| Content-Length | Size in bytes (compressed if gzip applied) |
| Content-Encoding | `gzip` (when compression applied) |
| Access-Control-Allow-Origin | `*` |

#### Response Codes

| Code | Description |
|------|-------------|
| 200 | Success - returns CSV content |
| 304 | Not Modified - content unchanged (conditional request) |
| 404 | No catalog feed available - run a sync first |
| 500 | Storage error - check Blob configuration |

---

**GET /api/feed/stats**

Returns statistics about the current feed without serving the full content.

#### Response

```json
{
  "success": true,
  "data": {
    "exists": true,
    "productCount": 42,
    "sizeBytes": 12345,
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "url": "https://..."
  }
}
```

---

**GET /api/feed/validate**

Validates the structure and format of the current feed.

#### Response

```json
{
  "success": true,
  "data": {
    "valid": true,
    "lineCount": 42,
    "sizeBytes": 12345,
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "headers": "id,title,description,availability,condition,price,link,image_link,brand",
    "expectedHeaders": "id,title,description,availability,condition,price,link,image_link,brand"
  }
}
```

### Usage

1. Run a manual sync via POST `/api/sync/manual` to generate the CSV
2. Configure Facebook Business Manager to poll `GET /api/feed`
3. Facebook will refresh the catalog based on the feed
4. Use `/api/feed/stats` to monitor feed health
5. Use `/api/feed/validate` to verify feed structure

### Environment Variables

The endpoint requires `BLOB_READ_WRITE_TOKEN` to be configured for Vercel Blob access.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Production Deployment

This section guides you through deploying the application to Vercel and configuring all necessary services.

### Production URLs

Once deployed, your application will be available at:

| Endpoint | URL | Description |
|----------|-----|-------------|
| Dashboard | `https://your-app.vercel.app/dashboard` | Main dashboard for monitoring and manual sync |
| Feed URL | `https://your-app.vercel.app/api/feed` | Facebook catalog CSV feed |
| Feed Stats | `https://your-app.vercel.app/api/feed/stats` | Feed statistics endpoint |
| Feed Validate | `https://your-app.vercel.app/api/feed/validate` | Feed validation endpoint |
| OAuth Callback | `https://your-app.vercel.app/api/auth/etsy/callback` | Etsy OAuth callback URL |
| OAuth Authorize | `https://your-app.vercel.app/api/auth/etsy/authorize` | Initiate OAuth flow |
| Manual Sync | `https://your-app.vercel.app/api/sync/manual` | Manual sync trigger (POST) |
| Cron Sync | `https://your-app.vercel.app/api/sync/cron` | Automated cron sync (GET) |
| Status | `https://your-app.vercel.app/api/status` | Application status endpoint |

> **Note**: Replace `your-app.vercel.app` with your actual Vercel deployment URL.

### Deployment Checklist

#### Step 1: Deploy to Vercel

1. **Connect GitHub Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import from GitHub and select `tabascosunrise-etsyapp`
   - Configure build settings (Next.js auto-detected)
   - Deploy from `main` branch

2. **Verify Initial Deployment**
   - Wait for the first deployment to complete
   - Note your deployment URL (e.g., `your-app.vercel.app`)

#### Step 2: Create Vercel Storage Resources

1. **Create Edge Config Store**
   - Go to Vercel Dashboard → Your Project → Storage
   - Click "Create Database" → "Edge Config"
   - Name it (e.g., `tabascosunrise-edge-config`)
   - Click "Connect to Project" to link to your app
   - The `EDGE_CONFIG` variable is auto-set

2. **Create Blob Store**
   - Go to Vercel Dashboard → Your Project → Storage
   - Click "Create Database" → "Blob"
   - Name it (e.g., `tabascosunrise-blob`)
   - Click "Connect to Project" to link to your app
   - The `BLOB_READ_WRITE_TOKEN` variable is auto-set

3. **Get Edge Config Credentials for Write Access**
   - Go to Edge Config → Settings
   - Copy the **Edge Config ID** (format: `ecfg_xxxxx`)
   - Create a Vercel API Token at [Account Settings → Tokens](https://vercel.com/account/tokens)
   - Token scope: Full access or Edge Config read/write

#### Step 3: Configure Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `ETSY_API_KEY` | Your API key | From [Etsy Developer Portal](https://www.etsy.com/developers/your-apps) |
| `ETSY_REDIRECT_URI` | `https://your-app.vercel.app/api/auth/etsy/callback` | Update to production URL |
| `ETSY_SCOPES` | `listings_r shops_r` | Required OAuth scopes |
| `EDGE_CONFIG_ID` | `ecfg_xxxxx` | From Edge Config settings |
| `EDGE_CONFIG_TOKEN` | Your Vercel API token | For Edge Config write operations |
| `CRON_SECRET` | Random secret | Generate with `openssl rand -base64 32` |
| `EDGE_CONFIG` | (Auto-set) | Automatically set when linking Edge Config |
| `BLOB_READ_WRITE_TOKEN` | (Auto-set) | Automatically set when linking Blob store |

> **Important: Edge Config Variables**
> - `EDGE_CONFIG` - Automatically set by Vercel when you connect Edge Config to your project. Used for READ operations.
> - `EDGE_CONFIG_ID` + `EDGE_CONFIG_TOKEN` - Must be set manually for WRITE operations (storing tokens, sync metadata).
> - Both sets are required for the application to function properly.

#### Step 4: Update Etsy App Settings

1. Go to [Etsy Developer Portal](https://www.etsy.com/developers/your-apps)
2. Select your app
3. Add production callback URL: `https://your-app.vercel.app/api/auth/etsy/callback`
4. Verify scopes include `listings_r` and `shops_r`

#### Step 5: Test OAuth Flow in Production

1. Visit `https://your-app.vercel.app/api/auth/etsy/authorize`
2. Complete the Etsy authorization
3. Verify redirect to callback and successful token storage
4. Check the dashboard shows "Connected" status

#### Step 6: Configure Facebook Business Manager

1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Navigate to Commerce Manager → Catalog → Data Sources
3. Add Data Feed → Scheduled Feed
4. Enter Feed URL: `https://your-app.vercel.app/api/feed`
5. Set schedule (recommended: Daily)
6. **Verify domain ownership** (required for feed access):
   - Facebook may require you to verify your Vercel domain
   - Go to Business Settings → Security Center → Domains
   - Add `your-app.vercel.app`
   - Choose verification method (Meta tag or HTML file upload)
   - For Vercel deployments, use the Meta tag method in your `layout.tsx`
7. Test catalog import

#### Step 7: Verify Cron Job

1. Ensure `CRON_SECRET` is set (from Step 3)
2. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
3. Verify the cron schedule is visible: `0 6 * * *` (daily at 6:00 AM UTC)
4. **Test the cron job:**
   - Click "Run" next to the `/api/sync/cron` job
   - Go to Deployments → Logs
   - Search for "Cron sync completed successfully"
   - Verify no errors appear
5. The cron job is defined in `vercel.json`

#### Step 8: Complete Workflow Verification

Run through the complete workflow to verify everything works:

- [ ] OAuth flow completes successfully
- [ ] Manual sync completes via dashboard
- [ ] CSV accessible at `/api/feed`
- [ ] Feed stats available at `/api/feed/stats`
- [ ] Feed validation passes at `/api/feed/validate`
- [ ] Facebook catalog imports successfully
- [ ] No errors in Vercel logs
- [ ] Cron job visible in Vercel dashboard

### Troubleshooting

#### OAuth Errors

- **State mismatch**: Clear cookies and restart the OAuth flow
- **Invalid callback URL**: Ensure production callback is registered in Etsy Developer Portal
- **Token refresh failed**: Re-authorize via `/api/auth/etsy/authorize`

#### Sync Errors

- **Missing tokens**: Run OAuth flow first
- **Rate limit exceeded**: Wait and retry, check Etsy API limits
- **Blob upload failed**: Verify `BLOB_READ_WRITE_TOKEN` is set

#### Feed Errors

- **404 No feed**: Run a manual sync first
- **Empty CSV**: Check Etsy shop has active listings

#### Cron Job Not Running

- Verify `CRON_SECRET` is set in environment variables
- Check Vercel logs for cron execution
- Cron jobs only run in production deployments

### Monitoring

- **Vercel Logs**: View runtime logs in Vercel Dashboard → Deployments → Logs
- **Feed Stats**: Check `/api/feed/stats` for feed health
- **Feed Validate**: Verify feed structure at `/api/feed/validate`
- **Status Endpoint**: Check application status at `/api/status`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
