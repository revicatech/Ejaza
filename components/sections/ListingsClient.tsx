"use client";

import { useMemo, useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { filterOptions } from "@/lib/data/properties";
import type { Listing } from "@/lib/types";
import styles from "./Listings.module.css";

/** Interactive listing grid with area filter tabs. Data is fetched on the
 *  server by the Listings section and passed in as props. */
export function ListingsClient({ listings }: { listings: Listing[] }) {
  const [filter, setFilter] = useState("all");

  const visible = useMemo(
    () => (filter === "all" ? listings : listings.filter((p) => p.areaKey === filter)),
    [filter, listings],
  );

  return (
    <section className={styles.listings} id="listings">
      <div className="container">
        <div className={styles.head}>
          <div>
            <Eyebrow>شكل التجربة</Eyebrow>
            <h2>هيك رح تنعرض فيلتك عندنا</h2>
            <p className={styles.note}>
              المعرض التالي توضيحي — أمثلة عن شكل وتنسيق صفحة العقار. لسا عم نبني قائمة الفلل الفعلية
              بالتعاون مع أصحاب العقارات.
            </p>
          </div>
          <div className={styles.tabs}>
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                className={`${styles.tab} ${filter === opt.key ? styles.tabActive : ""}`}
                onClick={() => setFilter(opt.key)}
                aria-pressed={filter === opt.key}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grid}>
          {visible.map((listing) => (
            <PropertyCard key={listing.id} listing={listing} />
          ))}
        </div>

        <div className={styles.more}>
          <Button href="/properties">تصفّح كل الفلل</Button>
          <Button href="#owners" variant="light">عندك فيلا؟ كون أول عقار عنا</Button>
        </div>
      </div>
    </section>
  );
}
