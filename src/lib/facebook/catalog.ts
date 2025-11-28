/**
 * Facebook Product Catalog CSV Formatter
 * Transforms Etsy listings into Facebook Product Catalog CSV format
 */

import type { EtsyListing, EtsyPrice } from '@/lib/etsy/types';
import type { FacebookProduct, FacebookAvailability, FacebookCondition } from './types';
import { logWarn } from '@/lib/utils/logger';

/** Maximum length for Facebook product title */
const MAX_TITLE_LENGTH = 150;

/** Maximum length for Facebook product description */
const MAX_DESCRIPTION_LENGTH = 5000;

/** Placeholder image URL when listing has no images */
const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/800x800?text=No+Image';

/** CSV column headers in the order required by Facebook */
const CSV_HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
] as const;

/**
 * Converts an Etsy price object to Facebook price format
 * @param price - Etsy price object with amount, divisor, and currency_code
 * @returns Formatted price string (e.g., "12.99 USD")
 * @example
 * formatPrice({ amount: 1299, divisor: 100, currency_code: 'USD' })
 * // Returns: "12.99 USD"
 */
export function formatPrice(price: EtsyPrice): string {
  // Prevent division by zero - default to divisor of 1 if zero or missing
  const divisor = price.divisor || 1;
  const value = price.amount / divisor;
  return `${value.toFixed(2)} ${price.currency_code}`;
}

/**
 * Strips HTML tags from a string
 * Uses iterative replacement to handle nested and malformed tags
 * @param text - Text that may contain HTML tags
 * @returns Text with all HTML tags removed
 */
export function stripHtml(text: string): string {
  let result = text;
  let previous;
  // Iteratively strip HTML tags until no more are found
  // This handles cases like <<script>script> where single pass would leave <script>
  do {
    previous = result;
    result = result.replace(/<[^>]*>/g, '');
  } while (result !== previous);
  return result;
}

/**
 * Sanitizes text for use in Facebook product description
 * Strips HTML, normalizes whitespace, and truncates to max length
 * @param text - Raw description text
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Sanitized description text
 */
export function sanitizeDescription(text: string, maxLength: number = MAX_DESCRIPTION_LENGTH): string {
  // Strip HTML tags
  let sanitized = stripHtml(text);
  // Replace newlines and multiple spaces with single space
  sanitized = sanitized.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }
  return sanitized;
}

/**
 * Truncates title to maximum allowed length
 * @param title - Product title
 * @param maxLength - Maximum allowed length (default: 150)
 * @returns Truncated title
 */
export function truncateTitle(title: string, maxLength: number = MAX_TITLE_LENGTH): string {
  const trimmed = title.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.substring(0, maxLength - 3) + '...';
}

/**
 * Escapes a value for CSV format
 * - Wraps fields containing commas, quotes, or newlines in double quotes
 * - Escapes double quotes by doubling them
 * @param value - Value to escape
 * @returns CSV-safe value
 */
export function escapeCSV(value: string): string {
  // Check if escaping is needed
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    // Escape double quotes by doubling them and wrap in quotes
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Gets the primary image URL from an Etsy listing
 * Returns placeholder if no images available or if URL is missing
 * @param listing - Etsy listing object
 * @returns Image URL string
 */
export function getPrimaryImageUrl(listing: EtsyListing): string {
  if (listing.images && listing.images.length > 0 && listing.images[0].url_fullxfull) {
    // Use the full resolution image URL
    return listing.images[0].url_fullxfull;
  }
  return PLACEHOLDER_IMAGE_URL;
}

/**
 * Validates that a listing has all required fields for Facebook catalog
 * @param listing - Etsy listing to validate
 * @returns True if listing has all required fields
 */
export function isValidListing(listing: EtsyListing): boolean {
  return !!(
    listing.listing_id &&
    listing.title?.trim() &&
    listing.price &&
    listing.url
  );
}

/**
 * Determines the availability status for a listing
 * Digital products are always in stock when active
 * @param listing - Etsy listing to check
 * @returns FacebookAvailability status
 */
export function getAvailability(listing: EtsyListing): FacebookAvailability {
  // Digital products are always in stock when listing is active
  // Only mark as out of stock if listing state indicates unavailability
  if (listing.state !== 'active' || listing.quantity === 0) {
    return 'out of stock';
  }
  return 'in stock';
}

/**
 * Transforms a single Etsy listing to a Facebook product
 * @param listing - Etsy listing to transform
 * @param shopName - Shop brand name
 * @returns FacebookProduct object or null if listing is invalid
 */
export function formatListing(listing: EtsyListing, shopName: string): FacebookProduct | null {
  if (!isValidListing(listing)) {
    return null;
  }

  const availability = getAvailability(listing);
  const condition: FacebookCondition = 'new'; // All products are new

  // Use title as fallback if description is missing or empty
  const descriptionText = listing.description?.trim() || listing.title;

  return {
    id: listing.listing_id.toString(),
    title: truncateTitle(listing.title),
    description: sanitizeDescription(descriptionText),
    availability,
    condition,
    price: formatPrice(listing.price),
    link: listing.url,
    image_link: getPrimaryImageUrl(listing),
    brand: shopName,
  };
}

/** UTF-8 BOM for Excel compatibility with international characters */
const UTF8_BOM = '\uFEFF';

/**
 * Generates a CSV string from an array of Facebook products
 * Includes UTF-8 BOM for Excel compatibility with international characters
 * @param products - Array of FacebookProduct objects
 * @returns CSV string with headers and product rows
 */
export function generateCSV(products: FacebookProduct[]): string {
  // Start with BOM and headers
  const rows: string[] = [CSV_HEADERS.join(',')];

  // Add product rows
  for (const product of products) {
    const row = CSV_HEADERS.map((header) => {
      const value = product[header];
      return escapeCSV(value);
    });
    rows.push(row.join(','));
  }

  // Add UTF-8 BOM at the start for Excel compatibility
  return UTF8_BOM + rows.join('\n');
}

/**
 * Main function: Transforms an array of Etsy listings into Facebook catalog CSV format
 * @param listings - Array of Etsy listings
 * @param shopName - Shop brand name for the brand column
 * @returns CSV string ready for Facebook catalog import
 * @throws Error if listings is not an array
 * @example
 * const csv = formatListingsToCSV(etsyListings, 'TabascoSunrise');
 * // Returns:
 * // id,title,description,availability,condition,price,link,image_link,brand
 * // 123456,Pattern Title,Description text,in stock,new,12.99 USD,https://...,https://...,TabascoSunrise
 */
export function formatListingsToCSV(listings: EtsyListing[], shopName: string): string {
  if (!Array.isArray(listings)) {
    throw new Error('Invalid input: listings must be an array');
  }

  if (!shopName || typeof shopName !== 'string') {
    throw new Error('Invalid input: shopName must be a non-empty string');
  }

  // Transform listings to Facebook products, filtering out invalid ones
  const products: FacebookProduct[] = [];
  for (const listing of listings) {
    const product = formatListing(listing, shopName);
    if (product) {
      products.push(product);
    } else {
      // Log invalid listings for debugging
      logWarn('Skipping invalid listing', {
        listing_id: listing?.listing_id,
        title: listing?.title?.substring(0, 50),
        reason: !listing?.listing_id ? 'missing listing_id' :
                !listing?.title?.trim() ? 'missing title' :
                !listing?.price ? 'missing price' :
                !listing?.url ? 'missing url' : 'unknown',
      });
    }
  }

  // Generate and return CSV
  return generateCSV(products);
}
