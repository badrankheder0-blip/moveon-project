import { Router, type Request } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { hasPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { eventsFor } from "./orders.state-machine.js";
import { feedRoom, publishToMany } from "../../realtime/gateway.js";
import { sendOrderStageMail, sendQuoteMail, stageForStatus } from "./order-mail.js";
import * as ordersAdmin from "./orders.admin.js";
import * as ordersService from "./orders.service.js";
import {
  calendarQuerySchema,
  changeStatusSchema,
  createOrderSchema,
  dateChangeSchema,
  decideDateChangeSchema,
  listOrdersSchema,
  updateOrderSchema,
} from "./orders.schema.js";

export const ordersRouter: Router = Router();

// Every order route requires a verified identity. There is no client-side
// guard anywhere in this stack.
ordersRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });
const requestParam = z.object({ id: z.string().uuid(), requestId: z.string().uuid() });

const contextOf = (req: Request) => ({
  actor: { id: req.user!.id, email: req.user!.email },
  ipAddress: req.ip,
  requestId: req.requestId,
});

/** Book a quote. The price comes from the stored quote, never the request. */
ordersRouter.post(
  "/",
  validate({ body: createOrderSchema }),
  asyncHandler(async (req, res) => {
    const order = await ordersService.createOrder(req.body, req.user!.id, {
      actor: { id: req.user!.id, email: req.user!.email },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    // Emitted only once the transaction above has committed, so the admin
    // board never shows an order the database rolled back.
    await publishToMany(
      [feedRoom("orders.read"), `user:${req.user!.id}`],
      "order.created",
      { id: order.id, reference: order.reference, status: order.status },
    );

    // "We've received your request" — the row is `quoted`, but to the customer
    // they have just submitted something and are waiting on us. Awaited so a
    // failure is logged against this request rather than becoming an unhandled
    // rejection, and non-fatal: the booking is already saved.
    await sendOrderStageMail(order, "submitted");

    res.status(201).json(order);
  }),
);

/**
 * Customers see only their own orders; staff holding `orders.read` see all.
 *
 * No route-level guard: a customer is entitled to this route, just to a
 * narrower result. The filter is forced server-side rather than read from a
 * query param, so widening it is not something a client can ask for.
 */
ordersRouter.get(
  "/",
  validate({ query: listOrdersSchema }),
  asyncHandler(async (req, res) => {
    const seesEveryOrder = await hasPermission(req.user!.id, "orders.read");
    const query = validatedQuery<z.infer<typeof listOrdersSchema>>(req);

    const result = await ordersService.listOrders({
      ...query,
      userId: seesEveryOrder ? undefined : req.user!.id,
      staff: seesEveryOrder,
    });

    res.json(result);
  }),
);

/**
 * The calendar: every job with a day in the range. Registered before `/:id`
 * so "calendar" is never read as an order id.
 */
ordersRouter.get(
  "/calendar",
  requirePermission("orders.read"),
  validate({ query: calendarQuerySchema }),
  asyncHandler(async (req, res) => {
    const { from, to } = validatedQuery<z.infer<typeof calendarQuerySchema>>(req);
    res.json(await ordersAdmin.calendarJobs(from, to));
  }),
);

/** The live map: open jobs, their crew, vehicle and cargo. */
ordersRouter.get(
  "/dispatch",
  requirePermission("orders.read"),
  asyncHandler(async (_req, res) => {
    res.json(await ordersAdmin.dispatchBoard());
  }),
);

/** The teams and vehicles an order can be assigned to. */
ordersRouter.get(
  "/assignable",
  requirePermission("orders.read"),
  asyncHandler(async (_req, res) => {
    res.json(await ordersAdmin.fleetOptions());
  }),
);

/**
 * Readable by the customer who placed it, and by staff holding `orders.read`.
 *
 * Ownership is checked first and on its own terms: the permission only widens
 * who else may read, it never stands in for the owner check.
 */
ordersRouter.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const order = await ordersService.getOrderById(validatedParams<{ id: string }>(req).id);
    const staff = await hasPermission(req.user!.id, "orders.read");

    if (order.userId !== req.user!.id && !staff) {
      // 404 rather than 403: confirming an order exists but is not yours leaks
      // its existence to anyone probing ids.
      throw AppError.notFound("Order");
    }

    res.json(await ordersAdmin.orderDetail(order, staff));
  }),
);

/**
 * The office's edits: crew and vehicle, internal notes, booking answers and
 * price lines. Each part asks for its own capability, so a role that may
 * dispatch crews but not reprice cannot do the second through this route.
 */
ordersRouter.patch(
  "/:id",
  validate({ params: idParam, body: updateOrderSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateOrderSchema>;
    const userId = req.user!.id;

    if ((body.teamId !== undefined || body.vehicleId !== undefined) && !(await hasPermission(userId, "orders.assign"))) {
      throw AppError.insufficientRole("orders.assign");
    }
    if (
      (body.internalNotes !== undefined || body.answers !== undefined || body.lines !== undefined) &&
      !(await hasPermission(userId, "orders.write"))
    ) {
      throw AppError.insufficientRole("orders.write");
    }

    const result = await ordersAdmin.updateOrder(validatedParams<{ id: string }>(req).id, body, contextOf(req));

    // A moved date frees one day and fills another.
    if (result.dateMoved) {
      await publishToMany([feedRoom("orders.read"), `order:${result.order.id}`], "availability.changed", {
        id: result.order.id,
        reference: result.order.reference,
        status: result.order.status,
      });
    }

    res.json(await ordersAdmin.orderDetail(result.order, true));
  }),
);

