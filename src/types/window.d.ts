// Extended Window interface for third-party analytics
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
}

