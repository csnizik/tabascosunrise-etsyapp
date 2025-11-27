/**
 * Etsy API type definitions
 * Based on Etsy Open API v3 specification
 */

/** Price structure from Etsy API */
export interface EtsyPrice {
  amount: number;
  divisor: number;
  currency_code: string;
}

/** Image data from Etsy API */
export interface EtsyImage {
  url_fullxfull: string;
}

/** Etsy listing data structure */
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

/** OAuth token data stored in Edge Config */
export interface EtsyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user_id: string;
  shop_id?: string;
}

/**
 * Facebook Product Catalog type definitions
 * Based on Facebook Commerce Manager CSV specification
 */

/** Facebook product for catalog CSV */
export interface FacebookProduct {
  id: string;
  title: string;
  description: string;
  availability: 'in stock' | 'out of stock';
  condition: 'new' | 'refurbished' | 'used';
  price: string;
  link: string;
  image_link: string;
  brand: string;
}

/**
 * Sync status type definitions
 */

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult {
  status: SyncStatus;
  lastSyncTime?: string;
  listingsCount?: number;
  error?: string;
}
