/**
 * Facebook Product Catalog type definitions
 * Based on Facebook Commerce Manager CSV specification
 */

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
 * @property brand - Brand name
 */
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
