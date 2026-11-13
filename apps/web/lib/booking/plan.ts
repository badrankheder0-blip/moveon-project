import type { QuoteInput } from "@mon/core";

import {
  answerProblem,
  commonHidden,
  commonQuestions,
  fieldRequired,
  stepQuestions,
  type BookingCatalog,
  type CommonFlow,
} from "./catalog";

/**
 * The booking planner's state.
 *
 * The planner replaces the ten-step calculator with the flow the designer
 * built as a prototype: one plan that can hold a move, a renovation, a
 * cleaning and a junk removal at once, each at its own address and on its own
 * day, with the home listed room by room.
 *
 * The prototype priced everything in the browser from demo rates. That is the
 * one part not carried over. Here the plan is only answers; every price comes
 * from `POST /api/quotes`, one quote per job the pricing engine can price (a
 * move, a cleaning by floor area). What the engine cannot price — a renovation,
 * counted junk removal, special glass, a business visit — goes to the team as a
 * request, exactly as the prototype's own copy promises ("Price after the site
 * visit", "Collection quote confirmed by the team").
 *
 * As in the calculator, the answers live in one object, every change goes
 * through one reducer, and each step declares when it applies and what it
 * still needs. Validation returns translation keys, never sentences.
 */

// ── Vocabulary ──────────────────────────────────────────────────────────

export const SERVICE_KEYS = ["moving", "renovation", "cleaning", "disposal"] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

/** The services that are configured per location. Moving is always A → B. */
export const LOCATED_SERVICES = ["renovation", "cleaning", "disposal"] as const;
export type LocatedService = (typeof LOCATED_SERVICES)[number];

export type CustomerType = "private" | "business";

/** Basement is −1; 10 means "10th floor or higher", as the prototype lists it. */
export const FLOORS = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const PARKING = [
  "driveway",
  "streetClose",
  "streetMedium",
  "lotClose",
  "lotMedium",
  "lotFar",
] as const;
export type Parking = (typeof PARKING)[number];

export const LIFT_FIT = ["all", "small", "unsure"] as const;
export type LiftFit = (typeof LIFT_FIT)[number];

/** Two-hour arrival windows, by start time. The order uses the start. */
export const WINDOWS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"] as const;

export const windowLabel = (index: number): string => {
  const start = WINDOWS[index] ?? WINDOWS[0];
  const hour = Number.parseInt(start, 10) + 2;
  return `${start}–${String(hour).padStart(2, "0")}:00`;
};

export const RENOVATION_WORK = ["painting", "flooring", "repairs"] as const;
export type RenovationWork = (typeof RENOVATION_WORK)[number];

export const CLEAN_WINDOWS = ["standard", "patio", "large", "roof"] as const;
export type CleanWindow = (typeof CLEAN_WINDOWS)[number];

export const DISPOSAL_TYPES = [
  "largeFurniture",
  "smallFurniture",
  "largeElectronics",
  "smallElectronics",
] as const;
export type DisposalType = (typeof DISPOSAL_TYPES)[number];

/**
 * A special item's code, as the catalogue spells it.
 *
 * Was a fixed six; they are catalogue rows now (kind "special"), so the set is
 * whatever the office has added and this is just the code string.
 */
export type SpecialKind = string;

/**
 * Rooms, and the catalog category whose items each one suggests first.
 *
 * The categories are the catalog's own (`catalog_items.category`), which the
 * dashboard edits. A room with no matching category still shows every item;
 * it only loses the head start.
 */
export const ROOM_TYPES = [
  { type: "living", category: "Wohnzimmer", icon: "sofa" },
  { type: "bedroom", category: "Schlafzimmer", icon: "bed" },
  { type: "kitchen", category: "Küche", icon: "kitchen" },
  { type: "dining", category: "Küche", icon: "table" },
  { type: "office", category: "Büro", icon: "desk" },
  { type: "kids", category: "Schlafzimmer", icon: "child" },
  { type: "bathroom", category: "Sonstiges", icon: "bath" },
  { type: "hallway", category: "Sonstiges", icon: "stairs" },
  { type: "balcony", category: "Sonstiges", icon: "plant" },
  { type: "cellar", category: "Sonstiges", icon: "box" },
  { type: "garage", category: "Sonstiges", icon: "garage" },
  { type: "other", category: "Sonstiges", icon: "box" },
] as const;
export type RoomType = (typeof ROOM_TYPES)[number]["type"];

/**
 * How an item travels.
 *
 * `dis` and `re` are separate because the engine prices them separately
 * (`disassemblyItems`, `assemblyItems`): a bed taken apart at the old home is
 * not necessarily rebuilt by the crew at the new one.
 */
export const PREPARATION = ["ready", "dis", "re", "both"] as const;
export type Preparation = (typeof PREPARATION)[number] | "unanswered";

