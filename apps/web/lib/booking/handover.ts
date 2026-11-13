import {
  allCommonQuestions,
  answerText,
  findService,
  selectedCatalogServices,
  serviceQuestions,
  textAny,
  type BookingCatalog,
  type CatalogService,
  type CommonFlow,
} from "./catalog";
import {
  CLEAN_WINDOWS,
  DISPOSAL_TYPES,
  customLocation,
  customTaskId,
  isBusiness,
  jobsFor,
  scheduleTasks,
  selectedServices,
  windowLabel,
  type Access,
  type Plan,
} from "./plan";

/**
 * What the planner hands to the office, as text.
 *
 * Orders have a `notes` column and requests are emails, and both are read by
 * the office in German whatever language the customer booked in — the same
 * reason the request mail's team copy is German. So these sentences are
 * deliberately not translated: they are the plan's answers that no column
 * holds (rooms, parking, access notes, special items), written once for the
 * people who plan the crew.
 */

const FLOOR = (floor: number | null) =>
  floor === null ? "Etage offen" : floor < 0 ? "Keller" : floor === 0 ? "Erdgeschoss" : floor >= 10 ? "10. OG oder höher" : `${floor}. OG`;

const PARKING: Record<string, string> = {
  driveway: "Einfahrt",
  streetClose: "Straße, kurzer Weg",
  streetMedium: "Straße, mittlerer Weg",
  lotClose: "Parkplatz/Laderampe, kurzer Weg",
  lotMedium: "Parkplatz/Laderampe, mittlerer Weg",
  lotFar: "Parkplatz/Laderampe, weiter Weg",
};

const FIT: Record<string, string> = {
  all: "alle Möbel passen in den Aufzug",
  small: "nur kleine Teile passen in den Aufzug",
  unsure: "Aufzuggröße unklar",
};

const PREP: Record<string, string> = {
  ready: "transportbereit",
  dis: "Abbau durch Team",
  re: "Aufbau durch Team",
  both: "Ab- und Aufbau durch Team",
  unanswered: "Vorbereitung offen",
};

const SPECIAL: Record<string, string> = {
  piano: "Klavier/Flügel",
  safe: "Tresor",
  aquarium: "Aquarium/Terrarium",
  gym: "Fitnessgerät",
  heavy: "sehr schwerer Gegenstand (>100 kg)",
  artwork: "Kunstwerk/Spiegel",
};

const DISPOSAL: Record<string, string> = {
  largeFurniture: "große Möbel",
  smallFurniture: "kleine Möbel",
  largeElectronics: "Großgeräte/Elektronik",
  smallElectronics: "Kleinelektronik",
};

const WINDOWS: Record<string, string> = {
  standard: "Standardfenster",
  patio: "Balkon-/Terrassentür",
  large: "große Glasfläche",
  roof: "Dachfenster",
};

const WORK: Record<string, string> = {
  painting: "Malerarbeiten",
  flooring: "Parkett & Boden",
  repairs: "Löcher & Wandreparaturen",
};

const PAY: Record<string, string> = {
  bank_transfer: "Überweisung",
  card: "Karte",
  paypal: "PayPal",
  cash: "bar bei Abschluss",
};

function accessLine(label: string, address: string | undefined, access: Access | undefined): string {
  if (!access) return `${label}: ${address ?? "—"}`;

  const parts = [
    FLOOR(access.floor),
    access.floor !== null && access.floor !== 0 ? (access.lift ? `Aufzug${access.fit ? `, ${FIT[access.fit]}` : ""}` : "kein Aufzug") : "",
    access.parking ? `Parken: ${PARKING[access.parking]}` : "",
    access.notes.trim() ? `Hinweis: ${access.notes.trim()}` : "",
  ].filter(Boolean);

  return `${label}: ${address ?? "—"} (${parts.join(", ")})`;
}

