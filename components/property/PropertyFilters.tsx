"use client";

import { useRouter } from "next/navigation";
import { filterOptions } from "@/lib/data/properties";
import {
  buildFilterHref,
  hasActiveFilters,
  typeOptions,
  guestOptions,
  sortOptions,
  type FilterState,
} from "@/lib/data/filters";
import styles from "./PropertyFilters.module.css";

/** Filter bar for the catalogue. Current values arrive as props from the server
 *  page, so useSearchParams (and its Suspense boundary) isn't needed. */
export function PropertyFilters(current: FilterState) {
  const router = useRouter();

  const go = (patch: Partial<FilterState>) =>
    router.replace(buildFilterHref({ ...current, ...patch }), { scroll: false });

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            className={`${styles.tab} ${current.area === opt.key ? styles.tabActive : ""}`}
            onClick={() => go({ area: opt.key })}
            aria-pressed={current.area === opt.key}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.spacer} />

      <div className={styles.selects}>
        <div className={styles.field}>
          <label htmlFor="type">النوع</label>
          <select id="type" value={current.type} onChange={(e) => go({ type: e.target.value })}>
            {typeOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="guests">الضيوف</label>
          <select id="guests" value={current.guests} onChange={(e) => go({ guests: e.target.value })}>
            {guestOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="sort">الترتيب</label>
          <select id="sort" value={current.sort} onChange={(e) => go({ sort: e.target.value })}>
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters(current) && (
          <button
            className={styles.clear}
            onClick={() => router.replace("/properties", { scroll: false })}
          >
            مسح الفلاتر
          </button>
        )}
      </div>
    </div>
  );
}
