import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { formatPrice, formatArabicNumber } from "@/lib/format";
import styles from "./PropertyCard.module.css";

const regionClass: Record<Listing["region"], string> = {
  "damascus-countryside": "region-mountain",
  coast: "region-coast",
};

export function PropertyCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/properties/${listing.id}`} className={`${styles.card} ${regionClass[listing.region]}`}>
      <div className={styles.image}>
        <Image
          src={listing.image}
          alt={listing.imageAlt}
          fill
          sizes="(max-width: 900px) 100vw, 33vw"
          style={{ objectFit: "cover" }}
        />
        {listing.isExample && <span className={styles.badge}>مثال توضيحي</span>}
      </div>
      <div className={styles.body}>
        <div className={styles.price}>{formatPrice(listing.pricePerNight, listing.currency)}</div>
        <div className={styles.title}>{listing.title}</div>
        <div className={styles.address}>{listing.area}</div>
        <div className={styles.meta}>
          <span>{formatArabicNumber(listing.rooms)} غرف</span>
          <span>{listing.highlight}</span>
          <span>حتى {formatArabicNumber(listing.capacity)} أشخاص</span>
        </div>
      </div>
    </Link>
  );
}
