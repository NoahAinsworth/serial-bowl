# Mobile App Setup Guide

This guide covers building and deploying Serial Bowl as a native mobile app using Capacitor.

## Prerequisites

- Node.js 18+ installed
- For iOS: macOS with Xcode 14+
- For Android: Android Studio with SDK 33+

## Initial Setup

### 1. Install Capacitor Dependencies

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### 2. Build the Web App

```bash
npm run build
```

### 3. Add Native Platforms

```bash
# For iOS
npx cap add ios

# For Android
npx cap add android
```

### 4. Sync Web Code to Native

```bash
npx cap sync
```

## Development Workflow

### Running on iOS

1. Open Xcode:
   ```bash
   npx cap open ios
   ```

2. Select a simulator or connected device
3. Click the play button to build and run

### Running on Android

1. Open Android Studio:
   ```bash
   npx cap open android
   ```

2. Select a simulator or connected device
3. Click the play button to build and run

### Live Reload (Development)

For faster development, you can use live reload:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Note the local network URL (e.g., `http://192.168.1.100:8080`)

3. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.100:8080',
     cleartext: true
   }
   ```

4. Run `npx cap sync`
5. Launch the app - it will now connect to your dev server

**Important:** Remove the `server.url` before building for production!

## Deep Links

The app supports deep linking with the `serialbowl://` scheme:

- `serialbowl://post/123` → Opens post detail
- `serialbowl://profile/456` → Opens user profile
- `serialbowl://show/789` → Opens show detail

### Configure Deep Links

#### iOS (Info.plist)

Already configured in `ios/App/App/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>serialbowl</string>
    </array>
  </dict>
</array>
```

#### Android (AndroidManifest.xml)

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="serialbowl" />
</intent-filter>
```

## CORS Configuration

When running in native mode, the app uses the `capacitor://localhost` origin. Ensure your Supabase/backend allows this origin:

1. In Lovable Cloud dashboard, add to allowed redirect URLs:
   - `capacitor://localhost`
   - `serialbowl://auth/callback`

2. For API CORS, the Capacitor origin is automatically handled.

## Push Notifications (Future)

To add push notifications:

```bash
npm install @capacitor/push-notifications
```

Then configure in `capacitor.config.ts` and follow platform-specific setup guides.

## Building for Production

### iOS

1. Open Xcode: `npx cap open ios`
2. Select "Any iOS Device" as the target
3. Product → Archive
4. Follow Xcode's distribution wizard to upload to App Store Connect

### Android

1. Open Android Studio: `npx cap open android`
2. Build → Generate Signed Bundle/APK
3. Follow the wizard to create a release build
4. Upload the AAB to Google Play Console

## App Store Assets

### Icons

Generate icons from `public/icons/icon-512.png`:
- iOS: Use Xcode's asset catalog
- Android: Place in `android/app/src/main/res/mipmap-*` folders

### Screenshots

Required sizes:
- iPhone: 6.7", 6.5", 5.5"
- iPad: 12.9", 11"
- Android: Phone and 7" tablet

## Performance Checklist

- [ ] Remove `server.url` from capacitor.config.ts for production
- [ ] Run `npm run build` before `npx cap sync`
- [ ] Test on physical devices, not just simulators
- [ ] Verify offline functionality works
- [ ] Test deep links from other apps
- [ ] Check app size (< 50MB recommended)

## Troubleshooting

### iOS Build Fails

- Check Xcode version (14+)
- Run `pod repo update` in `ios/App`
- Clean build folder: Product → Clean Build Folder

### Android Build Fails

- Check SDK version (33+)
- Invalidate caches: File → Invalidate Caches / Restart
- Run `./gradlew clean` in `android/` folder

### Deep Links Not Working

- Verify scheme is configured in both platforms
- Check that redirect URLs are added to Supabase
- Test with `adb shell am start -a android.intent.action.VIEW -d "serialbowl://post/123"` (Android)

## Resources

- [Capacitor Docs](https://capacitorjs.com)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Design Guidelines](https://material.io/design)
