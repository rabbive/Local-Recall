import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * A utility function for conditionally joining class names together
 * Combines clsx and tailwind-merge for efficient class name handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 