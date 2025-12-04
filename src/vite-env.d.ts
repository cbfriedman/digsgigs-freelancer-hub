/// <reference types="vite/client" />

// Google Analytics gtag type declaration
declare function gtag(...args: any[]): void;
declare global {
  interface Window {
    dataLayer: any[];
  }
}
