import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import { logIntegrationStatus } from "./utils/integrationCheck";
import { Capacitor } from "@capacitor/core";
import logoIcon from "@/assets/digsandgigs-logo-icon.svg";

// Set favicon dynamically from assets
const setFavicon = (iconPath: string) => {
  const isSvg = iconPath.endsWith('.svg');
  const isIco = iconPath.endsWith('.ico');
  
  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (link) {
    link.href = iconPath;
    if (isSvg) {
      link.type = "image/svg+xml";
    } else if (isIco) {
      link.type = "image/x-icon";
    }
  } else {
    const newLink = document.createElement("link");
    newLink.rel = "icon";
    if (isSvg) {
      newLink.type = "image/svg+xml";
    } else if (isIco) {
      newLink.type = "image/x-icon";
    } else {
      newLink.type = "image/png";
    }
    newLink.href = iconPath;
    document.getElementsByTagName("head")[0].appendChild(newLink);
  }
  
  // Also set apple-touch-icon (use the same icon)
  const appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
  if (appleLink) {
    appleLink.href = iconPath;
  } else {
    const newAppleLink = document.createElement("link");
    newAppleLink.rel = "apple-touch-icon";
    newAppleLink.sizes = "180x180";
    newAppleLink.href = iconPath;
    document.getElementsByTagName("head")[0].appendChild(newAppleLink);
  }
};

// Set favicon on app load
setFavicon(logoIcon);

// Initialize Capacitor for mobile platforms
if (Capacitor.isNativePlatform()) {
  // Capacitor-specific initialization can go here
  console.log("Running on native platform:", Capacitor.getPlatform());
}

// Check integrations on app startup (development only)
if (import.meta.env.DEV) {
  logIntegrationStatus().catch(console.error);
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
