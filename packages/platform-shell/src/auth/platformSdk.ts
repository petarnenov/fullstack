/**
 * Cross-MFE runtime contract owned by the shell.
 *
 * With httpOnly cookies the access token is no longer visible to JS — the
 * browser attaches it to every same-origin request automatically. What the
 * remotes need from the shell is:
 *   1. The CSRF token to echo as X-CSRF-Token on state-changing requests.
 *   2. A way to trigger logout when the backend signals 401 post-refresh.
 *   3. The current user so widgets can render role-aware UI without /me.
 *
 * The SDK is duplicated inline in each MFE (one-line interface, zero build
 * coupling). When evolving it, update every MFE copy + the ambient
 * declaration in platform-shell/src/vite-env.d.ts.
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
