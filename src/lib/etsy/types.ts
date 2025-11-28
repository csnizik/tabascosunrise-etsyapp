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
 * @property listing_image_id - Unique image identifier
 * @property listing_id - Parent listing ID
 * @property hex_code - Background color hex code (nullable)
 * @property red - Red color component
 * @property green - Green color component
 * @property blue - Blue color component
 * @property hue - Color hue value
 * @property saturation - Color saturation value
 * @property brightness - Color brightness value
 * @property is_black_and_white - Whether image is black and white
 * @property creation_tsz - Unix timestamp of creation
 * @property created_timestamp - Unix timestamp of creation
 * @property rank - Image display order
 * @property url_75x75 - 75x75 thumbnail URL
 * @property url_170x135 - 170x135 thumbnail URL
 * @property url_570xN - 570 width variable height URL
 * @property url_fullxfull - Full resolution image URL
 * @property full_height - Full image height in pixels
 * @property full_width - Full image width in pixels
 * @property alt_text - Alternate text for accessibility (nullable)
 */
export interface EtsyImage {
  listing_image_id: number;
  listing_id: number;
  hex_code: string | null;
  red: number;
  green: number;
  blue: number;
  hue: number;
  saturation: number;
  brightness: number;
  is_black_and_white: boolean;
  creation_tsz: number;
  created_timestamp: number;
  rank: number;
  url_75x75: string;
  url_170x135: string;
  url_570xN: string;
  url_fullxfull: string;
  full_height: number;
  full_width: number;
  alt_text: string | null;
}

/**
 * Etsy listing data structure
 * Represents a product listing from the Etsy API
 * @property listing_id - Unique identifier for the listing
 * @property user_id - User ID of the shop owner
 * @property shop_id - Shop ID this listing belongs to
 * @property title - Listing title
 * @property description - Full listing description
 * @property price - Price information
 * @property quantity - Available quantity
 * @property url - Direct URL to the listing on Etsy
 * @property images - Array of listing images
 * @property state - Current listing state
 * @property creation_timestamp - Unix timestamp when listing was created
 * @property last_modified_timestamp - Unix timestamp of last modification
 * @property state_timestamp - Unix timestamp of last state change
 * @property ending_timestamp - Unix timestamp when listing ends
 * @property original_creation_timestamp - Unix timestamp of original creation
 * @property views - Number of views
 * @property num_favorers - Number of users who favorited
 * @property is_digital - Whether this is a digital download
 * @property is_personalizable - Whether listing can be personalized
 * @property is_customizable - Whether listing can be customized
 * @property listing_type - Type of listing
 * @property tags - Array of listing tags
 * @property taxonomy_id - Category taxonomy ID
 */
export interface EtsyListing {
  listing_id: number;
  user_id: number;
  shop_id: number;
  title: string;
  description: string;
  price: EtsyPrice;
  quantity: number;
  url: string;
  images: EtsyImage[];
  state: 'active' | 'inactive' | 'draft' | 'expired' | 'sold_out' | 'removed';
  creation_timestamp: number;
  last_modified_timestamp: number;
  state_timestamp: number;
  ending_timestamp: number;
  original_creation_timestamp: number;
  views: number;
  num_favorers: number;
  is_digital: boolean;
  is_personalizable: boolean;
  is_customizable: boolean;
  listing_type: 'physical' | 'download' | 'both';
  tags: string[];
  taxonomy_id: number | null;
}

/**
 * Etsy shop details from the API
 * @property shop_id - Unique shop identifier
 * @property shop_name - Shop name
 * @property user_id - Owner user ID
 * @property title - Shop title/tagline
 * @property announcement - Shop announcement text
 * @property currency_code - Default currency code
 * @property is_vacation - Whether shop is on vacation mode
 * @property vacation_message - Vacation message (nullable)
 * @property sale_message - Message shown after sale
 * @property digital_sale_message - Message shown after digital sale
 * @property url - Shop URL
 * @property icon_url_fullxfull - Shop icon full resolution URL (nullable)
 * @property listing_active_count - Number of active listings
 * @property digital_listing_count - Number of digital listings
 * @property num_favorers - Number of users who favorited the shop
 * @property review_count - Number of reviews
 * @property review_average - Average review rating (nullable)
 * @property transaction_sold_count - Total number of sales
 * @property create_date - Unix timestamp when shop was created
 * @property update_date - Unix timestamp of last update
 */
export interface EtsyShop {
  shop_id: number;
  shop_name: string;
  user_id: number;
  title: string | null;
  announcement: string | null;
  currency_code: string;
  is_vacation: boolean;
  vacation_message: string | null;
  sale_message: string | null;
  digital_sale_message: string | null;
  url: string;
  icon_url_fullxfull: string | null;
  listing_active_count: number;
  digital_listing_count: number;
  num_favorers: number;
  review_count: number;
  review_average: number | null;
  transaction_sold_count: number;
  create_date: number;
  update_date: number;
}

/**
 * Etsy API listings response structure
 * @property count - Total number of listings matching criteria
 * @property results - Array of listing objects
 */
export interface EtsyListingsResponse {
  count: number;
  results: EtsyListing[];
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

/**
 * Rate limit state stored in Edge Config
 * @property daily_count - Number of requests made today
 * @property daily_reset - ISO 8601 timestamp for daily count reset (midnight UTC)
 * @property second_timestamps - Array of timestamps for requests in current second window
 */
export interface RateLimitState {
  daily_count: number;
  daily_reset: string;
  second_timestamps: number[];
}
