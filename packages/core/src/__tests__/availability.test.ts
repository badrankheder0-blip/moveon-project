import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { capacityFor, classifyDay, type AvailabilityRules, type AvailabilitySnapshot } from "../availability.js";
import { toCalendarDate, type CalendarDate } from "../calendar-date.js";
import { publicHolidaysBetween } from "../holidays.js";

/**
 * The admin calendar's two additions to the rules: a day can carry its own
 * limit in place of the default, and NRW holidays close a day in any year
 * without anything having been seeded for it.
 */

const rules: AvailabilityRules = {
  maxCapacityPerDay: 2,
  closedWeekday: 0,
  bookingHorizonDays: 180,
  minLeadTimeHours: 48,
  timeZone: "Europe/Berlin",
};

const day = (iso: string): CalendarDate => toCalendarDate(iso);

function snapshot(parts: Partial<AvailabilitySnapshot> = {}): AvailabilitySnapshot {
  return { bookedCapacity: new Map(), blockedDays: new Map(), ...parts };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-19T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a day's own limit", () => {
  const wednesday = day("2026-11-25");

  it("uses the default without one", () => {
    expect(capacityFor(wednesday, rules, snapshot())).toBe(2);
    expect(classifyDay(wednesday, rules, snapshot())).toMatchObject({ status: "free", remainingCapacity: 2 });
  });

  it("takes more bookings when raised", () => {
    const snap = snapshot({ bookedCapacity: new Map([[wednesday, 3]]), capacityOverrides: new Map([[wednesday, 5]]) });
    expect(classifyDay(wednesday, rules, snap)).toMatchObject({ status: "free", remainingCapacity: 2 });
  });

  it("is full at zero without being blocked", () => {
    const snap = snapshot({ capacityOverrides: new Map([[wednesday, 0]]) });
    expect(classifyDay(wednesday, rules, snap).status).toBe("full");
  });
});

describe("closed days", () => {
  it("closes every Sunday", () => {
    expect(classifyDay(day("2026-11-29"), rules, snapshot()).status).toBe("closed");
  });

  it("reports a day blocked by the office with its reason", () => {
    const friday = day("2026-11-27");
    const snap = snapshot({ blockedDays: new Map([[friday, { reason: "Betriebsurlaub", isPublicHoliday: false }]]) });
    expect(classifyDay(friday, rules, snap)).toMatchObject({ status: "blocked", reason: "Betriebsurlaub" });
  });
});

describe("holidays between two days", () => {
  it("finds them across a year boundary", () => {
    const found = publicHolidaysBetween(day("2026-12-20"), day("2027-01-05"));
    expect([...found.keys()]).toEqual(["2026-12-25", "2026-12-26", "2027-01-01"]);
    expect(found.get(day("2026-12-25"))?.name).toBe("1. Weihnachtstag");
  });

  it("finds the NRW state holidays", () => {
    const found = publicHolidaysBetween(day("2026-11-01"), day("2026-11-30"));
    expect(found.get(day("2026-11-01"))?.key).toBe("all_saints");
  });

  it("is empty for a range without one", () => {
    expect(publicHolidaysBetween(day("2026-11-02"), day("2026-11-30")).size).toBe(0);
  });
});
