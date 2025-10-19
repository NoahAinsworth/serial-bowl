import { z } from 'zod';

/**
 * Auth validation schema
 */
export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
  handle: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, dashes, and underscores')
    .optional(),
});

export type AuthFormData = z.infer<typeof authSchema>;

/**
 * Profile validation schema
 */
export const profileSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, dashes, and underscores'),
  displayName: z
    .string()
    .trim()
    .max(50, 'Display name must be less than 50 characters')
    .optional(),
  bio: z
    .string()
    .trim()
    .max(160, 'Bio must be less than 160 characters')
    .optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Post creation validation schema
 */
export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(1000, 'Content must be less than 1000 characters'),
  rating: z
    .number()
    .min(0, 'Rating must be between 0 and 10')
    .max(10, 'Rating must be between 0 and 10')
    .optional(),
  isSpoiler: z.boolean().optional(),
});

export type PostFormData = z.infer<typeof postSchema>;

/**
 * Comment validation schema
 */
export const commentSchema = z.object({
  text_content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment must be less than 500 characters'),
});

export type CommentFormData = z.infer<typeof commentSchema>;

/**
 * DM validation schema
 */
export const dmSchema = z.object({
  text_content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be less than 1000 characters'),
});

export type DMFormData = z.infer<typeof dmSchema>;

/**
 * Rate limiting utility - debounces function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility - limits function calls to once per time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
