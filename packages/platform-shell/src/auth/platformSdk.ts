/**
 * Cross-MFE runtime contract owned by the shell.
 *
 * With httpOnly cookies, the access token is no longer readable from JS —
 * the browser attaches it to every same-origin request automatically. What
 * the remotes *do* need from the shell is:
 *   1. The CSRF token for the X-CSRF-Token header on state-changing requests.
 *   2. A way to force a logout when the backend signals 401 after refresh.
 *   3. The current user so MFEs can render role-aware UI without calling /me.
 *
 * The SDK is duplicated inline in each MFE (one-line interface, zero build
 * coupling). When evolving it, update every MFE copy + vite-env.d.ts.
 */

import type { AuthenticatedUser } from "./authApi";

export interface PlatformSdk {
  user: AuthenticatedUser | null;
  csrfToken: string | null;
  logout(): Promise<void>;
}

const SDK_KEY = "__AMP_PLATFORM__";
export const AUTH_EXPIRED_EVENT = "amp:auth-expired";

declare global {
  interface Window {
    __AMP_PLATFORM__?: PlatformSdk;
  }
}

export function installPlatformSdk(sdk: PlatformSdk): () => void {
  window[SDK_KEY] = sdk;
  return () => {
    if (window[SDK_KEY] === sdk) {
      delete window[SDK_KEY];
    }
  };
}

export function dispatchAuthExpired(): void {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}
