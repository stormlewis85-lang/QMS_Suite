import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Generate document number
 */
export function generateDocNumber(prefix: string, id: string): string {
  const shortId = id.slice(0, 8).toUpperCase();
  return `${prefix}-${shortId}`;
}

/**
 * Calculate hash for content verification
 */
export async function calculateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Format AP badge color
 */
export function getAPColor(ap: 'H' | 'M' | 'L'): string {
  switch (ap) {
    case 'H': return 'bg-red-100 text-red-800';
    case 'M': return 'bg-yellow-100 text-yellow-800';
    case 'L': return 'bg-green-100 text-green-800';
  }
}

/**
 * Format status badge color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'effective': return 'bg-green-100 text-green-800';
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'review': return 'bg-blue-100 text-blue-800';
    case 'superseded': return 'bg-orange-100 text-orange-800';
    case 'obsolete': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
