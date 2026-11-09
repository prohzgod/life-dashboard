/**
 * Accounts and sync are switched off: the app is local-only for now, and moves between devices by backup file.
 * Build with VITE_SYNC_ENABLED=true to bring them back. See docs/DECISIONS.md.
 */
export const SYNC_ENABLED = import.meta.env.VITE_SYNC_ENABLED === 'true';
