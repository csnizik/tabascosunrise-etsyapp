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
- **CORS Support**: Allows cross-origin access from any domain
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
| Access-Control-Allow-Origin | `*` |

#### Response Codes

| Code | Description |
|------|-------------|
| 200 | Success - returns CSV content |
| 304 | Not Modified - content unchanged (conditional request) |
| 404 | No catalog feed available - run a sync first |
| 500 | Storage error - check Blob configuration |

### Usage

1. Run a manual sync via POST `/api/sync/manual` to generate the CSV
2. Configure Facebook Business Manager to poll `GET /api/feed`
3. Facebook will refresh the catalog based on the feed

### Environment Variables

The endpoint requires `BLOB_READ_WRITE_TOKEN` to be configured for Vercel Blob access.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
