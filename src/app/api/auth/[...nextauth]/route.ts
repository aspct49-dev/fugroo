/**
 * The OAuth endpoints: sign-in, callback, sign-out and session.
 *
 * Auth.js supplies both handlers; this file only mounts them. The callback URL
 * to register in the Discord application is this path plus the provider name —
 * /api/auth/callback/discord.
 */
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