/** Bounded to what the orders schema accepts, cutting the least important end. */
function clip(lines: string[], max = 1990): string {
  const text = lines.filter(Boolean).join("\n");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The notes on the moving order: inventory, access, specials, preferences. */
export function movingNotes(plan: Plan, customName: (room: Plan["moving"]["rooms"][number]) => string): string {
  const m = plan.moving;
  const lines = ["Buchungsplaner — Umzug"];

  lines.push(accessLine("Auszug", plan.addresses.from?.text, plan.access.from));
  lines.push(accessLine("Einzug", plan.addresses.to?.text, plan.access.to));

  if (m.method === "area") {
    lines.push(`Berechnet nach Wohnfläche: ${m.areaSqm} m²`);
    for (const item of m.areaAssemblyItems) lines.push(`- ${item.name} × ${item.count}: ${PREP[item.prep]}`);
  } else {
    for (const room of m.rooms) {
      if (room.items.length === 0) continue;
      lines.push(`${customName(room)}:`);
      for (const item of room.items) {
        const custom = item.catalogId ? "" : " [eigener Eintrag, nicht im Preis]";
        const notes = item.notes.trim() ? ` — ${item.notes.trim()}` : "";
        lines.push(`- ${item.name} × ${item.count} (${PREP[item.prep]})${custom}${notes}`);
      }
    }
  }

  if (m.specials.length > 0) {
    lines.push("Sondergegenstände (nicht im Preis, bitte prüfen):");
    for (const special of m.specials) {
      lines.push(`- ${SPECIAL[special.kind]} × ${special.count}${special.notes.trim() ? ` — ${special.notes.trim()}` : ""}`);
    }
  }

  if (m.notes.trim()) lines.push(`Hinweise an das Team: ${m.notes.trim()}`);

  return clip([...lines, ...commonLines(plan)]);
}

/** The notes on a cleaning order. */
export function cleaningNotes(plan: Plan, jobId: string): string {
  const job = jobsFor(plan, "cleaning").find((entry) => entry.id === jobId);
  if (!job) return clip(commonLines(plan));

  const lines = ["Buchungsplaner — Reinigung", accessLine("Adresse", job.address?.text, plan.access[job.addressKey])];
  if (job.details.moveClean) lines.push(`Umzugsreinigung: ${job.details.areaSqm} m² (ohne Fenster)`);
  if (job.details.windows) {
    lines.push(
      `Fenster (separat zu bepreisen): ${CLEAN_WINDOWS.filter((key) => job.details.windowCounts[key])
        .map((key) => `${job.details.windowCounts[key]} × ${WINDOWS[key]}`)
        .join(", ")}`,
    );
  }

  return clip([...lines, ...commonLines(plan)]);
}

function commonLines(plan: Plan): string[] {
  const lines: string[] = [];

  if (plan.photoNames.length > 0) {
    lines.push(`Fotos im Planer ausgewählt (nicht hochgeladen): ${plan.photoNames.length} — bitte beim Kunden anfordern`);
  }
  if (plan.scheduleNotes.trim()) lines.push(`Terminwunsch: ${plan.scheduleNotes.trim()}`);
  lines.push(`Zahlungswunsch: ${PAY[plan.payMethod]}`);

  if (plan.billTo === "other") {
    lines.push(
      `Rechnung an: ${plan.other.name.trim()}, ${plan.other.email.trim()}${plan.other.phone.trim() ? `, ${plan.other.phone.trim()}` : ""}, ${plan.other.address.trim()}`,
    );
  }

  return lines;
}

// ── The office's own questions ──────────────────────────────────────────

/**
 * "Label: answer" for every question of a service the customer answered,
 * labelled in German from the published flow, as the rest of the handover.
 */
export function answerLines(plan: Plan, service: CatalogService | undefined): string[] {
  if (!service) return [];
  return serviceQuestions(service)
    .map(({ key, question }) => {
      const text = answerText(question, plan.answers[key]);
      return text ? `${textAny(question.label, "de") || question.id}: ${text}` : "";
    })
    .filter(Boolean);
}

/** "Label: answer" for the questions every customer is asked (Booking site → Common steps). */
export function commonAnswerLines(plan: Plan, common: CommonFlow | null | undefined): string[] {
  return allCommonQuestions(common)
    .map(({ key, question }) => {
      const text = answerText(question, plan.answers[key]);
      return text ? `${textAny(question.label, "de") || question.id}: ${text}` : "";
    })
    .filter(Boolean);
}

/**
 * The answers an order carries in `orders.answers`: the questions of the
 * booked service and those every customer is asked, stored as the order
 * page's controls read them ("yes"/"no", a number, the option's German
 * wording).
 */
export function orderAnswers(plan: Plan, catalog: BookingCatalog, serviceKey: string, common?: CommonFlow | null): Record<string, string> {
  const service = findService(catalog, serviceKey);
  const out: Record<string, string> = {};
  const asked = [...allCommonQuestions(common), ...(service ? serviceQuestions(service) : [])];
  for (const { key, question } of asked) {
    const raw = plan.answers[key];
    const value = question.type === "photos" ? answerText(question, raw) : (raw ?? "").trim();
    if (value && !(question.type === "counter" && value === "0")) out[key] = value.slice(0, 2000);
  }
  return out;
}

/** One request line per job the team prices by hand. */
export interface RequestJob {
  /** A built-in job, or a custom service's key. */
  service: string;
  address: string;
  date?: string;
  window?: string;
  summary: string;
}

/** A job line and its answers, bounded to what the requests endpoint accepts. */
const withAnswers = (summary: string, lines: string[]) => clip([[summary, ...lines].filter(Boolean).join(" · ")], 2990);

export function requestJobs(plan: Plan, catalog: BookingCatalog = null): RequestJob[] {
  const tasks = scheduleTasks(plan);
  const taskFor = (id: string) => tasks.find((task) => task.id === id);
  const jobs: RequestJob[] = [];

  const when = (id: string) => {
    const task = taskFor(id);
    return {
      ...(task?.slot.date ? { date: task.slot.date } : {}),
      ...(task && task.slot.window !== null ? { window: windowLabel(task.slot.window) } : {}),
    };
  };

  if (isBusiness(plan)) {
    const names: Record<string, string> = {
      moving: "Umzug",
      renovation: "Renovierung",
      cleaning: "Reinigung",
      disposal: "Entrümpelung",
    };

    const customNames = plan.customServices.map((key) => textAny(findService(catalog, key)?.name, "de") || key);

    jobs.push({
      service: "visit",
      address: plan.addresses.service?.text ?? "",
      ...when("visit"),
      summary: withAnswers(
        [
          `Leistungen: ${[...selectedServices(plan).map((key) => names[key]), ...customNames].join(", ")}`,
          plan.access.service ? accessLine("Zugang", undefined, plan.access.service).replace(/^Zugang: — /, "Zugang ") : "",
          plan.scheduleNotes.trim() ? `Terminwunsch: ${plan.scheduleNotes.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        // A visit covers every service chosen, so it carries all their answers.
        selectedCatalogServices(plan, catalog).flatMap((service) => answerLines(plan, service)),
      ),
    });

    return jobs;
  }

  // The office's questions ride on a service's first request line.
  const answersOnce = (() => {
    const done = new Set<string>();
    return (key: string) => {
      if (done.has(key)) return [];
      done.add(key);
      return answerLines(plan, findService(catalog, key));
    };
  })();

  for (const job of jobsFor(plan, "renovation")) {
    jobs.push({
      service: "renovation",
      address: job.address?.text ?? "",
      ...when(job.id),
      summary: withAnswers(job.details.work.map((work) => `${WORK[work]} ca. ${job.details.areas[work] ?? "?"} m²`).join("; "), answersOnce("renovation")),
    });
  }

  for (const job of jobsFor(plan, "cleaning")) {
    // Area cleaning is booked as an order; only the windows come here.
    if (!job.details.windows) continue;
    jobs.push({
      service: "cleaning",
      address: job.address?.text ?? "",
      ...when(job.id),
      summary: withAnswers(
        `Fensterreinigung: ${CLEAN_WINDOWS.filter((key) => job.details.windowCounts[key])
          .map((key) => `${job.details.windowCounts[key]} × ${WINDOWS[key]}`)
          .join(", ")}`,
        answersOnce("cleaning"),
      ),
    });
  }

  for (const job of jobsFor(plan, "disposal")) {
    jobs.push({
      service: "disposal",
      address: job.address?.text ?? "",
      ...when(job.id),
      summary: withAnswers(
        [
          DISPOSAL_TYPES.filter((key) => job.details.counts[key])
            .map((key) => `${DISPOSAL[key]} × ${job.details.counts[key]}`)
            .join(", "),
          accessLine("Zugang", undefined, plan.access[job.addressKey]).replace(/^Zugang: — /, ""),
          job.details.notes.trim(),
        ]
          .filter(Boolean)
          .join(" · "),
        answersOnce("disposal"),
      ),
    });
  }

  // Services the office added: always a request, answered with its own questions.
  for (const key of plan.customServices) {
    jobs.push({
      service: key,
      address: plan.addresses[customLocation(plan, key)]?.text ?? "",
      ...when(customTaskId(key)),
      summary: withAnswers("", answersOnce(key)),
    });
  }

  return jobs;
}
