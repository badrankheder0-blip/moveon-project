import type { Permission } from "@mon/core";
import type { db } from "@mon/db";
import type { ZodType } from "zod";

/**
 * Who publishes what.
 *
 * Configuration — prices, content, settings, services, zones, discounts,
 * review moderation, message templates — is edited as a draft in
 * `config_drafts` and changes the website only when someone presses
 * "Save & publish". Each module that owns such a domain registers here how a
 * draft row is validated, who may write it, and how publishing applies it to
 * the module's own table. The config routes do the rest for every domain
 * alike.
 */

/** The transaction a publish runs in. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface DraftRow {
  ref: string;
  value: unknown;
}

export interface Publisher {
  /** The capability that may edit and publish this domain. */
  permission: Permission;
  /** Checks one draft value before it is stored. */
  schema: ZodType<unknown>;
  /** Writes the drafts to the live table, inside the publish transaction. */
  apply: (tx: Tx, rows: DraftRow[], actor: { id: string; email: string }) => Promise<void>;
  /** Runs after the transaction commits: clearing caches and the like. */
  afterPublish?: () => Promise<void>;
}

const publishers = new Map<string, Publisher>();

export function registerPublisher(domain: string, publisher: Publisher): void {
  publishers.set(domain, publisher);
}

export function publisherFor(domain: string): Publisher | undefined {
  return publishers.get(domain);
}

export function allPublishers(): [string, Publisher][] {
  return [...publishers.entries()];
}
