import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import { logIntegrationStatus } from "./utils/integrationCheck";
import { Capacitor } from "@capacitor/core";
import lightFaviconIco from "@/assets/light/favicon.ico";
import darkFaviconIco from "@/assets/dark/favicon.ico";
import lightFavicon32 from "@/assets/light/favicon-32x32.png";
import darkFavicon32 from "@/assets/dark/favicon-32x32.png";
import lightFavicon48 from "@/assets/light/favicon-48x48.png";
import darkFavicon48 from "@/assets/dark/favicon-48x48.png";
import lightFavicon64 from "@/assets/light/favicon-64x64.png";
import darkFavicon64 from "@/assets/dark/favicon-64x64.png";
import lightAppleTouchIcon from "@/assets/light/apple-touch-icon.png";
import darkAppleTouchIcon from "@/assets/dark/apple-touch-icon.png";
import lightManifest from "@/assets/light/site.webmanifest";
import darkManifest from "@/assets/dark/site.webmanifest";

// Set favicon dynamically from assets
const setLink = (
  rel: string,
  href: string,
  options: { sizes?: string; type?: string } = {}
) => {
  const selector = options.sizes
    ? `link[rel='${rel}'][sizes='${options.sizes}']`
    : `link[rel='${rel}']:not([sizes])`;
  let link = document.querySelector(selector) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    if (options.sizes) {
      link.sizes = options.sizes;
    }
    document.getElementsByTagName("head")[0].appendChild(link);
  }

  link.href = href;
  if (options.type) {
    link.type = options.type;
  } else {
    link.removeAttribute("type");
  }
};

const setFaviconAssets = (isDark: boolean) => {
  const ico = isDark ? darkFaviconIco : lightFaviconIco;
  const icon32 = isDark ? darkFavicon32 : lightFavicon32;
  const icon48 = isDark ? darkFavicon48 : lightFavicon48;
  const icon64 = isDark ? darkFavicon64 : lightFavicon64;
  const appleIcon = isDark ? darkAppleTouchIcon : lightAppleTouchIcon;
  const manifest = isDark ? darkManifest : lightManifest;

  setLink("icon", ico, { type: "image/x-icon" });
  setLink("icon", icon32, { sizes: "32x32", type: "image/png" });
  setLink("icon", icon48, { sizes: "48x48", type: "image/png" });
  setLink("icon", icon64, { sizes: "64x64", type: "image/png" });
  setLink("apple-touch-icon", appleIcon, { sizes: "180x180" });
  setLink("manifest", manifest);
};

const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
const applyColorScheme = (event?: MediaQueryListEvent) => {
  const isDark = event ? event.matches : colorScheme.matches;
  setFaviconAssets(isDark);
};

// Set favicon on app load and react to theme changes
applyColorScheme();
if (typeof colorScheme.addEventListener === "function") {
  colorScheme.addEventListener("change", applyColorScheme);
} else {
  colorScheme.addListener(applyColorScheme);
}

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
