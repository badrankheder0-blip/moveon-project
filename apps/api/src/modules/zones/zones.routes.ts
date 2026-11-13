import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireAnyPermission } from "../../middleware/require-permission.js";
import { validate, validatedQuery } from "../../middleware/validate.js";
import { listZones, matchZone, zoneDto } from "./zones.service.js";
import "./zones.publisher.js";

/**
 * Service zones: polygons, postcode prefixes and travel surcharges.
 *
 * Edited as drafts (domain "zones", see zones.publisher.ts); these routes
 * read the published zones only.
 */
export const zonesRouter: Router = Router();

const matchQuery = z
  .object({
    postcode: z.string().trim().max(10).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((query) => Boolean(query.postcode) || (query.lat !== undefined && query.lng !== undefined), {
    message: "Send a postcode, or lat and lng.",
  });

/**
 * Public: the zone an address belongs to, for the website's postcode check
 * and the booking planner. `zone` is null outside every active zone; its
 * `surcharge` (euros, as a decimal string) is the travel line to add.
 */
zonesRouter.get(
  "/match",
  validate({ query: matchQuery }),
  asyncHandler(async (req, res) => {
    const { postcode, lat, lng } = validatedQuery<z.infer<typeof matchQuery>>(req);
    const zone = await matchZone(postcode, lat !== undefined && lng !== undefined ? [lat, lng] : undefined);
    res.json({
      zone: zone ? { id: zone.id, name: zone.name, colour: zone.colour, surcharge: zone.surcharge } : null,
    });
  }),
);

/** Staff: every published zone. The live map draws them too. */
zonesRouter.get(
  "/",
  requireAuth,
  requireAnyPermission("settings.write", "orders.read"),
  asyncHandler(async (_req, res) => {
    const zones = await listZones();
    res.json({ zones: zones.map(zoneDto) });
  }),
);
