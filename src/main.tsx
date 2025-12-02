import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import { logIntegrationStatus } from "./utils/integrationCheck";

// Check integrations on app startup (development only)
if (import.meta.env.DEV) {
  logIntegrationStatus().catch(console.error);
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
