import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Job postings and the applications sent for them.
 *
 * The postings used to be numbered CMS slots on `page-jobs` (title, one line,
 * hours, place). They are rows now because a posting has grown a page of its
 * own — description, tasks, requirements, what we offer — and because an
 * application has to point at the job it was sent for, which a slot number
 * that shifts when an editor reorders the list cannot do.
 *
 * Posting copy is written once, in German, and shown on every locale of the
 * site: the office writes the ads, and four hand-kept translations of every ad
 * would drift apart within a month.
 */

export const employmentTypeEnum = pgEnum("employment_type", ["full_time", "part_time", "mini_job"]);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The posting's address: /jobs/<slug>. A deleted posting gives its slug up. */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** The line under the title in the list. Plain text. */
    summary: text("summary").notNull().default(""),

    // The detail page's sections. Sanitised HTML (paragraphs, lists, bold,
    // links) from the dashboard's editor; an empty one is not shown.
    description: text("description").notNull().default(""),
    tasks: text("tasks").notNull().default(""),
    requirements: text("requirements").notNull().default(""),
    offer: text("offer").notNull().default(""),

    location: text("location").notNull().default(""),
    employmentType: employmentTypeEnum("employment_type").notNull().default("full_time"),

    /** Off hides the posting from the website without losing it. */
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    /**
     * Deleting a posting keeps the row: applications point at it, and the
     * office still needs to read the CVs sent for a job it has since taken
     * down.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jobs_sort_idx").on(table.sortOrder),
    uniqueIndex("jobs_slug_idx").on(table.slug),
  ],
);

/** One uploaded file of an application, as stored on the API's disk. */
export interface JobApplicationFile {
  kind: "cv" | "attachment";
  /** The applicant's file name, for the download. Never used as a path. */
  name: string;
  /** The name on disk: random, with the extension the bytes were checked for. */
  storedName: string;
  contentType: string;
  bytes: number;
}

export const jobApplications = pgTable(
  "job_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),
    /** The title when the application was sent, should the posting be renamed. */
    jobTitle: text("job_title").notNull(),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    address: text("address"),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    message: text("message"),
    /** The site language the applicant used, so the office knows how to reply. */
    locale: text("locale").notNull().default("de"),

    files: jsonb("files").$type<JobApplicationFile[]>().notNull().default([]),

    /** When the applicant agreed to the privacy notice (DSGVO). */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    /** Set when someone in the office first opened it. */
    readAt: timestamp("read_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("job_applications_job_idx").on(table.jobId, table.createdAt)],
);

export const jobsRelations = relations(jobs, ({ many }) => ({
  applications: many(jobApplications),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  job: one(jobs, { fields: [jobApplications.jobId], references: [jobs.id] }),
}));
