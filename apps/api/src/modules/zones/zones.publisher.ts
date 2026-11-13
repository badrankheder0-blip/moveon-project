import { schema } from "@mon/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "../audit/audit.service.js";
import { registerPublisher } from "../config/publish-registry.js";
import { ZONE_ENTITY } from "./zones.service.js";

const { serviceZones } = schema;

/**
 * Zones are drafted whole. Draft ref = the zone's id, or "new:<uuid>" for a
 * zone drawn since the last publish (the uuid becomes its id, so the
 * dashboard can keep editing it before and after publishing); value = the
 * zone, or `{ deleted: true }`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corner = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);

export const zoneValue = z.object({
  name: z.string().trim().min(1).max(80),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  polygon: z.array(corner).max(200),
  postcodePrefixes: z.array(z.string().regex(/^\d{1,5}$/)).max(60),
  surcharge: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/, "Expected a decimal amount."),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
});

const zoneDraft = z.union([z.object({ deleted: z.literal(true) }), zoneValue]);

export function zoneIdOf(ref: string): string | null {
  const id = ref.startsWith("new:") ? ref.slice(4) : ref;
  return UUID.test(id) ? id.toLowerCase() : null;
}

registerPublisher("zones", {
  permission: "settings.write",
  schema: zoneDraft,
  apply: async (tx, rows, actor) => {
    for (const row of rows) {
      const id = zoneIdOf(row.ref);
      if (!id) continue;
      const parsed = zoneDraft.parse(row.value);

      if ("deleted" in parsed) {
        const removed = await tx.delete(serviceZones).where(eq(serviceZones.id, id)).returning({ name: serviceZones.name });
        if (removed.length) await recordAudit({ actor, action: "zone.deleted", entityType: ZONE_ENTITY, entityId: id, changes: { name: removed[0]!.name } }, tx);
        continue;
      }

      const values = {
        name: parsed.name,
        colour: parsed.colour.toLowerCase(),
        polygon: parsed.polygon as [number, number][],
        postcodePrefixes: [...new Set(parsed.postcodePrefixes)],
        surcharge: parsed.surcharge,
        isActive: parsed.isActive,
        sortOrder: parsed.sortOrder,
        updatedAt: new Date(),
      };

      await tx
        .insert(serviceZones)
        .values({ id, ...values })
        .onConflictDoUpdate({ target: serviceZones.id, set: values });

      await recordAudit(
        {
          actor,
          action: "zone.published",
          entityType: ZONE_ENTITY,
          entityId: id,
          changes: { name: values.name, surcharge: values.surcharge, postcodes: values.postcodePrefixes, isActive: values.isActive, corners: values.polygon.length },
        },
        tx,
      );
    }
  },
});
