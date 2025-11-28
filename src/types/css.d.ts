/**
 * Type declarations for CSS imports
 * Allows TypeScript to recognize .css files as valid modules
 */

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