export const PAY_METHODS = ["bank_transfer", "card", "paypal", "cash"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

// ── Records ─────────────────────────────────────────────────────────────

export interface PlanAddress {
  text: string;
  line1?: string;
  line2?: string;
  streetName?: string;
  houseNumber?: string;
  postcode?: string;
  city?: string;
  lat?: number;
  lng?: number;
  /** Inside North Rhine-Westphalia, as the server decided. */
  nrw: boolean;
  /**
   * Typed and kept without a lookup match. Accepted — the prototype accepts it
   * too — and the quote's own geocoding is what finally decides.
   */
  manual?: boolean;
  /**
   * Whether the address lies in one of the office's service zones
   * (`GET /api/zones/match`), checked when the office accepts addresses only
   * inside them. Absent until checked; "error" when the check itself failed,
   * which never holds a customer back.
   */
  area?: AreaCheck;
}

export type AreaCheck = "inside" | "outside" | "nopostcode" | "error";

export interface Access {
  floor: number | null;
  lift: boolean;
  fit: LiftFit | "";
  parking: Parking | "";
  notes: string;
}

export interface InventoryItem {
  id: string;
  /** A catalog item the engine can price, or null for a custom entry. */
  catalogId: string | null;
  name: string;
  count: number;
  /** Per piece. Copied from the catalog so the plan survives a refresh. */
  volumeM3: number;
  /** Whether the catalog prices taking it apart or putting it together. */
  canAssemble: boolean;
  prep: Preparation;
  notes: string;
}

export interface Room {
  id: string;
  type: RoomType;
  /** Empty means "use the type's name", so a language switch renames it too. */
  name: string;
  items: InventoryItem[];
  checked: boolean;
}

export interface SpecialItem {
  id: string;
  kind: SpecialKind;
  count: number;
  notes: string;
}

export interface Slot {
  date: string;
  window: number | null;
}

export interface RenovationDetails {
  work: RenovationWork[];
  areas: Partial<Record<RenovationWork, string>>;
}

export interface CleaningDetails {
  moveClean: boolean;
  windows: boolean;
  areaSqm: string;
  windowCounts: Record<CleanWindow, number>;
}

export interface DisposalDetails {
  counts: Record<DisposalType, number>;
  notes: string;
}

export interface JobDetailsMap {
  renovation: RenovationDetails;
  cleaning: CleaningDetails;
  disposal: DisposalDetails;
}

export interface Job<S extends LocatedService = LocatedService> {
  details: JobDetailsMap[S];
  slot: Slot;
}

export interface Plan {
  customerType: CustomerType | "";
  services: Record<ServiceKey, boolean>;

  company: string;

  /** "from" and "to" for a move, "service" otherwise, `loc-…` for the rest. */
  addresses: Record<string, PlanAddress>;
  access: Record<string, Access>;

  /** Where each located service happens, by address key. */
  locations: Record<LocatedService, string[]>;
  /** One job per service and address: `renovation:to`, `cleaning:loc-2`… */
  jobs: Record<string, Job>;

  moving: {
    method: "" | "items" | "area";
    areaSqm: string;
    rooms: Room[];
    activeRoomId: string | null;
    /** Area mode: does anything need dismantling? */
    areaAssembly: "" | "yes" | "no";
    areaAssemblyItems: InventoryItem[];
    specials: SpecialItem[];
    /** "Items not listed are charged extra on the day", ticked. */
    acceptedExtra: boolean;
    packing: boolean;
    insurance: boolean;
    parkingZone: boolean;
    crewSize: 2 | 3;
    secondVan: boolean;
    notes: string;
    slot: Slot;
  };

  /** The business customer's single site visit. */
  visit: Slot;

  /**
   * Services the office added under Dashboard → Services, by key. The team
   * prices them, so each is a request: one place, a preferred date and the
   * office's own questions.
   */
  customServices: string[];
  /** The address key each custom service happens at. */
  customLocations: Record<string, string>;
  customSlots: Record<string, Slot>;

  /** Answers to the office's questions, `extra.<step>.<question id>` → value. */
  answers: Record<string, string>;

  photoNames: string[];
  scheduleNotes: string;

  discountCode: string;

  contact: { name: string; email: string; phone: string };
  billTo: "me" | "other";
  other: { name: string; email: string; phone: string; address: string };
  payMethod: PayMethod;
  terms: boolean;
  requestConsent: boolean;
}

export const emptyAccess = (): Access => ({ floor: null, lift: false, fit: "", parking: "", notes: "" });

export const emptySlot = (): Slot => ({ date: "", window: null });

export function initialDetails<S extends LocatedService>(service: S): JobDetailsMap[S] {
  const details: JobDetailsMap = {
    renovation: { work: [], areas: {} },
    cleaning: {
      moveClean: false,
      windows: false,
      areaSqm: "",
      windowCounts: { standard: 0, patio: 0, large: 0, roof: 0 },
    },
    disposal: {
      counts: { largeFurniture: 0, smallFurniture: 0, largeElectronics: 0, smallElectronics: 0 },
      notes: "",
    },
  };

  return details[service];
}

export const INITIAL_PLAN: Plan = {
  customerType: "",
  services: { moving: false, renovation: false, cleaning: false, disposal: false },
  company: "",
  addresses: {},
  access: {},
  locations: { renovation: [], cleaning: [], disposal: [] },
  jobs: {},
  moving: {
    method: "",
    areaSqm: "",
    rooms: [],
    activeRoomId: null,
    areaAssembly: "",
    areaAssemblyItems: [],
    specials: [],
    acceptedExtra: false,
    packing: false,
    insurance: false,
    parkingZone: false,
    crewSize: 2,
    secondVan: false,
    notes: "",
    slot: emptySlot(),
  },
  visit: emptySlot(),
  customServices: [],
  customLocations: {},
  customSlots: {},
  answers: {},
  photoNames: [],
  scheduleNotes: "",
  discountCode: "",
  contact: { name: "", email: "", phone: "" },
  billTo: "me",
  other: { name: "", email: "", phone: "", address: "" },
  payMethod: "bank_transfer",
  terms: false,
  requestConsent: false,
};

// ── Reducer ─────────────────────────────────────────────────────────────

export type PlanAction =
  | { type: "patch"; patch: Partial<Plan> | ((plan: Plan) => Partial<Plan>) }
  | { type: "moving"; patch: Partial<Plan["moving"]> | ((moving: Plan["moving"]) => Partial<Plan["moving"]>) }
  | { type: "restore"; plan: Plan }
  | { type: "reset" };

export function planReducer(plan: Plan, action: PlanAction): Plan {
  switch (action.type) {
    case "patch": {
      const patch = typeof action.patch === "function" ? action.patch(plan) : action.patch;
      // Nothing to change keeps the same plan, so an effect that tidies up re-renders nothing.
      return Object.keys(patch).length === 0 ? plan : { ...plan, ...patch };
    }

    case "moving":
      return {
        ...plan,
        moving: {
          ...plan.moving,
          ...(typeof action.patch === "function" ? action.patch(plan.moving) : action.patch),
        },
      };

    case "restore":
      return action.plan;

    case "reset":
      return INITIAL_PLAN;
  }
}

/**
 * Reads a stored plan back, keeping only fields this version knows.
 *
 * Session storage outlives a deploy, so a plan saved by an older shape must
 * not be trusted to have every field; missing ones take their defaults.
 */
export function restorePlan(saved: unknown): Plan {
  if (!saved || typeof saved !== "object") return INITIAL_PLAN;

  const raw = saved as Partial<Plan>;

  return {
    ...INITIAL_PLAN,
    ...raw,
    services: { ...INITIAL_PLAN.services, ...raw.services },
    locations: { ...INITIAL_PLAN.locations, ...raw.locations },
    moving: { ...INITIAL_PLAN.moving, ...raw.moving },
    contact: { ...INITIAL_PLAN.contact, ...raw.contact },
    other: { ...INITIAL_PLAN.other, ...raw.other },
    visit: { ...INITIAL_PLAN.visit, ...raw.visit },
    customServices: Array.isArray(raw.customServices) ? raw.customServices.filter((key) => typeof key === "string") : [],
    customLocations: { ...raw.customLocations },
    customSlots: { ...raw.customSlots },
    answers: { ...raw.answers },
  };
}

export const uid = (prefix = "id"): string =>
  `${prefix}-${
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  }`;

// ── Basic questions ─────────────────────────────────────────────────────

export const isBusiness = (plan: Plan) => plan.customerType === "business";

export const selectedServices = (plan: Plan): ServiceKey[] =>
  SERVICE_KEYS.filter((key) => plan.services[key]);

export const movingSelected = (plan: Plan) => plan.services.moving && !isBusiness(plan);

/** Anything chosen at all: a built-in service or one the office added. */
export const anyServiceSelected = (plan: Plan) => selectedServices(plan).length > 0 || plan.customServices.length > 0;

/** Where a custom service happens; a private plan's custom services each name a place. */
export function customLocation(plan: Plan, key: string): string {
  return plan.customLocations[key] ?? (movingSelected(plan) ? "from" : "service");
}

/** Every address the plan actually uses, by key. */
export function usedAddressKeys(plan: Plan): string[] {
  const keys = new Set<string>();
  if (movingSelected(plan)) {
    keys.add("from");
    keys.add("to");
  }
  if (isBusiness(plan)) keys.add("service");
  else {
    for (const service of LOCATED_SERVICES) {
      if (plan.services[service]) for (const key of locationKeys(plan, service)) keys.add(key);
    }
    for (const key of plan.customServices) keys.add(customLocation(plan, key));
  }
  return [...keys];
}

/** A located address that can be planned around: typed, or matched in NRW. */
export function validAddress(address: PlanAddress | undefined): address is PlanAddress {
  return Boolean(address && address.text.trim().length >= 5 && (address.manual || address.nrw));
}

/** The address keys a located service starts at, before the customer chooses. */
function defaultLocation(plan: Plan, service: LocatedService): string {
  if (!movingSelected(plan)) return "service";
  // Renovating the new home and clearing the old one is the usual pairing.
  return service === "renovation" ? "to" : "from";
}

export function locationKeys(plan: Plan, service: LocatedService): string[] {
  const chosen = plan.locations[service];
  return chosen.length > 0 ? chosen : [defaultLocation(plan, service)];
}

export const jobId = (service: LocatedService, key: string) => `${service}:${key}`;

export interface JobRef<S extends LocatedService = LocatedService> {
  id: string;
  service: S;
  addressKey: string;
  address: PlanAddress | undefined;
  details: JobDetailsMap[S];
  slot: Slot;
}

export function jobsFor<S extends LocatedService>(plan: Plan, service: S): JobRef<S>[] {
  if (!plan.services[service] || isBusiness(plan)) return [];

  return locationKeys(plan, service).map((key) => {
    const id = jobId(service, key);
    const saved = plan.jobs[id] as Job<S> | undefined;

    return {
      id,
      service,
      addressKey: key,
      address: plan.addresses[key],
      details: saved?.details ?? initialDetails(service),
      slot: saved?.slot ?? emptySlot(),
    };
  });
}

/** Patches one job, creating it from the defaults the first time. */
export function updateJob<S extends LocatedService>(
  plan: Plan,
  id: string,
  patch: { details?: Partial<JobDetailsMap[S]>; slot?: Partial<Slot> },
): Partial<Plan> {
  const service = id.split(":")[0] as S;
  const current = (plan.jobs[id] as Job<S> | undefined) ?? {
    details: initialDetails(service),
    slot: emptySlot(),
  };

  return {
    jobs: {
      ...plan.jobs,
      [id]: {
        details: { ...current.details, ...patch.details },
        slot: { ...current.slot, ...patch.slot },
      } as Job,
    },
  };
}

/** Everything that gets a date, in the order the schedule lists it. */
export interface ScheduleTask {
  id: string;
  service: ServiceKey | "visit" | "custom";
  /** The custom service's key, for `service: "custom"`. */
  customKey?: string;
  addressKey: string;
  slot: Slot;
}

/** `custom:<key>` — a custom service's schedule task. */
export const customTaskId = (key: string) => `custom:${key}`;

export function scheduleTasks(plan: Plan): ScheduleTask[] {
  if (isBusiness(plan)) {
    return [{ id: "visit", service: "visit", addressKey: "service", slot: plan.visit }];
  }

  const tasks: ScheduleTask[] = [];

  if (plan.services.moving) {
    tasks.push({ id: "moving", service: "moving", addressKey: "from", slot: plan.moving.slot });
  }

  for (const service of LOCATED_SERVICES) {
    for (const job of jobsFor(plan, service)) {
      tasks.push({ id: job.id, service, addressKey: job.addressKey, slot: job.slot });
    }
  }

  for (const key of plan.customServices) {
    tasks.push({
      id: customTaskId(key),
      service: "custom",
      customKey: key,
      addressKey: customLocation(plan, key),
      slot: plan.customSlots[key] ?? emptySlot(),
    });
  }

  return tasks;
}

export function setSlot(plan: Plan, taskId: string, slot: Partial<Slot>): Partial<Plan> {
  if (taskId === "visit") return { visit: { ...plan.visit, ...slot } };
  if (taskId === "moving") return { moving: { ...plan.moving, slot: { ...plan.moving.slot, ...slot } } };
  if (taskId.startsWith("custom:")) {
    const key = taskId.slice("custom:".length);
    return { customSlots: { ...plan.customSlots, [key]: { ...(plan.customSlots[key] ?? emptySlot()), ...slot } } };
  }
  return updateJob(plan, taskId, { slot });
}

/** The addresses whose access matters: both ends of a move, and collections. */
export function propertyKeys(plan: Plan): string[] {
  const keys = new Set<string>();

  if (movingSelected(plan)) {
    keys.add("from");
    keys.add("to");
  }

  if (plan.services.disposal && !isBusiness(plan)) {
    for (const key of locationKeys(plan, "disposal")) keys.add(key);
  }

  return [...keys];
}

// ── Inventory arithmetic ────────────────────────────────────────────────

const round1 = (value: number) => Math.round(value * 10) / 10;

export const roomCount = (room: Room) => room.items.reduce((sum, item) => sum + item.count, 0);

export const roomVolume = (room: Room) =>
  round1(room.items.reduce((sum, item) => sum + item.count * item.volumeM3, 0));

export function inventoryCount(plan: Plan): number {
  return plan.moving.rooms.reduce((sum, room) => sum + roomCount(room), 0);
}

/** Cargo volume, for the crew and vehicle advice. Never a price input. */
export function inventoryVolume(plan: Plan): number {
  if (plan.moving.method === "area") {
    const area = Number.parseFloat(plan.moving.areaSqm);
    // The prototype's middle density: 0.3 m³ of belongings per m² of home.
    return Number.isFinite(area) && area > 0 ? round1(area * 0.3) : 0;
  }

  return round1(plan.moving.rooms.reduce((sum, room) => sum + roomVolume(room), 0));
}

/** The crew the engine can price is two or three; this says which fits. */
export const recommendedCrew = (volume: number): 2 | 3 => (volume < 12 ? 2 : 3);

/** One van carries about 19 m³ in the prototype's vehicle table. */
export const recommendsSecondVan = (volume: number) => volume > 19;

export function roomDisplayName(room: Room, typeName: (type: RoomType) => string): string {
  return room.name.trim() || typeName(room.type);
}

// ── Detail rules ────────────────────────────────────────────────────────

const decimal = (value: string | undefined) =>
  value === undefined || value.trim() === "" ? Number.NaN : Number(value.replace(",", "."));

export const windowCount = (details: CleaningDetails) =>
  CLEAN_WINDOWS.reduce((sum, key) => sum + (details.windowCounts[key] || 0), 0);

export const disposalCount = (details: DisposalDetails) =>
  DISPOSAL_TYPES.reduce((sum, key) => sum + (details.counts[key] || 0), 0);

export type Errors = Record<string, string>;

export function renovationErrors(details: RenovationDetails): Errors {
  const errors: Errors = {};

  if (details.work.length === 0) errors.work = "plan.error.renovationWork";

  for (const work of details.work) {
    const area = decimal(details.areas[work]);
    if (!(area > 0 && area <= 10000)) errors[`area.${work}`] = "plan.error.renovationArea";
  }

  return errors;
}

export function cleaningErrors(details: CleaningDetails): Errors {
  const errors: Errors = {};

  if (!details.moveClean && !details.windows) {
    errors.type = "plan.error.cleaningType";
    return errors;
  }

  const area = decimal(details.areaSqm);
  if (details.moveClean && !(area > 0 && area <= 2000)) errors.area = "plan.error.cleaningArea";
  if (details.windows && windowCount(details) < 1) errors.windows = "plan.error.cleaningWindows";

  return errors;
}

export function disposalErrors(details: DisposalDetails): Errors {
  return disposalCount(details) > 0 ? {} : { counts: "plan.error.disposalCounts" };
}

export function jobErrors(job: JobRef): Errors {
  switch (job.service) {
    case "renovation":
      return renovationErrors(job.details as RenovationDetails);
    case "cleaning":
      return cleaningErrors(job.details as CleaningDetails);
    case "disposal":
      return disposalErrors(job.details as DisposalDetails);
  }
}

// ── What gets priced, and what goes to the team ─────────────────────────

/**
 * A job the engine can price: a move, or a cleaning with a floor area or
 * windows.
 *
 * Moving by items needs at least one catalog item; custom entries ride along
 * as notes. Since pricing version 2 the engine prices windows by type, so a
 * windows-only cleaning is priced too; large glass and roof windows still go
 * to the team to confirm size and access, as in the booking prototype.
 */
export function movingPriceable(plan: Plan): boolean {
  if (!movingSelected(plan)) return false;

  if (plan.moving.method === "area") return decimal(plan.moving.areaSqm) > 0;

  return plan.moving.rooms.some((room) => room.items.some((item) => item.catalogId && item.count > 0));
}

export const cleaningPriceable = (details: CleaningDetails) =>
  (details.moveClean && decimal(details.areaSqm) > 0) ||
  (details.windows && (details.windowCounts.standard || 0) + (details.windowCounts.patio || 0) > 0);

/** Windows that need a person to look at them before a price: special glass. */
const specialGlass = (details: CleaningDetails) =>
  details.windows && (details.windowCounts.large || 0) + (details.windowCounts.roof || 0) > 0;

/**
 * Whether this plan ends in a booking or in a request.
 *
 * A business customer always gets a site visit and a tailored quote, and a
 * plan with nothing the engine prices has nothing to book — both end with
 * "Request site visit" instead of payment, as the prototype's visit-only flow
 * does.
 */
export function isRequestOnly(plan: Plan): boolean {
  if (isBusiness(plan)) return true;
  if (plan.services.moving) return false;
  if (!plan.services.cleaning) return true;
  return !jobsFor(plan, "cleaning").some((job) => cleaningPriceable(job.details));
}

export interface PricedJob {
  /** "moving" or a cleaning job id. */
  id: string;
  service: "moving" | "cleaning";
  input: QuoteInput;
}

const serverFloor = (floor: number | null) => (floor === null ? 0 : floor < 0 ? 1 : floor);

function accessFor(plan: Plan, key: string): Access {
  return plan.access[key] ?? emptyAccess();
}

function addItems(target: Record<string, number>, catalogId: string, count: number) {
  target[catalogId] = (target[catalogId] ?? 0) + count;
}

function assemblyMaps(items: InventoryItem[]) {
  const assembly: Record<string, number> = {};
  const disassembly: Record<string, number> = {};

  for (const item of items) {
    if (!item.catalogId || item.count <= 0) continue;
    if (item.prep === "dis" || item.prep === "both") addItems(disassembly, item.catalogId, item.count);
    if (item.prep === "re" || item.prep === "both") addItems(assembly, item.catalogId, item.count);
  }

  return { assembly, disassembly };
}

export function pricedJobs(plan: Plan): PricedJob[] {
  if (isBusiness(plan)) return [];

  const jobs: PricedJob[] = [];
  const discountCode = plan.discountCode.trim();

  if (movingPriceable(plan)) {
    const m = plan.moving;
    const from = accessFor(plan, "from");
    const to = accessFor(plan, "to");

    const items = m.method === "items" ? m.rooms.flatMap((room) => room.items) : m.areaAssemblyItems;
    const selectedItems: Record<string, number> = {};
    if (m.method === "items") {
      for (const item of items) if (item.catalogId && item.count > 0) addItems(selectedItems, item.catalogId, item.count);
    }

    const { assembly, disassembly } = assemblyMaps(
      m.method === "area" && m.areaAssembly !== "yes" ? [] : items,
    );

    jobs.push({
      id: "moving",
      service: "moving",
      input: {
        serviceType: "moving",
        customerType: "private",
        originAddress: plan.addresses.from?.text.trim() ?? "",
        destinationAddress: plan.addresses.to?.text.trim() ?? "",
        originFloor: serverFloor(from.floor),
        destinationFloor: serverFloor(to.floor),
        originHasElevator: from.lift,
        destinationHasElevator: to.lift,
        calculationMethod: m.method === "area" ? "area" : "items",
        ...(m.method === "area"
          ? { areaSqm: Math.max(1, Math.round(decimal(m.areaSqm))) }
          : { selectedItems }),
        extras: {
          packingService: m.packing,
          parkingZone: m.parkingZone,
          transportInsurance: m.insurance,
          ...(Object.keys(assembly).length ? { assemblyItems: assembly } : {}),
          ...(Object.keys(disassembly).length ? { disassemblyItems: disassembly } : {}),
        },
        crewSize: m.crewSize,
        secondVan: m.secondVan,
        // Special items are priced per item from the rate card.
        ...(m.specials.length
          ? {
              specialItems: m.specials.reduce<Record<string, number>>((counts, special) => {
                counts[special.kind] = (counts[special.kind] ?? 0) + Math.max(0, special.count);
                return counts;
              }, {}),
            }
          : {}),
        ...(m.slot.date ? { scheduledDate: m.slot.date } : {}),
        // A code is redeemed once per order, so it rides on one job only.
        ...(discountCode ? { discountCode } : {}),
      },
    });
  }

  for (const job of jobsFor(plan, "cleaning")) {
    if (!cleaningPriceable(job.details) || !validAddress(job.address)) continue;

    const access = accessFor(plan, job.addressKey);

    jobs.push({
      id: job.id,
      service: "cleaning",
      input: {
        serviceType: "cleaning",
        customerType: "private",
        originAddress: job.address.text.trim(),
        originFloor: serverFloor(access.floor),
        destinationFloor: 0,
        originHasElevator: access.lift,
        destinationHasElevator: false,
        calculationMethod: "area",
        ...(job.details.moveClean && decimal(job.details.areaSqm) > 0
          ? { areaSqm: Math.max(1, Math.round(decimal(job.details.areaSqm))) }
          : {}),
        ...(job.details.windows ? { windows: { ...job.details.windowCounts } } : {}),
        extras: { packingService: false, parkingZone: false, transportInsurance: false },
        crewSize: 2,
        secondVan: false,
        ...(job.slot.date ? { scheduledDate: job.slot.date } : {}),
        ...(discountCode && jobs.length === 0 ? { discountCode } : {}),
      },
    });
  }

  return jobs;
}

/** Work the team prices by hand, one line per job, for the review and the request. */
export interface PendingScope {
  id: string;
  service: ServiceKey | "visit" | "custom";
  addressKey: string;
  kind: "renovation" | "disposal" | "windows" | "specials" | "custom" | "visit" | "request";
}

export function pendingScope(plan: Plan): PendingScope[] {
  if (isBusiness(plan)) {
    return [{ id: "visit", service: "visit", addressKey: "service", kind: "visit" }];
  }

  const pending: PendingScope[] = [];

  for (const job of jobsFor(plan, "renovation")) {
    pending.push({ id: job.id, service: "renovation", addressKey: job.addressKey, kind: "renovation" });
  }

  for (const job of jobsFor(plan, "cleaning")) {
    if (specialGlass(job.details)) {
      pending.push({ id: job.id, service: "cleaning", addressKey: job.addressKey, kind: "windows" });
    }
  }

  for (const job of jobsFor(plan, "disposal")) {
    pending.push({ id: job.id, service: "disposal", addressKey: job.addressKey, kind: "disposal" });
  }

  if (movingSelected(plan)) {
    // Special items are priced per item now; only custom entries need the team.
    const custom = plan.moving.method === "items" &&
      plan.moving.rooms.some((room) => room.items.some((item) => !item.catalogId));
    if (custom) pending.push({ id: "moving:custom", service: "moving", addressKey: "from", kind: "custom" });
  }

  // A service the office added is always priced by the team.
  for (const key of plan.customServices) {
    pending.push({ id: customTaskId(key), service: "custom", addressKey: customLocation(plan, key), kind: "request" });
  }

  return pending;
}

// ── The flow ────────────────────────────────────────────────────────────

export type BuiltinStepId =
  | "services"
  | "account"
  | "address"
  | "property"
  | "home"
  | "extras"
  | "renovation"
  | "cleaning"
  | "disposal"
  | "photos"
  | "schedule"
  | "review"
  | "payment";

/** A custom service's own step: its questions (`svc-<service key>`). */
export type CustomStepId = `svc-${string}`;

export type StepId = BuiltinStepId | CustomStepId;

export const isCustomStep = (step: string): step is CustomStepId => step.startsWith("svc-");

/** The four phases across the top of the planner, as the prototype groups them. */
export const PHASES: Array<{ key: string; steps: StepId[] }> = [
  { key: "plan.phase.plan", steps: ["services", "account", "address", "property"] },
  { key: "plan.phase.details", steps: ["home", "extras", "renovation", "cleaning", "disposal", "photos"] },
  { key: "plan.phase.schedule", steps: ["schedule"] },
  { key: "plan.phase.review", steps: ["review", "payment"] },
];

/** The phase a step sits in; a custom service's questions are details. */
export const phaseOf = (step: StepId) => (isCustomStep(step) ? 1 : PHASES.findIndex((entry) => entry.steps.includes(step)));

/**
 * Booking site → Common steps: the office hid the photos and asks nothing
 * else there, so the step goes. Required wins over hidden.
 */
export const photosStepHidden = (common: CommonFlow | null | undefined) =>
  commonHidden(common, "photos.photos") && !fieldRequired(INITIAL_PLAN, null, "photos.photos", common) && commonQuestions(common, "photos").length === 0;

export function flow(plan: Plan, context?: Pick<ValidationContext, "common">): StepId[] {
  const custom = plan.customServices.map((key): CustomStepId => `svc-${key}`);

  if (isBusiness(plan)) return ["services", "account", "address", ...custom, "schedule", "review"];

  const steps: StepId[] = ["services", "address"];
  const any = anyServiceSelected(plan);

  if (propertyKeys(plan).length > 0) steps.push("property");
  if (plan.services.moving) steps.push("home", "extras");
  if (plan.services.renovation) steps.push("renovation");
  if (plan.services.cleaning) steps.push("cleaning");
  if (plan.services.disposal) steps.push("disposal");
  steps.push(...custom);

  // Photos and payment belong to a booking; a site-visit request skips both.
  if ((!isRequestOnly(plan) || !any) && !photosStepHidden(context?.common)) steps.push("photos");
  steps.push("schedule", "review");
  if (!isRequestOnly(plan) || !any) steps.push("payment");

  return steps;
}

export interface ValidationContext {
  signedIn: boolean;
  /** What the office configured (Dashboard → Services): required answers and its questions. */
  catalog?: BookingCatalog;
  /** Settings → Company: refuse addresses outside every service zone. */
  onlyInsideAreas?: boolean;
  /** Booking site → Common steps: labels, Required and Shown, and questions for everyone. */
  common?: CommonFlow;
}

/** "Bill someone else" offered: the office may take it off the payment step. */
export const billToOther = (plan: Plan, common: CommonFlow | null | undefined) => plan.billTo === "other" && !commonHidden(common, "payment.billTo");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Why an address may not be used under "only inside the service areas", or null. */
export function areaProblem(address: PlanAddress | undefined, onlyInsideAreas: boolean | undefined): string | null {
  if (!onlyInsideAreas || !validAddress(address)) return null;
  switch (address.area) {
    case undefined:
      return "plan.error.areaPending";
    case "outside":
      return "plan.error.outsideArea";
    case "nopostcode":
      return "plan.error.areaPostcode";
    default:
      return null;
  }
}

export function validateStep(plan: Plan, step: StepId, context: ValidationContext): Errors {
  const errors: Errors = {};
  const required = (fieldId: string) => fieldRequired(plan, context.catalog ?? null, fieldId, context.common);

  switch (step) {
    case "services":
      if (!anyServiceSelected(plan)) errors.services = "plan.error.services";
      // The questions of the start screen (who is booking), asked of everyone.
      for (const asked of commonQuestions(context.common, "type")) {
        const problem = answerProblem(asked.question, plan.answers[asked.key]);
        if (problem) errors[`q.${asked.key}`] = problem;
      }
      break;

    case "account":
      if (!context.signedIn) errors.auth = "plan.error.businessSignIn";
      if (!plan.company.trim()) errors.company = "plan.error.company";
      if (required("account.phone") && plan.contact.phone.replace(/\D/g, "").length < 6) errors.companyPhone = "plan.error.phone";
      break;

    case "address": {
      const primary = movingSelected(plan) ? ["from", "to"] : ["service"];
      const needsPrimary = movingSelected(plan) || isBusiness(plan);

      if (needsPrimary) {
        for (const key of primary) {
          if (!validAddress(plan.addresses[key])) errors[`address.${key}`] = "plan.error.address";
        }
      }

      if (!isBusiness(plan)) {
        for (const service of LOCATED_SERVICES) {
          if (!plan.services[service]) continue;
          const keys = locationKeys(plan, service);
          if (keys.length === 0 || keys.some((key) => !validAddress(plan.addresses[key]))) {
            errors[`locations.${service}`] = "plan.error.locations";
          }
        }
      }

      if (!isBusiness(plan)) {
        for (const key of plan.customServices) {
          if (!validAddress(plan.addresses[customLocation(plan, key)])) errors[`locations.custom:${key}`] = "plan.error.customLocation";
        }
      }

      // Settings → Company: "Only accept addresses in the service areas".
      for (const key of usedAddressKeys(plan)) {
        const problem = areaProblem(plan.addresses[key], context.onlyInsideAreas);
        if (problem) errors[`area.${key}`] = problem;
      }

      const a = plan.addresses.from;
      const b = plan.addresses.to;
      if (movingSelected(plan) && a && b && a.text.trim().toLowerCase() === b.text.trim().toLowerCase()) {
        const fromFloor = plan.access.from?.floor ?? null;
        const toFloor = plan.access.to?.floor ?? null;
        if (fromFloor === toFloor) errors.same = "plan.error.sameAddress";
      }
      break;
    }

    case "property":
      for (const key of propertyKeys(plan)) {
        const access = accessFor(plan, key);
        if (!validAddress(plan.addresses[key])) errors[`property.${key}.address`] = "plan.error.address";
        if (access.floor === null) errors[`property.${key}.floor`] = "plan.error.floor";
        if (access.floor !== null && access.floor !== 0 && access.lift && !access.fit) {
          errors[`property.${key}.fit`] = "plan.error.liftFit";
        }
        if (!access.parking) errors[`property.${key}.parking`] = "plan.error.parking";
        if (required("property.notes") && !access.notes.trim()) errors[`property.${key}.notes`] = "plan.error.required";
      }
      if (movingSelected(plan) && !plan.moving.method) errors.method = "plan.error.method";
      break;

    case "home": {
      const m = plan.moving;
      if (m.method === "area") {
        const area = decimal(m.areaSqm);
        if (!(area >= 10 && area <= 2000)) errors.area = "plan.error.livingArea";
        if (!m.areaAssembly) errors.areaAssembly = "plan.error.areaAssembly";
        if (m.areaAssembly === "yes" && m.areaAssemblyItems.length === 0) {
          errors.areaAssemblyItems = "plan.error.areaAssemblyItems";
        }
        if (m.areaAssemblyItems.some((item) => item.prep === "unanswered" || item.prep === "ready")) {
          errors.areaAssemblyItems = "plan.error.assemblyMode";
        }
      } else {
        if (inventoryCount(plan) === 0) errors.items = "plan.error.inventoryEmpty";
        const unanswered = m.rooms.flatMap((room) => room.items).filter((item) => item.prep === "unanswered");
        if (unanswered.length > 0) errors.preparation = "plan.error.preparation";
        if (inventoryCount(plan) > 0 && !m.acceptedExtra) errors.acceptedExtra = "plan.error.acceptExtra";
      }
      if (required("home.specials") && m.specials.length === 0) errors.specials = "plan.error.specialsRequired";
      break;
    }

    case "renovation":
    case "cleaning":
    case "disposal": {
      const jobs = jobsFor(plan, step);
      if (jobs.length === 0) errors.locations = "plan.error.locations";
      for (const job of jobs) {
        for (const [key, message] of Object.entries(jobErrors(job))) errors[`${job.id}.${key}`] = message;
        if (step === "disposal" && required("disposal.notes") && !(job.details as DisposalDetails).notes.trim()) {
          errors[`${job.id}.notes`] = "plan.error.required";
        }
      }
      break;
    }

    case "schedule": {
      const today = todayIso();
      for (const task of scheduleTasks(plan)) {
        if (!task.slot.date || task.slot.date <= today) errors[`date.${task.id}`] = "plan.error.date";
        else if (task.slot.window === null) errors[`window.${task.id}`] = "plan.error.window";
      }

      // A move-out clean at the old home cannot come before the furniture leaves.
      const moveDay = plan.moving.slot.date;
      if (plan.services.moving && moveDay) {
        for (const job of jobsFor(plan, "cleaning")) {
          if (job.addressKey === "from" && job.details.moveClean && job.slot.date && job.slot.date < moveDay) {
            errors[`date.${job.id}`] = "plan.error.cleanAfterMove";
          }
        }
      }
      if (required("schedule.notes") && !plan.scheduleNotes.trim()) errors.scheduleNotes = "plan.error.required";
      break;
    }

    case "review":
      if (isRequestOnly(plan)) {
        if (plan.contact.name.trim().split(/\s+/).length < 2) errors.name = "plan.error.fullName";
        if (!EMAIL.test(plan.contact.email.trim())) errors.email = "plan.error.email";
        if (plan.contact.phone.replace(/\D/g, "").length < 6) errors.phone = "plan.error.phone";
        if (!plan.requestConsent) errors.consent = "plan.error.requestConsent";
      }
      break;

    case "payment":
      if (!context.signedIn) errors.auth = "plan.error.signIn";
      if (plan.contact.name.trim().split(/\s+/).length < 2) errors.name = "plan.error.fullName";
      if (plan.contact.phone.replace(/\D/g, "").length < 6) errors.phone = "plan.error.phone";
      if (billToOther(plan, context.common)) {
        if (plan.other.name.trim().split(/\s+/).length < 2) errors.otherName = "plan.error.fullName";
        if (!EMAIL.test(plan.other.email.trim())) errors.otherEmail = "plan.error.email";
        if (plan.other.address.trim().length < 8) errors.otherAddress = "plan.error.billingAddress";
      }
      if (!plan.terms) errors.terms = "plan.error.terms";
      break;

    case "extras":
      if (required("extras.notes") && !plan.moving.notes.trim()) errors.extrasNotes = "plan.error.required";
      break;

    case "photos":
      if (required("photos.photos") && plan.photoNames.length === 0) errors.photos = "plan.error.photosRequired";
      break;

    default:
      // A custom service's own step: only its questions, checked below.
      break;
  }

  // The questions the office added to this step (Booking site, Services).
  for (const asked of stepQuestions(plan, context.catalog ?? null, step, context.common)) {
    const problem = answerProblem(asked.question, plan.answers[asked.key]);
    if (problem) errors[`q.${asked.key}`] = problem;
  }

  return errors;
}

/** The first step, in flow order, that still needs an answer. */
export function firstIncomplete(plan: Plan, context: ValidationContext, before?: StepId): StepId | null {
  const steps = flow(plan, context);
  const limit = before ? steps.indexOf(before) : steps.length;

  for (const step of steps.slice(0, limit < 0 ? steps.length : limit)) {
    if (Object.keys(validateStep(plan, step, context)).length > 0) return step;
  }

  return null;
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
