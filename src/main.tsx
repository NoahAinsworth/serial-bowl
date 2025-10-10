import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Capacitor plugins
if ((window as any).Capacitor) {
  const { SplashScreen, StatusBar, App: CapApp } = (window as any).Capacitor.Plugins || {};
  
  // Configure status bar
  if (StatusBar) {
    StatusBar.setStyle({ style: 'dark' }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#0a0e1a' }).catch(() => {});
  }
  
  // Hide splash screen when app is ready
  if (SplashScreen) {
    SplashScreen.hide().catch(() => {});
  }
}

// Register service worker for PWA (web only)
if ('serviceWorker' in navigator && !(window as any).Capacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silently fail if SW registration fails
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
