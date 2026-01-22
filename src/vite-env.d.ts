/// <reference types="vite/client" />

// Google Analytics gtag type declaration
declare function gtag(...args: any[]): void;

// Reddit Pixel rdt type declaration
declare function rdt(...args: any[]): void;

declare global {
  interface Window {
    dataLayer: any[];
    rdt: typeof rdt & { q?: any[]; loaded?: boolean };
  }
}
