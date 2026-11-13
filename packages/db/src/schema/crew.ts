import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * The crews and the fleet: what an order is assigned to.
 *
 * The admin prototype keeps both in Settings (teams, vehicles) and the people
 * under Employees; assigning a team and a vehicle to an order is what puts
 * the job on the calendar, the crew page and the team workload.
 */

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** The area the team usually covers ("Köln"), shown beside its name. */
  area: text("area"),
  colour: text("colour").notNull().default("#d71635"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    plate: text("plate"),
    /** Load volume in m³. */
    capacityM3: numeric("capacity_m3", { precision: 6, scale: 1 }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("vehicles_capacity_positive", sql`${table.capacityM3} is null or ${table.capacityM3} > 0`)],
);

/**
 * The people on the crews. Not `users`: a mover signs in to the crew page
 * with a PIN, not to the website, and has no customer account.
 */
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    /** "team_lead" | "driver" | "mover" | "cleaner" */
    role: text("role").notNull().default("mover"),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    phone: text("phone"),
    email: text("email"),
    /** Driving licence classes, e.g. "B, C1". Empty when the person does not drive. */
    licence: text("licence"),
    /** "available" | "holiday" | "sick" */
    status: text("status").notNull().default("available"),
    /** Weekdays worked, 0 = Sunday. */
    workDays: jsonb("work_days").$type<number[]>().notNull().default([1, 2, 3, 4, 5]),
    hoursWeek: numeric("hours_week", { precision: 5, scale: 1 }).notNull().default("0"),
    /** argon2 hash of the crew-page PIN; the PIN itself is shown once. */
    pinHash: text("pin_hash"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("employees_team_idx").on(table.teamId)],
);
