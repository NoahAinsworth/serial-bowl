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

// Service worker is registered automatically by vite-plugin-pwa
// No manual registration needed

createRoot(document.getElementById("root")!).render(<App />);
