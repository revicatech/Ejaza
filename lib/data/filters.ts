import type { FilterOption } from "@/lib/types";

/**
 * Shared filter config for the /properties catalogue.
 *
 * Deliberately a plain module (no "use client"): both the server page and the
 * client filter bar import these. Exports of a "use client" module become client
 * references on the server, so a Server Component cannot read their values.
 */

export interface FilterState {
  area: string;
  type: string;
  guests: string;
  sort: string;
}

export const DEFAULTS: FilterState = {
  area: "all",
  type: "all",
  guests: "any",
  sort: "newest",
};

export const typeOptions: FilterOption[] = [
  { key: "all", label: "كل الأنواع" },
  { key: "villa", label: "فلل" },
  { key: "hotel", label: "فنادق" },
  { key: "event", label: "قاعات مناسبات" },
];

export const guestOptions: FilterOption[] = [
  { key: "any", label: "أي عدد" },
  { key: "2", label: "٢+" },
  { key: "4", label: "٤+" },
  { key: "6", label: "٦+" },
  { key: "8", label: "٨+" },
];

export const sortOptions: FilterOption[] = [
  { key: "newest", label: "الأحدث" },
  { key: "price-asc", label: "الأقل سعراً" },
  { key: "price-desc", label: "الأعلى سعراً" },
];

/** Builds /properties?… from the current filters, omitting defaults so the
 *  canonical URL stays clean. */
export function buildFilterHref(state: FilterState): string {
  const params = new URLSearchParams();
  (Object.keys(DEFAULTS) as (keyof FilterState)[]).forEach((key) => {
    if (state[key] !== DEFAULTS[key]) params.set(key, state[key]);
  });
  const qs = params.toString();
  return qs ? `/properties?${qs}` : "/properties";
}

export function hasActiveFilters(state: FilterState): boolean {
  return (Object.keys(DEFAULTS) as (keyof FilterState)[]).some((k) => state[k] !== DEFAULTS[k]);
}
