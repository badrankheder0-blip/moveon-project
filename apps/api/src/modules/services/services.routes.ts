import { Router } from "express";

import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireAnyPermission } from "../../middleware/require-permission.js";
import { loadCommonFlow } from "./common-flow.js";
import { isPublic, listServices, publicService, staffService } from "./services.service.js";
import "./services.publisher.js";

/**
 * The service catalogue and what the booking flow asks for each service.
 *
 * Edits are drafts (domain "services", see services.publisher.ts); these
 * routes only ever read the published rows, so nothing the office is still
 * working on reaches a visitor.
 */
export const servicesRouter: Router = Router();

/**
 * Public: the services the website and the booking planner offer, in order.
 *
 * A hidden service is simply absent. Each carries its booking-flow overrides
 * (`flow`): per step, the wording, the built-in answers the office marked as
 * required, and any questions it added.
 *
 * `common` is the same for the steps every customer sees (Dashboard →
 * Booking site → Common steps): field labels, Required and Shown, and the
 * questions added there (see common-flow.ts).
 */
servicesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows, common] = await Promise.all([listServices(), loadCommonFlow()]);
    res.json({ services: rows.filter(isPublic).map(publicService), common });
  }),
);

/**
 * Staff: every service, hidden ones included. The order screens read it too,
 * to label the answers given to a custom question.
 */
servicesRouter.get(
  "/all",
  requireAuth,
  requireAnyPermission("catalog.write", "orders.read"),
  asyncHandler(async (_req, res) => {
    const [rows, common] = await Promise.all([listServices(), loadCommonFlow()]);
    res.json({ services: rows.map(staffService), common });
  }),
);
