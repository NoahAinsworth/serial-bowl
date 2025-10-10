# Serialbowl Mobile Setup with Capacitor

Serialbowl is now mobile-ready and Capacitor-enabled for deployment to iOS and Android.

## Features Implemented

### ✅ Mobile-First Design
- Single-column responsive layout optimized for mobile devices
- Safe area support for notched devices (iPhone X+, modern Android)
- 44×44dp minimum touch targets for accessibility
- Touch-optimized interactions (no hover states on mobile)

### ✅ Bottom Navigation
- **Home** - Your personalized feed
- **Discover** - Browse trending shows
- **New** - Create posts and reviews
- **Activity** - Notifications and interactions
- **Profile** - Your profile and settings

### ✅ Post Management
- Three-dot menu (⋯) on every post
- **Hide Post** - Hide posts from your feed with undo option
- **Report...** - Navigate directly to report form with content pre-filled

### ✅ Legal & Community
New dedicated section accessible from Settings:
- **Terms of Service** - Platform rules and user rights
- **Privacy Policy** - Data handling and privacy practices
- **Community Guidelines** - Content standards and prohibited behavior
- **Report Form** - Email-based reporting system

## Running on Physical Devices

### Prerequisites
- Node.js and npm installed
- For iOS: Mac with Xcode
- For Android: Android Studio

### Setup Steps

1. **Export to GitHub**
   - Click "Export to GitHub" in Lovable
   - Clone your repository locally

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Add Platform**
   ```bash
   # For iOS
   npx cap add ios
   
   # For Android
   npx cap add android
   ```

4. **Update Native Platforms**
   ```bash
   # For iOS
   npx cap update ios
   
   # For Android
   npx cap update android
   ```

5. **Build the Web App**
   ```bash
   npm run build
   ```

6. **Sync to Native Platform**
   ```bash
   npx cap sync
   ```

7. **Run on Device/Emulator**
   ```bash
   # For iOS (Mac only)
   npx cap run ios
   
   # For Android
   npx cap run android
   ```

### Development Mode
The app is currently configured for hot-reload from the Lovable sandbox:
```
URL: https://7cc39a3b-41aa-4ff2-a0c4-1d8e76270a1d.lovableproject.com
```

For production deployment, update `capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.7cc39a3b41aa4ff2a0c41d8e76270a1d',
  appName: 'serial-bowl',
  webDir: 'dist',
  // Remove server config for production
  ios: {
    contentInset: 'always'
  },
  android: {
    allowMixedContent: false // Set to false in production
  }
};
```

## PWA Features

### Service Worker
Basic offline caching enabled for:
- HTML shell
- Core CSS/JS
- Manifest file

### Manifest
- Standalone display mode
- Portrait orientation
- Custom app icons (192×192, 512×512)
- Shortcuts to Home, Search, Watchlist

## Safe Areas

Safe area insets are automatically applied to:
- Top header (notch/status bar)
- Bottom navigation (home indicator)
- Left/right edges (curved screens)

CSS variables:
```css
--safe-area-inset-top: env(safe-area-inset-top, 0px);
--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
--safe-area-inset-left: env(safe-area-inset-left, 0px);
--safe-area-inset-right: env(safe-area-inset-right, 0px);
```

## Touch Optimization

All interactive elements:
- Minimum 44×44dp touch target
- `touch-action: manipulation` for responsive feel
- Tap highlight color removed
- Hover states disabled on touch devices

## Support

For questions or issues:
- Email: serialbowlofficial@gmail.com
- Legal & Community section in app

## Credits

Serialbowl is an independent project by Noah Ainsworth.
Built with React, Vite, Tailwind CSS, and Capacitor.
