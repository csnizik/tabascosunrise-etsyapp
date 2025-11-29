/**
 * Facebook Product Catalog type definitions
 * Based on Facebook Commerce Manager CSV specification
 */

/**
 * Facebook product availability status
 */
export type FacebookAvailability = 'in stock' | 'out of stock';

/**
 * Facebook product condition
 */
export type FacebookCondition = 'new' | 'refurbished' | 'used';

/**
 * Facebook product for catalog CSV
 * All fields required by Facebook Commerce Manager
 * @property id - Unique product identifier
 * @property title - Product title (max 150 characters)
 * @property description - Product description (max 5000 characters)
 * @property availability - Stock status
 * @property condition - Product condition
 * @property price - Formatted price with currency (e.g., "12.99 USD")
 * @property link - URL to product page
 * @property image_link - URL to main product image
 * @property additional_image_link - Comma-separated URLs for additional images (up to 8)
 * @property brand - Brand name
 */
export interface FacebookProduct {
  id: string;
  title: string;
  description: string;
  availability: FacebookAvailability;
  condition: FacebookCondition;
  price: string;
  link: string;
  image_link: string;
  additional_image_link: string;
  brand: string;
}
