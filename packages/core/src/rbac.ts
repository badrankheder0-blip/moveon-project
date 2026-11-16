/**
 * Roles and permissions.
 *
 * Shared by the API, which enforces them, and the web app, which uses them to
 * decide what to render. Both read the same table, so a screen cannot offer an
 * action the server will refuse — and, more importantly, hiding a control is
 * never mistaken for securing it.
 *
 * ## Why permissions rather than role checks
 *
 * Routes used to ask `requireRole("admin")`. That reads fine until a fourth
 * role arrives and every route has to be revisited to decide whether it is
 * included. A route that asks for a *capability* — "may this caller change
 * pricing?" — keeps working when the roles change around it, and the answer
 * lives in one table instead of being spread across forty route files.
 *
 * ## Why the grants are not in the token
 *
 * The access token carries the role. It does NOT carry the permission set:
 * a token minted before a permission was revoked would otherwise keep the
 * permission until it expired. The API resolves the caller's role to grants on
 * each request, so a change takes effect at once.
 */

export const ROLES = [
  "customer",
  "customer_service",
  "operator",
  "admin",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Rank orders the roles for coarse comparisons — "is this caller at least an
 * operator?" It is NOT the authorisation mechanism: a higher rank does not
 * silently inherit grants, because inheritance by number is how someone ends
 * up with a permission nobody deliberately gave them. Grants are listed
 * explicitly per role below.
 */
export const ROLE_RANK: Record<Role, number> = {
  customer: 0,
  customer_service: 10,
  operator: 20,
  admin: 30,
  super_admin: 40,
};

/** Every capability the system recognises. */
export const PERMISSIONS = [
  // Orders and the work itself
  "orders.read",
  "orders.write",
  "orders.assign",
  "orders.cancel",
  "quotes.read",
  "availability.write",

  // People
  "customers.read",
  "customers.write",

  // Support
  "messages.read",
  "messages.write",
  "complaints.read",
  "complaints.write",
  "reviews.read",
  "reviews.moderate",

  // Money
  "payments.read",
  "payments.write",
  "pricing.read",
  "pricing.write",
  "discounts.write",

  // The product the business sells and the site that sells it
  "catalog.write",
  "content.write",
  "theme.write",

  // Administration
  "users.read",
  "users.write",
  "roles.write",
  "settings.write",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * What each role may do.
 *
 * Written out in full rather than as "operator = customer_service + extras".
 * The lists repeat, and that is the point: reading one row tells you exactly
 * what that role can do without following a chain, and removing a grant from
 * one role cannot silently remove it from another.
 */
const CUSTOMER_SERVICE: readonly Permission[] = [
  "orders.read",
  "quotes.read",
  "customers.read",
  "messages.read",
  "messages.write",
  "complaints.read",
  "complaints.write",
  "reviews.read",
];

const OPERATOR: readonly Permission[] = [
  "orders.read",
  "orders.write",
  "orders.assign",
  "orders.cancel",
  "quotes.read",
  "availability.write",
  "customers.read",
  "messages.read",
  "messages.write",
  "complaints.read",
  "complaints.write",
  "reviews.read",
  "reviews.moderate",
  "payments.read",
];

const ADMIN: readonly Permission[] = [
  ...OPERATOR,
  "customers.write",
  "payments.write",
  "pricing.read",
  "pricing.write",
  "discounts.write",
  "catalog.write",
  "content.write",
  "theme.write",
  "users.read",
  "users.write",
  "settings.write",
  "audit.read",
];

/**
 * The only role that can change what other people may do.
 *
 * Kept apart from `admin` deliberately: an admin who can grant themselves
 * `roles.write` is a super admin with extra steps.
 */
const SUPER_ADMIN: readonly Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  customer: [],
  customer_service: CUSTOMER_SERVICE,
  operator: OPERATOR,
  admin: ADMIN,
  super_admin: SUPER_ADMIN,
};

/** Whether a role holds a capability. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Whether a role holds every one of several capabilities. */
export function canAll(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => can(role, permission));
}

/** Whether a role holds at least one of several capabilities. */
export function canAny(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

/**
 * Whether a role belongs to the staff side of the product.
 *
 * Defined by rank rather than by listing roles, so a new staff role added
 * above `customer` is included without editing every call site.
 */
export function isStaffRole(role: Role): boolean {
  return ROLE_RANK[role] > ROLE_RANK.customer;
}

/**
 * Whether an actor may assign a role to someone.
 *
 * Two rules, both about privilege escalation:
 *   - only `roles.write` holders may assign at all, and
 *   - nobody may assign a role at or above their own rank.
 *
 * The second is what stops an admin from minting a super admin — or another
 * admin who could then be used to do it indirectly.
 */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (!can(actor, "roles.write")) return false;
  return ROLE_RANK[target] < ROLE_RANK[actor];
}

/** Type guard for values arriving from the database or a request. */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

// ── Page permissions ("Selected pages" members) ──────────────────────────

/**
 * The dashboard pages an account can be given one by one, grouped as the
 * admin prototype's account dialog groups them. The keys are the dashboard's
 * view names (apps/web/lib/admin/nav.ts).
 *
 * Admin users is deliberately absent: managing who may do what is never a
 * page you can be handed, only something that comes with full access.
 */
