import { schema } from "@mon/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { registerPublisher } from "../config/publish-registry.js";
import { HOLIDAY_DATES_KEY, invalidateRateCardCache, parseHolidayDates } from "../quotes/quotes.service.js";

const { priceSettings, siteSettings } = schema;

/** The draft ref the Pricing screen uses for the holiday surcharge's days. */
export const HOLIDAY_DATES_REF = "holidayDates";

/**
 * Rates are drafted in the dashboard and reach the pricing engine on
 * "Save & publish". Draft ref = the rate key, value = a decimal string; or
 * `holidayDates`, value = the list of days the holiday surcharge applies to.
 * New bookings use the new rates; existing orders keep their price.
 */
registerPublisher("pricing", {
  permission: "pricing.write",
  schema: z.union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Expected a decimal amount."),
    z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(200),
  ]),
  apply: async (tx, rows, actor) => {
    for (const row of rows) {
      if (row.ref === HOLIDAY_DATES_REF) {
        const value = parseHolidayDates(Array.isArray(row.value) ? row.value.join(",") : String(row.value)).join(",");
        await tx
          .insert(siteSettings)
          .values({ key: HOLIDAY_DATES_KEY, value, group: "pricing", kind: "text", label: "Public holiday dates", updatedBy: actor.id })
          .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date(), updatedBy: actor.id } });
        continue;
      }

      // Defence in depth: a rate is drafted as a decimal string, but anything
      // that reduces it to a number on the way back must not silently drop the
      // edit — the dashboard would report a published price that never moved.
      const amount = typeof row.value === "string" ? row.value : typeof row.value === "number" ? String(row.value) : null;
      if (amount === null) throw AppError.unprocessable(`The rate ${row.ref} was drafted as something other than an amount.`);

      await tx
        .update(priceSettings)
        .set({ value: amount, updatedAt: new Date(), updatedBy: actor.id })
        .where(eq(priceSettings.key, row.ref));
    }
  },
  afterPublish: invalidateRateCardCache,
});
