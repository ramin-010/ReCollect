/**
 * Embed Utilities for URL detection and parsing
 * Used by TipTap embed extension for docs
 */

export type EmbedType = 'youtube' | 'twitter' | 'link';

/**
 * Detect the embed type from a URL
 */
export function getEmbedType(url: string): EmbedType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return 'link';
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
}

/**
 * Check if a URL should be treated as an embeddable link
 */
export function isEmbeddableUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    // Embed any valid http/https URL
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get a display-friendly hostname from URL
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}
