import { eq } from "drizzle-orm";

import {
  effectivePermissions,
  isAdminPage,
  isRole,
  usesPagePermissions,
  type AdminPage,
  type Permission,
  type Role,
} from "@mon/core";
import { db, schema } from "@mon/db";

export interface AccountAccess {
  role: Role;
  /**
   * The pages a "Selected pages" member was given, or null when the role
   * decides on its own (owners, full admins, customers, and members created
   * before page permissions existed).
   */
  pagePermissions: AdminPage[] | null;
  /** The role's grants, or the union of the ticked pages' for a member. */
  permissions: readonly Permission[];
}

/**
 * What an account may do *right now*.
 *
 * An access token asserts a role at the moment it was minted and keeps
 * asserting it until it expires — up to fifteen minutes during which a demoted
 * administrator is still an administrator and a blocked account still works.
 * Every guard in this API therefore asks the database rather than the token,
 * and they all ask through here: one definition of "may this account act at
 * all", instead of one per middleware that drifts from the others.
 *
 * The socket gateway asks the same question on a timer, because a connection
 * outlives the token that opened it.
 *
 * Deliberately not cached. A cache is a second place for the answer to be
 * stale, which is the exact failure this function exists to remove; the read
 * is a primary-key lookup and staff traffic is low volume.
 */
export async function effectiveAccess(userId: string): Promise<AccountAccess | null> {
  const [row] = await db
    .select({
      role: schema.users.role,
      status: schema.users.status,
      pagePermissions: schema.users.pagePermissions,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  // Deleted since the token was minted.
  if (!row) return null;

  // A blocked account keeps its role in the table but loses every capability,
  // so suspending someone does not also require demoting them — and reversing
  // a suspension does not require remembering what they used to be.
  if (row.status === "blocked") return null;

  if (!isRole(row.role)) return null;

  const pagePermissions = pagesFor(row.role, row.pagePermissions);

  return {
    role: row.role,
    pagePermissions,
    permissions: effectivePermissions(row.role, pagePermissions),
  };
}

/** The role alone, for callers that only branch on staff versus customer. */
export async function effectiveRole(userId: string): Promise<Role | null> {
  return (await effectiveAccess(userId))?.role ?? null;
}

/**
 * The stored page list as it applies to this role: null for roles that do not
 * use one, and known keys only, so a hand-edited row cannot carry anything
 * the dashboard does not offer.
 */
export function pagesFor(role: Role, stored: unknown): AdminPage[] | null {
  if (!usesPagePermissions(role) || !Array.isArray(stored)) return null;
  return stored.filter(isAdminPage);
}