/**
 * Emails the customer the order's current price. The lines are saved first
 * through PATCH; this only sends, and records when it did.
 */
ordersRouter.post(
  "/:id/send-quote",
  requirePermission("orders.write"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const order = await ordersService.getOrderById(validatedParams<{ id: string }>(req).id);

    if (order.status === "cancelled" || order.status === "completed") {
      throw AppError.conflict("INVALID_STATE_TRANSITION", `An order that is ${order.status} cannot be quoted again.`);
    }
    if ((order.priceBreakdown?.lines ?? []).length === 0) {
      throw AppError.unprocessable("Add at least one price line before sending the quote.");
    }

    const sent = await sendQuoteMail(order);
    if (!sent) {
      throw new AppError("SERVICE_UNAVAILABLE", 503, "The quote email could not be sent. Try again in a moment.");
    }

    await ordersAdmin.markQuoteSent(order, contextOf(req));
    res.json(await ordersAdmin.orderDetail(order, true));
  }),
);

/**
 * A customer asks to move their own booking; staff may file one for them.
 * The office approves or declines it on the order page.
 */
ordersRouter.post(
  "/:id/date-change",
  validate({ params: idParam, body: dateChangeSchema }),
  asyncHandler(async (req, res) => {
    const order = await ordersService.getOrderById(validatedParams<{ id: string }>(req).id);

    if (order.userId !== req.user!.id && !(await hasPermission(req.user!.id, "orders.write"))) {
      throw AppError.notFound("Order");
    }

    const request = await ordersAdmin.requestDateChange(order, req.body, contextOf(req));
    res.status(201).json(request);
  }),
);

for (const decision of ["approve", "decline"] as const) {
  ordersRouter.post(
    `/:id/date-change/:requestId/${decision}`,
    requirePermission("orders.write"),
    validate({ params: requestParam, body: decideDateChangeSchema }),
    asyncHandler(async (req, res) => {
      const { id, requestId } = validatedParams<z.infer<typeof requestParam>>(req);
      const order = await ordersAdmin.decideDateChange(
        id,
        requestId,
        decision === "approve",
        (req.body as z.infer<typeof decideDateChangeSchema>).note,
        contextOf(req),
      );

      if (decision === "approve") {
        await publishToMany([feedRoom("orders.read"), `user:${order.userId}`, `order:${order.id}`], "availability.changed", {
          id: order.id,
          reference: order.reference,
          status: order.status,
        });
      }

      res.json(await ordersAdmin.orderDetail(order, true));
    }),
  );
}

/** Status changes are staff-only and pass through the state machine. */
ordersRouter.patch(
  "/:id/status",
  requirePermission("orders.write"),
  validate({ params: idParam, body: changeStatusSchema }),
  asyncHandler(async (req, res) => {
    // Cancelling is a separate capability, and this route can reach it through
    // the status body. Checked here so a role that may edit an order but not
    // call it off cannot do so by choosing "cancelled" from the dropdown.
    if (req.body.status === "cancelled" && !(await hasPermission(req.user!.id, "orders.cancel"))) {
      throw AppError.insufficientRole("orders.cancel");
    }

    const order = await ordersService.changeStatus(validatedParams<{ id: string }>(req).id, req.body.status, {
      actor: { id: req.user!.id, email: req.user!.email },
      reason: req.body.reason,
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    for (const event of eventsFor(order.status)) {
      await publishToMany(
        [feedRoom("orders.read"), `user:${order.userId}`, `order:${order.id}`],
        event,
        { id: order.id, reference: order.reference, status: order.status },
      );
    }

    await sendOrderStageMail(order, stageForStatus(order.status));

    res.json(order);
  }),
);

/**
 * A customer may cancel their own order; the fee is computed server-side.
 * Staff holding `orders.cancel` may cancel on anyone's behalf.
 */
ordersRouter.post(
  "/:id/cancel",
  validate({ params: idParam, body: z.object({ reason: z.string().trim().max(500).optional() }) }),
  asyncHandler(async (req, res) => {
    const existing = await ordersService.getOrderById(validatedParams<{ id: string }>(req).id);

    if (
      existing.userId !== req.user!.id &&
      !(await hasPermission(req.user!.id, "orders.cancel"))
    ) {
      throw AppError.notFound("Order");
    }

    const order = await ordersService.changeStatus(validatedParams<{ id: string }>(req).id, "cancelled", {
      actor: { id: req.user!.id, email: req.user!.email },
      reason: req.body.reason,
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    for (const event of eventsFor(order.status)) {
      await publishToMany(
        [feedRoom("orders.read"), `user:${order.userId}`, `order:${order.id}`],
        event,
        { id: order.id, reference: order.reference, status: order.status },
      );
    }

    await sendOrderStageMail(order, stageForStatus(order.status));

    res.json(order);
  }),
);
