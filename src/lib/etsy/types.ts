/**
 * Etsy API type definitions
 * Based on Etsy Open API v3 specification
 */

/**
 * Price structure from Etsy API
 * @property amount - Price amount in smallest currency unit (e.g., cents)
 * @property divisor - Divisor to convert amount to currency (e.g., 100 for USD)
 * @property currency_code - ISO 4217 currency code
 */
export interface EtsyPrice {
  amount: number;
  divisor: number;
  currency_code: string;
}

/**
 * Image data from Etsy API
 * @property url_fullxfull - Full resolution image URL
 */
export interface EtsyImage {
  url_fullxfull: string;
}

/**
 * Etsy listing data structure
 * Represents a product listing from the Etsy API
 * @property listing_id - Unique identifier for the listing
 * @property title - Listing title
 * @property description - Full listing description
 * @property price - Price information
 * @property quantity - Available quantity
 * @property url - Direct URL to the listing on Etsy
 * @property images - Array of listing images
 * @property state - Current listing state
 */
export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price: EtsyPrice;
  quantity: number;
  url: string;
  images: EtsyImage[];
  state: 'active' | 'inactive' | 'draft';
}

/**
 * OAuth token data stored in Edge Config
 * @property access_token - Current access token for API calls
 * @property refresh_token - Token used to refresh access_token
 * @property expires_at - ISO 8601 timestamp when access_token expires
 * @property user_id - Etsy user ID
 * @property shop_id - Optional Etsy shop ID
 */
export interface EtsyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user_id: string;
  shop_id?: string;
}
