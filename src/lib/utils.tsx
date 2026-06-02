import React from 'react';

/**
 * Highlights matches within a text string.
 * Returns an array of React elements (strings or spans).
 */
export function highlightText(text: string, highlight: string) {
  if (!highlight.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <span key={i} className="bg-sky-100 text-sky-900 font-bold px-0.5 rounded">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export interface ParsedItem {
  quantity: string;
  name: string;
  sku: string;
  status?: 'validated' | 'missing_specs';
}

/**
 * Parses a raw string of items into structured objects.
 */
export function parseItems(text: string): ParsedItem[] {
  if (!text) return [];
  
  const items: ParsedItem[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  for (const line of lines) {
    const match = line.match(/^(\d+)?\s*(.+?)\s*(\d{5})$/);
    
    if (match) {
      items.push({
        quantity: match[1] || '1',
        name: match[2].trim(),
        sku: match[3],
        status: 'validated'
      });
    } else {
      const fallbackMatch = line.match(/^(\d+)\s+(.+)/);
      if (fallbackMatch) {
         items.push({ quantity: fallbackMatch[1], name: fallbackMatch[2].trim(), sku: '', status: 'missing_specs' });
      } else if (line.trim()) {
         items.push({ quantity: '1', name: line.trim(), sku: '', status: 'missing_specs' });
      }
    }
  }

  return items;
}

export const CATALOG_KEYWORDS = ['מלט', 'חול', 'בידוד', 'בלוק', 'סומסום', 'טיח', 'דבק', 'גבס', 'סיד'];

export function isKnownProduct(name: string) {
  return CATALOG_KEYWORDS.some(keyword => name.includes(keyword));
}

/**
 * Sanitizes image URLs by stripping unwanted characters.
 */
export function cleanImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/^["']/, '').replace(/["']$/, '');
  cleaned = cleaned.replace(/^(\/%22|\/\"|\")/, '');
  cleaned = cleaned.replace(/(\/%22|\/\"|\")$/, '');
  
  if (!cleaned.startsWith('http') && !cleaned.startsWith('data:') && !cleaned.startsWith('/')) {
    cleaned = '/' + cleaned;
  }
  
  return cleaned;
}

/**
 * Utility to combine class names
 */
export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
