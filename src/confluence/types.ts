/**
 * Re-export barrel for Confluence types.
 *
 * Types are organized into per-domain files under `./types/`. This shim keeps
 * the historical import path (`from '../types.js'`) working without forcing
 * every resource and consumer to update its imports.
 */
export * from './types/index.js';