export const ADMIN_PAGE_GROUPS = [
  { key: "grpOps", pages: ["overview", "orders", "quotes", "inbox", "calendar", "map", "staff", "customers"] },
  { key: "grpBiz", pages: ["invoices", "reports", "claims", "reviews", "messages", "notify"] },
  { key: "grpCat", pages: ["services", "pricing", "zones", "discounts"] },
  { key: "grpSite", pages: ["pages", "home", "site", "faq", "jobs", "content"] },
  { key: "grpSys", pages: ["settings"] },
] as const;

export type AdminPage = (typeof ADMIN_PAGE_GROUPS)[number]["pages"][number];

export const ADMIN_PAGES: readonly AdminPage[] = ADMIN_PAGE_GROUPS.flatMap((group) => group.pages);

/**
 * What ticking a page hands out: the capabilities its screen needs to load
 * and to do its work.
 *
 * The first capability of each list is the one the route table
 * (apps/web/lib/access/staff-routes.ts) asks for to open the page, so a ticked
 * page always opens. Pages that share a capability share it here too — the
 * overview, orders and calendar all read orders — which is why a member given
 * one of them can also open the others: the API answers capability questions,
 * not page questions, and a page list finer than the capabilities behind it
 * would be a promise the server could not keep.
 */
export const PAGE_CAPABILITIES: Record<AdminPage, readonly Permission[]> = {
  overview: ["orders.read"],
  orders: ["orders.read", "orders.write", "orders.assign", "orders.cancel", "quotes.read"],
  // Accepting a quote turns it into an order.
  quotes: ["quotes.read", "orders.write"],
  inbox: ["messages.read", "messages.write"],
  calendar: ["orders.read"],
  map: ["orders.assign", "orders.read"],
  staff: ["orders.assign"],
  customers: ["customers.read"],
  invoices: ["payments.read", "payments.write"],
  reports: ["payments.read"],
  claims: ["complaints.read", "complaints.write"],
  reviews: ["reviews.read", "reviews.moderate"],
  // The automatic customer messages are configuration, like Settings.
  messages: ["settings.write"],
  notify: ["messages.write", "messages.read"],
  services: ["catalog.write"],
  pricing: ["pricing.read", "pricing.write"],
  zones: ["settings.write"],
  discounts: ["discounts.write"],
  pages: ["content.write"],
  home: ["content.write"],
  site: ["content.write"],
  // The website FAQ: its categories and questions are CMS content.
  faq: ["content.write"],
  // Job postings and the applications (with CVs) sent for them.
  jobs: ["content.write"],
  content: ["theme.write", "content.write"],
  // Settings carries the logo as well as the company data.
  settings: ["settings.write", "theme.write"],
};

/** Type guard for page keys arriving from the database or a request. */
export function isAdminPage(value: unknown): value is AdminPage {
  return typeof value === "string" && (ADMIN_PAGES as readonly string[]).includes(value);
}

/**
 * Whether a role is the "Selected pages" kind, whose page list — when it has
 * one — replaces the role's own grants. Owners and full admins open
 * everything, and customers have no dashboard at all, so a list stored on
 * them would mean nothing.
 */
export function usesPagePermissions(role: Role): boolean {
  return role === "operator" || role === "customer_service";
}

/**
 * What an account may do: its role's grants, or — for a member with a page
 * list — exactly what the ticked pages hand out.
 *
 * A member whose list is null keeps the role's own grants, which is what
 * every operator and customer-service account created before page
 * permissions existed relies on. Unknown keys are ignored rather than
 * rejected: a page renamed in a later release must not lock its holders out
 * of everything else, nor grant anything.
 */
export function effectivePermissions(
  role: Role,
  pagePermissions: readonly string[] | null | undefined,
): readonly Permission[] {
  if (!usesPagePermissions(role) || !Array.isArray(pagePermissions)) {
    return ROLE_PERMISSIONS[role];
  }

  const granted = new Set<Permission>();

  for (const page of pagePermissions) {
    if (!isAdminPage(page)) continue;
    for (const permission of PAGE_CAPABILITIES[page]) granted.add(permission);
  }

  // In PERMISSIONS order, so two members with the same pages compare equal.
  return PERMISSIONS.filter((permission) => granted.has(permission));
}

/**
 * Whether an actor may create, change, switch off or delete an account with
 * the target role.
 *
 * The prototype's three access levels over the role enum: `super_admin` is the
 * Owner, `admin` is Full access, `operator`/`customer_service` are Selected
 * pages. The rules:
 *
 *   - nobody manages the owner: there is exactly one, made first, and it can
 *     be neither removed nor demoted — not even by itself, since an owner who
 *     demotes themselves leaves the business with nobody who can grant roles;
 *   - only the owner manages full admins, so an admin cannot mint a peer, nor
 *     remove one;
 *   - anyone who may write users (full access) manages members and customers.
 */
export function canManageAccount(actor: Role, target: Role): boolean {
  if (target === "super_admin") return false;
  if (target === "admin") return actor === "super_admin";
  return can(actor, "users.write");
}
