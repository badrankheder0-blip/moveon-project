import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { effectivePermissions, isRole, isStaffRole, type Permission, type Role } from "@mon/core";

import { HINT_COOKIE, LOCALE_COOKIE } from "./lib/access/cookies";
import { isUnder, permissionFor, requiredPermission, type StaffRoutePath } from "./lib/access/staff-routes";
import { DEFAULT_LOCALE, isLocale, negotiateLocale } from "./lib/i18n/config";

/**
 * Locale routing and route protection.
 *
 * ## Why protection lives here
 *
 * The admin area used to be guarded by a `useEffect` inside the dashboard
 * shell that redirected when the signed-in user was not staff. That runs in
 * the browser, after the page has been sent and rendered — so the admin
 * interface was briefly visible to anyone who typed the URL, and the redirect
 * was one devtools breakpoint away from never happening.
 *
 * Middleware runs before anything is rendered. It can only see cookies, which
 * is why the API now issues a short-lived signed session hint alongside the
 * httpOnly refresh cookie.
 *
 * ## What this is and is not
 *
 * This decides *where to send someone*. It is not the authorisation boundary:
 * every endpoint behind these screens re-reads the caller's role from the
 * database and checks the capability itself. A forged or stale hint gets a
 * visitor to a page that will then refuse to load any data.
 *
 * That layering is deliberate. A guard that runs early gives the right
 * experience; a guard that runs at the data gives the right answer.
 */

/**
 * The hint key, which is not the key that mints API sessions.
 *
 * `next.config.js` puts it here — deriving it from the access secret when no
 * separate one is configured — so this process can verify a routing hint
 * without holding the secret that signs access tokens.
 */
const secret = new TextEncoder().encode(process.env.JWT_HINT_SECRET ?? "");
const issuer = process.env.JWT_ISSUER ?? "mon-api";

// Which staff route needs which capability lives in `lib/access/staff-routes`,
// beside the navigation that links to those same routes. Two lists that were
// meant to mirror each other did not, and the edge was the half with entries
// missing.

/** Routes that need a session but no particular capability. */
const SIGNED_IN_ONLY = ["/dashboard", "/konto"];

/** The dashboard's sign-in, open to everyone. */
const ADMIN_SIGN_IN = "/admin/anmelden";

interface Hint {
  role: Role;
  /** What the role may do, or — for a "Selected pages" member — their pages'. */
  permissions: readonly Permission[];
}

async function readHint(request: NextRequest): Promise<Hint | null> {
  const token = request.cookies.get(HINT_COOKIE)?.value;
  if (!token || secret.length === 0) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer,
      audience: `${issuer}:hint`,
      // The verifier decides which algorithm was acceptable, not the token.
      // Without this the header is something the sender writes.
      algorithms: ["HS256"],
    });

    if (!isRole(payload.role)) return null;

    // A member's pages ride in the hint so they are routed by what they were
    // given rather than by the role's own grants — the same resolution the
    // API applies. No `pages` claim means the role decides, as before.
    const pages = Array.isArray(payload.pages) ? payload.pages.filter((p): p is string => typeof p === "string") : null;

    return { role: payload.role, permissions: effectivePermissions(payload.role, pages) };
  } catch {
    // Expired or tampered with. Treated as signed out rather than as an
    // error: the browser will refresh the session and come back.
    return null;
  }
}

/**
 * Where a staff member who may not open what they asked for is sent: the
 * overview when they may open it, otherwise the first screen they may, in the
 * order the admin prototype falls back through. Without this a member who was
 * not given the overview would be sent to it, refused, and sent to it again.
 */
