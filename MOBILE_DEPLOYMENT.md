# Serial Bowl - Mobile App Deployment Guide

This guide covers the complete process for deploying Serial Bowl as a native iOS and Android application using Capacitor.

## Prerequisites

### Required Software
- **Node.js 18+** - [Download](https://nodejs.org/)
- **For iOS Development:**
  - macOS with Xcode 15+
  - CocoaPods: `sudo gem install cocoapods`
- **For Android Development:**
  - Android Studio with Android SDK 33+
  - Java Development Kit (JDK) 17+

## Quick Start

### 1. Export Project from Lovable

1. Click the **Export to GitHub** button in Lovable
2. Clone your repository locally:
   ```bash
   git clone <your-repo-url>
   cd serial-bowl
   ```

### 2. Install Dependencies

```bash
npm install
```

All Capacitor dependencies are already configured in `package.json`:
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/ios`
- `@capacitor/android`
- `@capacitor/app` (deep linking)
- `@capacitor/splash-screen`
- `@capacitor/status-bar`

### 3. Build Web Assets

```bash
npm run build
```

This creates optimized production files in the `dist/` folder.

### 4. Add Native Platforms

**For iOS:**
```bash
npx cap add ios
```

**For Android:**
```bash
npx cap add android
```

**Note:** Only run these commands once. They create the native project folders.

### 5. Sync Web Code to Native

After any code changes, sync to native platforms:

```bash
npx cap sync
```

This copies web assets and updates native configurations.

## Development Workflow

### Live Development Mode

The `capacitor.config.ts` is currently configured for **live reload** during development:

```typescript
server: {
  url: 'https://7cc39a3b-41aa-4ff2-a0c4-1d8e76270a1d.lovableproject.com?forceHideBadge=true',
  cleartext: true,
}
```

This means the native apps load content from the Lovable preview URL.

**Benefits:**
- ✅ Instant updates without rebuilding
- ✅ Debug in Lovable and see changes on device immediately
- ✅ No need to sync after every change

**For Production:** You MUST remove the `server.url` before building release versions (see Production Build section).

### Running on Simulators/Emulators

#### iOS Simulator

```bash
npx cap open ios
```

This opens Xcode. Then:
1. Select a simulator (e.g., iPhone 15 Pro)
2. Click the ▶️ Play button
3. App will install and launch on the simulator

#### Android Emulator

```bash
npx cap open android
```

This opens Android Studio. Then:
1. Create/select an AVD (Android Virtual Device) from Device Manager
2. Click the ▶️ Run button
3. App will install and launch on the emulator

### Running on Physical Devices

#### iOS Device

1. Open in Xcode: `npx cap open ios`
2. Connect your iPhone via USB
3. In Xcode:
   - Select your device from the device dropdown
   - Go to **Signing & Capabilities**
   - Select your **Team** (requires Apple Developer account)
4. Click ▶️ to build and run

**Troubleshooting:**
- If you see "Untrusted Developer" on device, go to **Settings → General → VPN & Device Management** and trust your developer profile

#### Android Device

1. Enable **Developer Options** on your Android device:
   - Go to **Settings → About Phone**
   - Tap **Build Number** 7 times
2. Enable **USB Debugging** in **Developer Options**
3. Connect device via USB
4. Open Android Studio: `npx cap open android`
5. Your device should appear in the device dropdown
6. Click ▶️ to build and run

## Production Build

### Important: Remove Development Server URL

Before building for production, **REMOVE** the development server configuration:

**Edit `capacitor.config.ts`:**

```typescript
// BEFORE (Development)
server: {
  url: 'https://7cc39a3b-41aa-4ff2-a0c4-1d8e76270a1d.lovableproject.com?forceHideBadge=true',
  cleartext: true,
  androidScheme: 'https',
  iosScheme: 'https',
  hostname: 'serialbowl.app',
}

// AFTER (Production)
server: {
  androidScheme: 'https',
  iosScheme: 'https',
  hostname: 'serialbowl.app',
}
```

### Build Production Web Assets

```bash
npm run build
npx cap sync
```

### iOS Production Build

1. Open Xcode: `npx cap open ios`
2. Select **Any iOS Device (arm64)** as the build target
3. Go to **Product → Archive**
4. Once archived, click **Distribute App**
5. Choose **App Store Connect**
6. Follow the wizard to upload

**Pre-submission Checklist:**
- [ ] Removed `server.url` from config
- [ ] Updated version number in `ios/App/App/Info.plist`
- [ ] Created app in [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Prepared app screenshots (required sizes: 6.7", 6.5", 5.5" displays)
- [ ] Created privacy policy URL
- [ ] Filled out app description and metadata

**App Store Review Time:** Typically 1-2 days

### Android Production Build

1. Open Android Studio: `npx cap open android`
2. Go to **Build → Generate Signed Bundle / APK**
3. Select **Android App Bundle**
4. Create or select a **keystore** (keep this file secure!)
5. Enter keystore password and key alias
6. Select **release** build variant
7. Click **Finish**

The AAB file will be in `android/app/release/`

**Upload to Google Play:**
1. Go to [Google Play Console](https://play.google.com/console)
2. Create your app if not already created
3. Navigate to **Production → Create new release**
4. Upload the `.aab` file
5. Fill out store listing, content rating, and pricing

**Pre-submission Checklist:**
- [ ] Removed `server.url` from config
- [ ] Updated `versionCode` and `versionName` in `android/app/build.gradle`
- [ ] Created app in Google Play Console
- [ ] Prepared screenshots (phone and 7" tablet)
- [ ] Created privacy policy URL
- [ ] Completed content rating questionnaire

**Google Play Review Time:** Typically 2-5 days

## Deep Linking

The app supports deep linking with the `serialbowl://` scheme.

### Supported Links

- `serialbowl://post/123` → Opens post detail
- `serialbowl://profile/456` → Opens user profile  
- `serialbowl://show/789` → Opens show detail
- `serialbowl://discover` → Opens discover page

### Testing Deep Links

**iOS Simulator:**
```bash
xcrun simctl openurl booted "serialbowl://post/123"
```

**Android Emulator:**
```bash
adb shell am start -a android.intent.action.VIEW -d "serialbowl://post/123"
```

### Deep Link Configuration

Already configured in:
- **iOS:** `ios/App/App/Info.plist` (CFBundleURLSchemes)
- **Android:** `android/app/src/main/AndroidManifest.xml` (intent-filter)
- **Code:** `src/hooks/useDeepLink.ts`

## Authentication for Native Apps

The app uses Supabase authentication with native redirect handling.

**Redirect URLs configured in `src/lib/env.ts`:**
- Web: `https://your-domain.com/auth/callback`
- Native: `serialbowl://auth/callback`

**Important:** Ensure these URLs are added to your Supabase project:
1. Open Lovable Cloud backend
2. Go to Authentication settings
3. Add to **Redirect URLs**:
   - `serialbowl://auth/callback`
   - `capacitor://localhost`
   - Your production web URL

## App Icons

Icons are located in `public/icons/`:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

**iOS:** Icons are automatically generated from these files by Capacitor

**Android:** Also uses these files, but you may want to generate adaptive icons:
- Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
- Generate all `mipmap` sizes
- Replace files in `android/app/src/main/res/mipmap-*/`

## Splash Screen

Configured in `capacitor.config.ts`:

```typescript
SplashScreen: {
  launchShowDuration: 2000,
  backgroundColor: '#0a0e1a',
  showSpinner: false,
}
```

**Customize:**
- Edit duration, colors in config
- For custom image, add to `ios/App/App/Assets.xcassets/` (iOS)
- For Android, add to `android/app/src/main/res/drawable/`

## App Updates

### Over-the-Air (OTA) Updates

For instant updates without app store review, consider:
- [Capgo](https://capgo.app/) - Live updates for Capacitor
- [Ionic Appflow](https://ionic.io/appflow) - CI/CD + live updates

### Manual Updates

After making changes:
1. Update version in `capacitor.config.ts`
2. Build: `npm run build`
3. Sync: `npx cap sync`
4. Follow production build steps
5. Submit to app stores

## Troubleshooting

### iOS Build Errors

**Problem:** "Pod install failed"
```bash
cd ios/App
pod repo update
pod install
```

**Problem:** "Code signing error"
- Check that you've selected a Team in Xcode
- Ensure your Apple Developer account is active

### Android Build Errors

**Problem:** "SDK location not found"
- Open Android Studio
- Go to **Tools → SDK Manager**
- Ensure Android SDK is installed

**Problem:** "Gradle build failed"
```bash
cd android
./gradlew clean
```

### Deep Links Not Working

**iOS:**
- Check `ios/App/App/Info.plist` contains URL scheme
- Verify Supabase redirect URLs

**Android:**
- Check `AndroidManifest.xml` contains intent-filter
- Test with: `adb shell am start -a android.intent.action.VIEW -d "serialbowl://test"`

### White Screen on Launch

- Ensure you've run `npm run build` before `npx cap sync`
- Check that `webDir: 'dist'` in `capacitor.config.ts` matches your build output
- Removed `server.url` for production builds

## Environment Variables

The app uses these environment variables (configured in Lovable Cloud):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Note: TVDB API key is stored in Supabase Edge Function secrets only (not client-side).

These are **baked into the build** at build time. For native builds, they're included automatically.

## Performance Optimization

### Already Implemented

✅ **Code Splitting** - Configured in `vite.config.ts`
✅ **Service Worker** - PWA caching for offline support
✅ **Lazy Loading** - Images and routes loaded on demand
✅ **Touch Optimization** - 44px minimum touch targets
✅ **Safe Area Support** - Notch/Dynamic Island padding

### Recommendations

- Test on real devices with slower networks
- Use Chrome DevTools → Network → Throttling
- Monitor bundle size: `npm run build -- --mode analyze`
- Consider reducing large dependencies

## Analytics & Monitoring

Consider adding:
- **Firebase Analytics** - User behavior tracking
- **Sentry** - Error monitoring
- **Google Analytics** - Web and mobile tracking

## Resources

- 📚 [Capacitor Documentation](https://capacitorjs.com/docs)
- 🍎 [Apple Developer](https://developer.apple.com)
- 🤖 [Android Developers](https://developer.android.com)
- 📱 [Lovable Cloud Docs](https://docs.lovable.dev)
- 💬 [Lovable Discord Community](https://discord.gg/lovable)

## Support

Need help? Check out:
- `docs/mobile.md` - Additional mobile setup details
- `docs/mobile-readiness.md` - PWA and mobile features checklist
- Lovable Community Discord

---

**Last Updated:** 2025-10-10
**Serial Bowl Version:** 1.0.0
**Capacitor Version:** Latest
