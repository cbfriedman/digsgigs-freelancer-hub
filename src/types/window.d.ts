// Extended Window interface for third-party analytics
// This file declares global Window properties for analytics tools

export {};

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    fbq?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
    _fbq?: unknown;
  }
}
