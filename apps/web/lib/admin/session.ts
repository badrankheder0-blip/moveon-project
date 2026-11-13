/**
 * "Keep me signed in" on the dashboard's sign-in.
 *
 * Unticked, the session should end when the browser closes. The refresh
 * cookie outlives the browser, so this browser remembers the choice
 * (localStorage) beside a cookie with no expiry, which the browser drops on
 * closing. A dashboard that finds the choice without the cookie signs out.
 * A cookie rather than sessionStorage, which a second tab would not share.
 */

const FORGET_KEY = "mon.admin.forget";
const ALIVE_COOKIE = "mon_admin_alive";

export function rememberSignIn(remember: boolean): void {
  try {
    if (remember) localStorage.removeItem(FORGET_KEY);
    else localStorage.setItem(FORGET_KEY, "1");
    document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax`;
  } catch {
    // Without storage the session simply lasts as long as the refresh cookie.
  }
}

/** True when the last sign-in asked to be forgotten and the browser has since closed. */
export function signInExpired(): boolean {
  try {
    return localStorage.getItem(FORGET_KEY) === "1" && !document.cookie.split("; ").some((part) => part.startsWith(`${ALIVE_COOKIE}=`));
  } catch {
    return false;
  }
}

export function forgetSignIn(): void {
  try {
    localStorage.removeItem(FORGET_KEY);
    document.cookie = `${ALIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // Nothing to clear.
  }
}
