import { registerSW } from 'virtual:pwa-register';

/** Registers the offline service worker. New versions install in the background and apply on next load. */
export function registerServiceWorker() {
  if (import.meta.env.DEV) return;
  registerSW({ immediate: true });
}
