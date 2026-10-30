import DOMPurify from 'dompurify';

// Markup that WooCommerce order notes actually use (links, line breaks, light formatting, lists).
const ALLOWED_TAGS = ['a', 'b', 'strong', 'i', 'em', 'u', 'br', 'p', 'span', 'ul', 'ol', 'li', 'code', 'pre'];
const ALLOWED_ATTR = ['href', 'title', 'target', 'rel'];

// Links in notes point off-site; open them in a new tab without giving that page access to this one.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** True when the text has tags or entities (`&amp;`, `&#8211;`) that need the HTML path to display correctly */
export function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(text) || /&(?:[a-z]+|#\d+|#x[\da-f]+);/i.test(text);
}

/** Strips scripts, event handlers, styles, `javascript:` URLs and every tag outside the allowlist */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
