'use server';

import { signOut } from './auth';

/**
 * Sign out, as a server action.
 *
 * The account menu used to post a plain form to `/api/auth/signout`. Auth.js
 * refuses that without a CSRF token in the body, so every sign-out came back
 * as `MissingCSRF` and nobody could log out. A server action calls `signOut`
 * on the server instead — the same way the login page calls `signIn` — and is
 * covered by Next's own same-origin check rather than needing a token.
 *
 * In its own `'use server'` file because the menu that uses it is a client
 * component, and a client component can only call a server action it imports.
 */
export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
