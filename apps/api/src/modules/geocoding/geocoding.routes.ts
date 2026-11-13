import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../middleware/error-handler.js";
import { geocodingRateLimit } from "../../middleware/rate-limit.js";
import { validate, validatedQuery } from "../../middleware/validate.js";
import { reverseAddress, searchAddresses } from "./geocoding.service.js";

/**
 * Address lookup for the booking planner.
 *
 * The planner's design searches as the customer types and lets them drop a pin
 * on a map. Its prototype called Nominatim from every browser, which is exactly
 * what the geocoding service was written to stop; these two routes give the
 * planner the same answers through the one identified, cached and rate-limited
 * caller.
 *
 * Open to anonymous visitors, like the quote itself — an address is asked for
 * long before anyone has an account.
 */
export const geocodingRouter: Router = Router();

const searchQuery = z.object({
  q: z.string().trim().min(3).max(200),
});

const reverseQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

geocodingRouter.get(
  "/search",
  geocodingRateLimit,
  validate({ query: searchQuery }),
  asyncHandler(async (req, res) => {
    const { q } = validatedQuery<z.infer<typeof searchQuery>>(req);
    res.json({ results: await searchAddresses(q) });
  }),
);

geocodingRouter.get(
  "/reverse",
  geocodingRateLimit,
  validate({ query: reverseQuery }),
  asyncHandler(async (req, res) => {
    const { lat, lng } = validatedQuery<z.infer<typeof reverseQuery>>(req);
    res.json({ result: await reverseAddress(lat, lng) });
  }),
);
