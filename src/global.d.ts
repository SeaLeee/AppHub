import type { AppHubApi } from '../electron/preload';

declare global {
  interface Window {
    apphub: AppHubApi;
  }
}

export {};
