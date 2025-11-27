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
- **Etsy Types** (`src/lib/etsy/types.ts`): `EtsyListing`, `EtsyTokens`, `EtsyPrice`, `EtsyImage`
- **Facebook Types** (`src/lib/facebook/types.ts`): `FacebookProduct`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `LOG_ENABLED` | Set to `true` to enable logging in production |
| `NODE_ENV` | Standard Node.js environment (`development`, `production`) |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
