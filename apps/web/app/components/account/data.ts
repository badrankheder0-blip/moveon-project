"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { useLiveOrders } from "@/lib/live/useLiveData";

import type { MyClaim, MyInvoice, MyNotification, MyReview } from "./model";

/**
 * The account's reads. Every one is the signed-in customer's own rows, which
 * the API decides; nothing here filters someone else's data out.
 */

export const accountKeys = {
  notifications: (locale: string) => ["account", "notifications", locale] as const,
  invoices: ["invoices", "mine"] as const,
  claims: ["account", "claims"] as const,
  reviews: ["reviews", "mine"] as const,
  profile: ["account", "profile"] as const,
};

/** The customer's bookings, newest first, kept current. */
export function useMyOrders() {
  return useLiveOrders({ limit: 100 });
}

export function useMyNotifications() {
  const { sdk, user } = useApi();
  const { locale } = useI18n();

  return useQuery({
    queryKey: accountKeys.notifications(locale),
    queryFn: () => sdk.http.get<{ items: MyNotification[]; unread: number }>("/api/notifications/mine", { locale }),
    enabled: Boolean(user),
    // A notification sent while the account is open shows up within a minute.
    refetchInterval: 60_000,
  });
}

/** Marks notifications read and updates the badge at once rather than on the next poll. */
export function useMarkRead() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const queryClient = useQueryClient();

  return useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const at = new Date().toISOString();
      queryClient.setQueryData<{ items: MyNotification[]; unread: number }>(accountKeys.notifications(locale), (previous) => {
        if (!previous) return previous;
        const items = previous.items.map((item) => (ids.includes(item.id) && !item.readAt ? { ...item, readAt: at } : item));
        return { items, unread: items.filter((item) => !item.readAt).length };
      });
      await Promise.allSettled(ids.map((id) => sdk.http.post(`/api/notifications/${id}/read`)));
      void queryClient.invalidateQueries({ queryKey: ["account", "notifications"] });
    },
    [sdk, locale, queryClient],
  );
}

export function useMyInvoices() {
  const { sdk, user } = useApi();
  return useQuery({
    queryKey: accountKeys.invoices,
    queryFn: () => sdk.http.get<{ invoices: MyInvoice[] }>("/api/invoices/mine"),
    enabled: Boolean(user),
  });
}

export function useMyClaims() {
  const { sdk, user } = useApi();
  return useQuery({
    queryKey: accountKeys.claims,
    queryFn: () => sdk.http.get<{ claims: MyClaim[] }>("/api/claims/mine"),
    enabled: Boolean(user),
  });
}

export function useMyReviews() {
  const { sdk, user } = useApi();
  return useQuery({
    queryKey: accountKeys.reviews,
    queryFn: () => sdk.http.get<{ items: MyReview[]; reviewable: { id: string }[] }>("/api/reviews/mine"),
    enabled: Boolean(user),
  });
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: string;
  /** A small JPEG data URL, or null without a photo. */
  avatar: string | null;
  profileAddress: ProfileAddress | null;
  createdAt: string;
  savedAddresses?: SavedAddress[] | null;
}

export interface ProfileAddress {
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  street: string;
  zip: string;
  city: string;
  floor: string;
  lift: "yes" | "no";
  isDefault: boolean;
}

export function useProfile() {
  const { sdk, user } = useApi();
  return useQuery({
    queryKey: accountKeys.profile,
    queryFn: () => sdk.http.get<Profile>("/api/users/me"),
    enabled: Boolean(user),
  });
}
