/**
 * Mobile-specific utilities for Capacitor
 */

export const mobile = {
  /**
   * Check if running in native Capacitor environment
   */
  isNative(): boolean {
    return typeof window !== 'undefined' && !!(window as any).Capacitor;
  },

  /**
   * Check if running as PWA
   */
  isPWA(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  },

  /**
   * Get platform (ios, android, web)
   */
  getPlatform(): 'ios' | 'android' | 'web' {
    if (!this.isNative()) return 'web';
    const capacitor = (window as any).Capacitor;
    return capacitor.getPlatform();
  },

  /**
   * Check if iOS
   */
  isIOS(): boolean {
    return this.getPlatform() === 'ios';
  },

  /**
   * Check if Android
   */
  isAndroid(): boolean {
    return this.getPlatform() === 'android';
  },

  /**
   * Get safe area insets for notched devices
   */
  getSafeAreaInsets() {
    if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
    
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0', 10),
      bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
      left: parseInt(style.getPropertyValue('--sal') || '0', 10),
      right: parseInt(style.getPropertyValue('--sar') || '0', 10),
    };
  },

  /**
   * Haptic feedback (if available)
   */
  async haptic(type: 'light' | 'medium' | 'heavy' = 'light') {
    if (!this.isNative()) return;
    
    try {
      const { Haptics } = (window as any).Capacitor.Plugins || {};
      if (Haptics) {
        switch (type) {
          case 'light':
            await Haptics.impact({ style: 'light' });
            break;
          case 'medium':
            await Haptics.impact({ style: 'medium' });
            break;
          case 'heavy':
            await Haptics.impact({ style: 'heavy' });
            break;
        }
      }
    } catch (err) {
      // Haptics not available
    }
  },

  /**
   * Share content (native share or fallback)
   */
  async share(data: { title?: string; text?: string; url?: string }) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (err) {
        // User cancelled or error
        return false;
      }
    }
    
    // Fallback: copy to clipboard
    if (data.url && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(data.url);
        return true;
      } catch (err) {
        return false;
      }
    }
    
    return false;
  },

  /**
   * Get device info
   */
  async getDeviceInfo() {
    if (!this.isNative()) {
      return {
        platform: 'web',
        model: 'browser',
        operatingSystem: 'web',
        osVersion: '',
        manufacturer: 'browser',
      };
    }

    try {
      const { Device } = (window as any).Capacitor.Plugins || {};
      if (Device) {
        return await Device.getInfo();
      }
    } catch (err) {
      // Device plugin not available
    }

    return {
      platform: this.getPlatform(),
      model: 'unknown',
      operatingSystem: this.getPlatform(),
      osVersion: '',
      manufacturer: 'unknown',
    };
  },

  /**
   * Open URL in system browser (for OAuth flows)
   */
  async openUrl(url: string) {
    if (!this.isNative()) {
      window.open(url, '_blank');
      return;
    }

    try {
      const { Browser } = (window as any).Capacitor.Plugins || {};
      if (Browser) {
        await Browser.open({ url });
      } else {
        window.open(url, '_system');
      }
    } catch (err) {
      window.open(url, '_system');
    }
  },
} as const;
