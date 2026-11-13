"use client";

import { createContext, useContext, type Dispatch, type MutableRefObject } from "react";

import type { BookingCatalog, CatalogService, CommonFlow } from "@/lib/booking/catalog";
import type { Errors, Plan, PlanAction, RoomType, ServiceKey, StepId } from "@/lib/booking/plan";

/**
 * What every planner screen reads: the plan, the way to change it, and the
 * errors of the screen the customer last tried to leave.
 *
 * A context rather than props because the screens are deep — a room's item row
 * three components down still needs to dispatch — and because the summary
 * rail reads the same plan as the step beside it.
 */
export interface PlannerContextValue {
  plan: Plan;
  dispatch: Dispatch<PlanAction>;
  /** Shown only once the customer has tried to continue from this step. */
  errors: Errors;
  go: (step: StepId) => void;
  /**
   * Dashboard-editable photos and copy for the planner (`planner` content
   * section, edited under Dashboard → Booking site).
   */
  images: Record<string, string>;
  /** The services the office offers (Dashboard → Services), or null when unknown. */
  catalog: BookingCatalog;
  /**
   * The chosen photos. Files cannot live in the serialisable plan, so the
   * plan keeps their names and this keeps the files for the session.
   */
  photoFiles: MutableRefObject<Map<string, File>>;
  /** A built-in service's name as the office wrote it, or the planner's own. */
  serviceName: (service: ServiceKey | "visit") => string;
  /** A custom service's name in this language (or any it was written in). */
  customName: (key: string) => string;
  customService: (key: string) => CatalogService | undefined;
  /** The steps every customer sees, as Dashboard → Booking site set them up. */
  common: CommonFlow;
  /** Whether a selected service, or the Booking site, made this optional built-in answer required. */
  fieldRequired: (fieldId: string) => boolean;
  /** Whether a built-in answer is on the screen (Booking site → Shown). */
  fieldShown: (fieldId: string) => boolean;
  /** A built-in answer's label: the office's in this language, else the planner's own. */
  fieldLabel: (fieldId: string, fallback: string) => string;
  roomTypeName: (type: RoomType) => string;
  /** "A" / "B" style label for an address key, for maps and summaries. */
  addressLabel: (key: string) => string;
}

export const PlannerContext = createContext<PlannerContextValue | null>(null);

export function usePlanner(): PlannerContextValue {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner must be used inside the booking planner.");
  return value;
}

/** Resolves an error key for a field, or undefined, so it can feed <Field error>. */
export function useFieldError() {
  const { errors } = usePlanner();
  return (key: string, t: (key: string) => string) => (errors[key] ? t(errors[key]) : undefined);
}

/** The value of a `planner` copy slot, or the catalogue's wording when the office left it empty. */
export function plannerCopy(images: Record<string, string>, slot: string, fallback: string): string {
  return images[slot]?.trim() || fallback;
}
