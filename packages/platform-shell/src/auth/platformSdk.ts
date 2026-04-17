/**
 * Cross-MFE runtime contract owned by the shell.
 *
 * The shell writes this object to window so that remotes' axios instances can
 * read the current session token without importing shell code. In production
 * this would move into a federation-exposed SDK or an import-map module;
 * a window bag is the minimum viable interface for a 30-minute talk.
 */
export interface PlatformSdk {
  getToken(): string | null;
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
