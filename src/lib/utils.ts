import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names, resolving conflicts (shadcn/ui convention).
 * Kept in sync with the legacy `@/utils/cn` helper so both import paths work.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
