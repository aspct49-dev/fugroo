/**
 * The handful of VIP transfer constants both sides need.
 *
 * Split from `vip-transfer.ts` because that file is `server-only` — it holds
 * the webhook and the byte-level file checks, neither of which belongs in a
 * browser bundle. The form still needs to offer the same lossback options and
 * enforce the same file count, and a second copy of those would be a second
 * thing to keep in step.
 */

export const LOSSBACK_OPTIONS = ['10%', '15%', '20%', 'N/A'] as const;
export type Lossback = (typeof LOSSBACK_OPTIONS)[number];

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