const FALLBACK_ORDER: readonly StaffRoutePath[] = [
  "/admin",
  "/admin/auftraege",
  "/admin/angebote",
  "/admin/posteingang",
  "/admin/kalender",
  "/admin/karte",
  "/admin/mitarbeiter",
  "/admin/kunden",
  "/admin/rechnungen",
  "/admin/berichte",
  "/admin/schaeden",
  "/admin/bewertungen",
  "/admin/kundennachrichten",
  "/admin/benachrichtigungen",
  "/admin/gebiete",
  "/admin/inhalte",
  "/admin/buchungsseite",
  "/admin/bilder",
  "/admin/leistungen",
  "/admin/preise",
  "/admin/rabatte",
  "/admin/einstellungen",
  "/admin/nutzer",
];

function staffLanding(permissions: readonly Permission[]): string | null {
  return FALLBACK_ORDER.find((path) => permissions.includes(permissionFor(path))) ?? null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and API calls carry no locale and need no guard.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const first = pathname.split("/").filter(Boolean)[0];

  // ── Without a locale prefix, add one and come back ─────────────────
  if (!isLocale(first)) {
    const remembered = request.cookies.get(LOCALE_COOKIE)?.value;

    const locale = isLocale(remembered)
      ? remembered
      : negotiateLocale(request.headers.get("accept-language")) || DEFAULT_LOCALE;

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = first;
  const route = pathname.slice(`/${locale}`.length) || "/";

  // The dashboard's own sign-in sits under /admin but needs no session; staff
  // who already have one are sent on to where they may work.
  if (route === ADMIN_SIGN_IN) {
    const hint = await readHint(request);
    const landing = hint && isStaffRole(hint.role) ? staffLanding(hint.permissions) : null;

    if (landing) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${landing}`;
      url.search = "";
      return NextResponse.redirect(url);
    }

    return withLocaleCookie(NextResponse.next(), locale);
  }

  const needsCapability = requiredPermission(route);
  const needsSession = needsCapability !== null || SIGNED_IN_ONLY.some((p) => isUnder(route, p));

  if (needsSession) {
    const hint = await readHint(request);

    if (!hint) {
      const url = request.nextUrl.clone();
      // The office signs in on the dashboard's own page, customers on the
      // website's.
      url.pathname = isUnder(route, "/admin") ? `/${locale}${ADMIN_SIGN_IN}` : `/${locale}/login`;
      // So they land where they were going once signed in.
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (needsCapability) {
      // A customer who reaches an admin URL is sent to their own account
      // rather than to a refusal: they are signed in, just not for this.
      if (!isStaffRole(hint.role) || !hint.permissions.includes(needsCapability)) {
        const landing = isStaffRole(hint.role) ? staffLanding(hint.permissions) : null;
        const url = request.nextUrl.clone();
        url.pathname = landing ? `/${locale}${landing}` : `/${locale}/konto`;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    // The old customer dashboard moved: customers to their account under
    // /konto, the office to the admin dashboard. Old links in sent emails keep
    // working. The printable invoice stays where it is.
    if (isUnder(route, "/dashboard") && !route.startsWith("/dashboard/rechnungen/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${movedDashboardRoute(route, isStaffRole(hint.role))}`;
      return NextResponse.redirect(url);
    }
  }

  return withLocaleCookie(NextResponse.next(), locale);
}

/** Where an old /dashboard address now lives, for a customer or for the office. */
function movedDashboardRoute(route: string, staff: boolean): string {
  const order = route.match(/^\/dashboard\/auftraege\/([^/]+)$/);
  if (order) return staff ? `/admin/auftraege/${order[1]}` : `/konto/auftraege/${order[1]}`;
  if (isUnder(route, "/dashboard/auftraege")) return staff ? "/admin/auftraege" : "/konto/auftraege";
  // Reviews are left on the completed booking, in the account.
  if (isUnder(route, "/dashboard/bewertungen")) return staff ? "/admin/bewertungen" : "/konto/auftraege";
  if (isUnder(route, "/dashboard/nachrichten")) return staff ? "/admin/posteingang" : "/konto/benachrichtigungen";
  return staff ? "/admin" : "/konto";
}

/** Remembers the language so a later visit to "/" lands in the same one. */
function withLocaleCookie(response: NextResponse, locale: string): NextResponse {
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
