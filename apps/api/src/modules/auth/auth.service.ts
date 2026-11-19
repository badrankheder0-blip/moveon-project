import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  needsRehash,
  refreshTokenExpiry,
  signAccessToken,
  verifyPassword,
  type UserRole,
} from "@mon/auth";
import { effectivePermissions, type AdminPage, type Permission } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";

import { pagesFor } from "../../lib/account-state.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { disconnectUserSockets } from "../../realtime/gateway.js";

const { users, refreshTokens } = schema;

export interface SessionContext {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    locale: string;
    /** What the screens may offer: the role's grants, or a member's pages'. */
    permissions: readonly Permission[];
    /** A "Selected pages" member's pages; null when the role decides. */
    pagePermissions: AdminPage[] | null;
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  phone?: string | undefined;
  locale?: string | undefined;
}

/**
 * Registers a new account.
 *
 * `role` is never taken from the input — it always defaults to "customer".
 * The legacy app let the browser write `profiles.role` directly, which meant
 * privilege escalation depended entirely on how one RLS policy was written.
 */
export async function register(
  input: RegisterInput,
  context: SessionContext,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      phone: input.phone?.trim() ?? null,
      locale: input.locale ?? "de",
      role: "customer",
    })
    .returning();

  if (!created) {
    throw AppError.internal("Account could not be created.");
  }

  logger.info({ userId: created.id }, "Account registered");

  return issueSession(created, context);
}

/**
 * Authenticates with email and password.
 *
 * Always performs a password verification, even when no user matched, so the
 * response time does not reveal whether an address is registered.
 */
export async function login(
  emailInput: string,
  password: string,
  context: SessionContext,
): Promise<AuthResult> {
  const email = normalizeEmail(emailInput);

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    // Burn comparable CPU against a dummy hash to keep timing flat.
    await verifyPassword(DUMMY_HASH, password);
    throw AppError.invalidCredentials();
  }

  const passwordMatches = await verifyPassword(user.passwordHash, password);

  if (!passwordMatches) {
    throw AppError.invalidCredentials();
  }

  // A blocked account is a distinct, actionable state — unlike wrong
  // credentials, telling the user is helpful and leaks nothing they cannot
  // already determine by having valid credentials.
  if (user.status === "blocked") {
    throw new AppError("ACCOUNT_BLOCKED", 403, "This account has been blocked.");
  }

  // Transparently upgrade hashes made under weaker parameters.
  if (needsRehash(user.passwordHash)) {
    const upgraded = await hashPassword(password);
    await db.update(users).set({ passwordHash: upgraded }).where(eq(users.id, user.id));
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return issueSession(user, context);
}

/**
 * Exchanges a refresh token for a new pair, rotating the old one.
 *
 * Reuse detection: presenting a token that was already rotated means it was
 * captured, because the legitimate client would have moved on to the
 * replacement. In that case every session for the user is revoked.
 */
export async function refresh(token: string, context: SessionContext): Promise<AuthResult> {
  const tokenHash = hashToken(token);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored) {
    throw AppError.unauthenticated("Refresh token is not recognised.");
  }

  // Two requests from one page can race to refresh with the same cookie (a
  // reload, or React rebuilding the page after a hydration mismatch). The
  // first rotates the token; the second then presents the one just replaced.
  // That is an overlap, not a theft: within a few seconds of a *rotation*
  // (a successor exists), from the same browser, it gets a session of its own
  // instead of every session being revoked. Anything else still is reuse.
  if (stored.revokedAt !== null && (await isRotationOverlap(stored, context))) {
    const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
    if (!user || user.status === "blocked" || stored.expiresAt.getTime() <= Date.now()) {
      throw AppError.unauthenticated("Session has expired. Please sign in again.");
    }
    logger.info({ userId: stored.userId, tokenId: stored.id }, "Concurrent refresh within the rotation grace period");
    return issueSession(user, context, { rotatedFromId: stored.id });
  }

  if (stored.revokedAt !== null) {
    logger.error(
      { userId: stored.userId, tokenId: stored.id },
      "Refresh token reuse detected — revoking every session for this user",
    );

    await revokeAllSessions(stored.userId);
    throw AppError.unauthenticated("Session was revoked. Please sign in again.");
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthenticated("Session has expired. Please sign in again.");
  }

  const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);

  if (!user || user.status === "blocked") {
    throw AppError.unauthenticated("Account is no longer active.");
  }

  // Rotate inside a transaction so a crash cannot leave two live tokens.
  return db.transaction(async (tx) => {
    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));

    return issueSession(user, context, { rotatedFromId: stored.id, tx });
  });
}

/** How long after a rotation the replaced token is still taken as an overlap. */
const ROTATION_GRACE_MS = 30_000;

