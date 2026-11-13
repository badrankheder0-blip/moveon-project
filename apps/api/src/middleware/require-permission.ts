import type { NextFunction, Request, Response } from "express";

import type { Permission, Role } from "@mon/core";

import { effectiveAccess } from "../lib/account-state.js";
import { AppError } from "../lib/errors.js";

/**
 * Authorisation by capability.
 *
 * Routes used to name roles — `requireRole("staff", "admin")`. That reads
 * fine until a fourth role exists and every route has to be revisited to
 * decide whether it belongs in the list. Asking for a capability instead —
 * "may this caller change pricing?" — leaves the route alone when the roles
 * change around it, and keeps the answer in one table.
 *
 * ## The grants are re-read, not taken from the token
 *
 * The access token carries a role, and trusting it would save a query. But a
 * token minted before someone was demoted keeps asserting the old role until
 * it expires — up to fifteen minutes during which a revoked administrator is
 * still an administrator. `requireAuth` has already resolved the account
 * against the database for this request and left the answer on `req`; this
 * guard reuses that rather than repeating the read, and falls back to its own
 * read so it is still correct if it is ever mounted on its own.
 *
 * ## Roles and pages
 *
 * The answer is the caller's effective permissions: the role's grants, or —
 * for a "Selected pages" member — exactly what the ticked pages hand out
 * (`effectivePermissions` in @mon/core). For every account without a page
 * list that is the role's grants, as it always was.
 */

interface RequestAccess {
  role: Role;
  permissions: readonly Permission[];
}

/** The caller's role and grants as the database has them for this request. */
async function accessForRequest(req: Request, userId: string): Promise<RequestAccess | null> {
  if (req.verifiedRole && req.verifiedPermissions) {
    return { role: req.verifiedRole, permissions: req.verifiedPermissions };
  }

  const access = await effectiveAccess(userId);
  if (!access) return null;

  req.verifiedRole = access.role;
  req.verifiedPermissions = access.permissions;
  req.verifiedPages = access.pagePermissions;
  return access;
}

/**
 * Requires every listed capability.
 *
 * Several rather than one because some routes genuinely need a combination —
 * assigning a crew is both reading an order and changing it — and spelling
 * that out is clearer than inventing a compound permission for each pairing.
 */
export function requirePermission(...required: readonly Permission[]) {
  return guard("requirePermission", required, (held, wanted) => wanted.every((p) => held.includes(p)), " and ");
}

/**
 * Requires at least one of the listed capabilities.
 *
 * For a tool two editors share: a photo upload serves both the content editor
 * (page photos, `content.write`) and the theme editor (the logo,
 * `theme.write`), and either one alone should be enough to use it.
 */
export function requireAnyPermission(...accepted: readonly Permission[]) {
  return guard("requireAnyPermission", accepted, (held, wanted) => wanted.some((p) => held.includes(p)), " or ");
}

function guard(
  name: string,
  permissions: readonly Permission[],
  allows: (held: readonly Permission[], wanted: readonly Permission[]) => boolean,
  joiner: string,
) {
  if (permissions.length === 0) {
    throw new Error(`${name} needs at least one permission.`);
  }

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      // A programming error, not a client error: the guard was mounted
      // without `requireAuth` in front of it.
      next(AppError.internal(`${name} was used without requireAuth.`));
      return;
    }

    try {
      const access = await accessForRequest(req, req.user.id);

      if (!access) {
        next(AppError.unauthenticated());
        return;
      }

      if (!allows(access.permissions, permissions)) {
        next(AppError.insufficientRole(permissions.join(joiner)));
        return;
      }

      // Downstream handlers branch on what the caller may do, so they read the
      // verified role rather than the token's copy of it.
      req.user.role = access.role;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Whether the caller of this request holds a capability, answered from the
 * grants `requireAuth` resolved — page permissions included.
 *
 * For a handler that branches on a capability after the guard has let it in:
 * `can(req.verifiedRole, …)` answers for the role alone and so misjudges a
 * "Selected pages" member in both directions.
 */
export async function requestCan(req: Request, permission: Permission): Promise<boolean> {
  if (!req.user) return false;
  const access = await accessForRequest(req, req.user.id);
  return access !== null && access.permissions.includes(permission);
}

/**
 * Answers a capability question without rejecting the request.
 *
 * For handlers that serve both sides of a boundary — an order is readable by
 * the customer who placed it and by staff with `orders.read`, and the handler
 * has to know which case it is in to decide how much to return.
 */
export async function hasPermission(
  userId: string,
  permission: Permission,
): Promise<boolean> {
  const access = await effectiveAccess(userId);
  return access !== null && access.permissions.includes(permission);
}
