/**
 * Environment configuration with typed getters
 */

export const env = {
  // API Configuration
  get API_BASE_URL(): string {
    return import.meta.env.VITE_SUPABASE_URL || '';
  },

  get PUBLIC_BASE(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  },

  // PWA Detection
  get IS_PWA(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  },

  // Supabase
  get SUPABASE_URL(): string {
    return import.meta.env.VITE_SUPABASE_URL || '';
  },

  get SUPABASE_ANON_KEY(): string {
    return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  },

  // TVDB
  get TVDB_API_KEY(): string {
    return import.meta.env.VITE_TVDB_API_KEY || '';
  },

  get TVDB_BASE_URL(): string {
    return import.meta.env.VITE_TVDB_BASE_URL || '';
  },

  // Auth Redirects
  get WEB_REDIRECT(): string {
    return `${this.PUBLIC_BASE}/auth/callback`;
  },

  get NATIVE_REDIRECT(): string {
    return 'serialbowl://auth/callback';
  },

  get AUTH_REDIRECT(): string {
    // Use native redirect if running in Capacitor, otherwise web
    return this.IS_NATIVE ? this.NATIVE_REDIRECT : this.WEB_REDIRECT;
  },

  // Native Detection
  get IS_NATIVE(): boolean {
    return typeof window !== 'undefined' && !!(window as any).Capacitor;
  },
} as const;