async function isRotationOverlap(
  stored: typeof refreshTokens.$inferSelect,
  context: SessionContext,
): Promise<boolean> {
  if (!stored.revokedAt || Date.now() - stored.revokedAt.getTime() > ROTATION_GRACE_MS) return false;
  if ((stored.userAgent ?? "") !== (context.userAgent ?? "")) return false;
  const [successor] = await db
    .select({ id: refreshTokens.id, revokedAt: refreshTokens.revokedAt })
    .from(refreshTokens)
    .where(eq(refreshTokens.rotatedFromId, stored.id))
    .limit(1);
  if (!successor) return false;
  if (successor.revokedAt === null) return true;
  // Revoked, but only fine if that too was a rotation. A successor revoked with
  // no successor of its own was ended on purpose (sign-out, password change,
  // blocked account), and must not be reopened by the grace period.
  const [next] = await db
    .select({ id: refreshTokens.id })
    .from(refreshTokens)
    .where(eq(refreshTokens.rotatedFromId, successor.id))
    .limit(1);
  return Boolean(next);
}

/** Signs out a single device by revoking the presented refresh token. */
export async function logout(token: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, hashToken(token)), isNull(refreshTokens.revokedAt)));
}

/**
 * Ends every session a user has, everywhere.
 *
 * Revoking the refresh rows stops further access tokens being minted, which is
 * the whole story for HTTP: the next request re-reads the account and is
 * refused. It is not the whole story for a socket, which was authorised once at
 * handshake and then simply stayed open — so blocking someone left the tab in
 * front of them receiving the staff feed. The connections are closed here too;
 * a client that is still entitled to one reconnects and is re-authorised.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));

  disconnectUserSockets(userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw AppError.invalidCredentials();
  }

  const passwordHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));

    // Changing a password must end every other session, or a thief who
    // already has one keeps their access.
    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  });
}

/** Housekeeping: drop rows that are expired or long revoked. */
export async function pruneExpiredTokens(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000);

  const deleted = await db
    .delete(refreshTokens)
    .where(or(lt(refreshTokens.expiresAt, new Date()), lt(refreshTokens.revokedAt, cutoff)))
    .returning({ id: refreshTokens.id });

  return deleted.length;
}

/** Lists a user's live sessions, so they can see and revoke their devices. */
export async function listSessions(userId: string) {
  return db
    .select({
      id: refreshTokens.id,
      userAgent: refreshTokens.userAgent,
      ipAddress: refreshTokens.ipAddress,
      createdAt: refreshTokens.createdAt,
      expiresAt: refreshTokens.expiresAt,
    })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    );
}

// ── internals ───────────────────────────────────────────────────────────

type UserRow = typeof users.$inferSelect;

async function issueSession(
  user: UserRow,
  context: SessionContext,
  options?: { rotatedFromId?: string; tx?: Parameters<Parameters<typeof db.transaction>[0]>[0] },
): Promise<AuthResult> {
  const executor = options?.tx ?? db;
  const { token, tokenHash } = generateRefreshToken();

  const [session] = await executor
    .insert(refreshTokens)
    .values({
      userId: user.id,
      tokenHash,
      expiresAt: refreshTokenExpiry(),
      userAgent: context.userAgent ?? null,
      ipAddress: context.ipAddress ?? null,
      rotatedFromId: options?.rotatedFromId ?? null,
    })
    .returning({ id: refreshTokens.id });

  if (!session) {
    throw AppError.internal("Session could not be created.");
  }

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    sid: session.id,
  });

  const pagePermissions = pagesFor(user.role, user.pagePermissions);

  return {
    accessToken,
    refreshToken: token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      locale: user.locale,
      permissions: effectivePermissions(user.role, pagePermissions),
      pagePermissions,
    },
  };
}

/**
 * Issues a session for a user whose identity has already been established by
 * something other than a password.
 *
 * Used by the one-time-code login. It exists so that `issueSession` — which
 * decides what a session is, how the refresh row is written and what the access
 * token claims — stays the single implementation. A second login path that
 * minted its own tokens would be a second place for the session contract to
 * drift, and the one that drifts is the one written later.
 *
 * The status check is repeated here rather than trusted from the caller: this
 * is a function that hands out sessions, and every such function should confirm
 * for itself that the account is allowed to have one.
 */
export async function issueSessionForVerifiedUser(
  userId: string,
  context: SessionContext,
): Promise<AuthResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) throw AppError.unauthenticated();

  if (user.status === "blocked") {
    throw new AppError("ACCOUNT_BLOCKED", 403, "This account has been blocked.");
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return issueSession(user, context);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A real Argon2 hash of a throwaway value, used to equalise login timing when
 * no account matches. Must be a genuine hash — verifying against a malformed
 * string returns early and defeats the purpose.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$J2Vw8VuKXnJ0WgF1uZ8zVYQnLQ0xX3vN5rK8mP2tD4s";

/**
 * The signed-in user's profile.
 *
 * Returns only what a client legitimately needs to render itself — never the
 * password hash, and never the internal status field beyond what the session
 * already implies.
 */
export async function getProfile(userId: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      locale: users.locale,
      pagePermissions: users.pagePermissions,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, "active")))
    .limit(1);

  if (!row) return null;

  // What the screens may offer, from the same resolution the API enforces
  // with, so the dashboard hides exactly what would be refused.
  const pagePermissions = pagesFor(row.role, row.pagePermissions);

  return {
    ...row,
    pagePermissions,
    permissions: effectivePermissions(row.role, pagePermissions),
  };
}
