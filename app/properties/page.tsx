import type { Metadata } from "next";
import { getActiveProperties } from "@/lib/api/properties";
import { PageBar } from "@/components/layout/PageBar";
import { Footer } from "@/components/layout/Footer";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { PropertyFilters } from "@/components/property/PropertyFilters";
import {
  DEFAULTS,
  typeOptions,
  guestOptions,
  sortOptions,
  hasActiveFilters,
  type FilterState,
} from "@/lib/data/filters";
import { filterOptions } from "@/lib/data/properties";
import { formatArabicNumber } from "@/lib/format";
import type { Category } from "@/lib/types";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "كل الفلل — إجازة",
  description: "تصفّح كل الفلل والشاليهات المتاحة في دمشق وريفها، مع فلترة حسب المنطقة والنوع وعدد الضيوف.",
};

interface SearchParams {
  area?: string;
  type?: string;
  guests?: string;
  sort?: string;
}

/** Only accept known values — keeps the data-cache key space bounded and stops
 *  arbitrary query strings reaching the DB filter. */
function pick(value: string | undefined, allowed: string[], fallback: string): string {
  return value && allowed.includes(value) ? value : fallback;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const current: FilterState = {
    area: pick(sp.area, filterOptions.map((o) => o.key), DEFAULTS.area),
    type: pick(sp.type, typeOptions.map((o) => o.key), DEFAULTS.type),
    guests: pick(sp.guests, guestOptions.map((o) => o.key), DEFAULTS.guests),
    sort: pick(sp.sort, sortOptions.map((o) => o.key), DEFAULTS.sort),
  };

  // Area filtering is pushed down to the cached data layer; the rest is applied
  // in memory. Never sort the cached array in place — copy first.
  const all = await getActiveProperties(current.area);

  let listings = current.type === DEFAULTS.type
    ? all
    : all.filter((l) => l.category === (current.type as Category));

  if (current.guests !== DEFAULTS.guests) {
    const min = Number(current.guests);
    listings = listings.filter((l) => l.capacity >= min);
  }

  if (current.sort === "price-asc") {
    listings = [...listings].sort((a, b) => a.pricePerNight - b.pricePerNight);
  } else if (current.sort === "price-desc") {
    listings = [...listings].sort((a, b) => b.pricePerNight - a.pricePerNight);
  }
  // "newest" is the data layer's default order (created_at desc).

  const catalogueEmpty = listings.length === 0 && !hasActiveFilters(current);

  return (
    <div className={styles.page}>
      <PageBar backHref="/" backLabel="الرئيسية" />

      <div className="container">
        <div className={styles.head}>
          <Eyebrow>المعروض حالياً</Eyebrow>
          <h1 className={styles.title}>كل الفلل والشاليهات</h1>
          <p className={styles.sub}>
            تصفّح العقارات المتاحة في ريف دمشق، وفلتر حسب المنطقة والنوع وعدد الضيوف.
          </p>
        </div>

        <PropertyFilters {...current} />

        {listings.length > 0 && (
          <div className={styles.count}>
            {formatArabicNumber(listings.length)} عقار متاح
          </div>
        )}

        {listings.length > 0 ? (
          <div className={styles.grid}>
            {listings.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>
              {catalogueEmpty ? "لسا ما في فلل منشورة" : "ما في نتائج مطابقة"}
            </div>
            <p>
              {catalogueEmpty
                ? "لسا عم نبني قائمة الفلل بالتعاون مع أصحاب العقارات. إذا عندك فيلا، كون أول عقار عنا."
                : "جرّب توسيع البحث — غيّر المنطقة أو عدد الضيوف، أو امسح الفلاتر."}
            </p>
            {catalogueEmpty ? (
              <Button href="/#owners">سجّل فيلتك</Button>
            ) : (
              <Button href="/properties">مسح الفلاتر</Button>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 80 }}>
        <Footer />
      </div>
    </div>
  );
}
