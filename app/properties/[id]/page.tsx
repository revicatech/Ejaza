import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPropertyById, toListing } from "@/lib/api/properties";
import { getUnavailableDates } from "@/lib/api/availability";
import { formatArabicNumber } from "@/lib/format";
import { PageBar } from "@/components/layout/PageBar";
import { Footer } from "@/components/layout/Footer";
import { Gallery } from "@/components/property/Gallery";
import { BookingCard } from "@/components/property/BookingCard";
import { CheckIcon } from "@/components/icons";
import { site } from "@/lib/data/site";
import type { PropertyType } from "@/lib/supabase/database.types";
import styles from "./page.module.css";

// ISR: statically cached, revalidated hourly; property writes also bust it via
// revalidateTag(`property:{id}`).
export const revalidate = 3600;

const typeLabel: Record<PropertyType, string> = {
  villa: "فيلا",
  hotel: "فندق",
  event: "قاعة مناسبات",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property) return { title: "العقار غير موجود — إجازة" };
  const title = property.name_ar || property.name;
  return {
    title: `${title} — ${property.area} | إجازة`,
    description: `${typeLabel[property.type]} في ${property.area}، ${property.city} — حتى ${property.capacity} أشخاص، ${property.bedrooms} غرف نوم.`,
    openGraph: property.images[0]
      ? { images: [{ url: property.images[0] }] }
      : undefined,
  };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property || property.status !== "active") notFound();

  const listing = toListing(property);
  const region = property.region === "coast" ? "coast" : "damascus-countryside";
  const regionClass = region === "coast" ? "region-coast" : "region-mountain";

  // Availability read UNCACHED so freshly-booked dates are always reflected.
  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 24 * 3600 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const unavailableRows = await getUnavailableDates(property.id, iso(today), iso(in90));
  const unavailable = unavailableRows.map((r) => r.date);

  return (
    <div className={styles.page}>
      <PageBar backHref="/properties" backLabel="كل الفلل" />

      <div className="container">
        <div className={`${styles.head} ${regionClass}`}>
          <div className={styles.badges}>
            <span className={styles.badge}>{typeLabel[property.type]}</span>
          </div>
          <h1 className={styles.title}>{listing.title}</h1>
          <div className={styles.location}>
            {property.area}
            {property.city ? `، ${property.city}` : ""}
          </div>
        </div>

        <Gallery images={property.images} alt={listing.imageAlt} />

        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.section}>
              <h2>التفاصيل</h2>
              <div className={styles.specs}>
                <div className={styles.spec}>
                  <div className={styles.specVal}>{formatArabicNumber(property.bedrooms)}</div>
                  <div className={styles.specLabel}>غرف نوم</div>
                </div>
                <div className={styles.spec}>
                  <div className={styles.specVal}>{formatArabicNumber(property.bathrooms)}</div>
                  <div className={styles.specLabel}>حمّامات</div>
                </div>
                <div className={styles.spec}>
                  <div className={styles.specVal}>{formatArabicNumber(property.capacity)}</div>
                  <div className={styles.specLabel}>تتسع لـ (أشخاص)</div>
                </div>
              </div>
            </section>

            {property.amenities.length > 0 && (
              <section className={styles.section}>
                <h2>المرافق</h2>
                <div className={styles.amenities}>
                  {property.amenities.map((a) => (
                    <div key={a} className={styles.amenity}>
                      <CheckIcon />
                      {a}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className={styles.section}>
              <h2>الموقع</h2>
              <div className={styles.address}>
                <div>
                  <strong>المنطقة:</strong> {property.area}
                </div>
                <div>
                  <strong>المدينة:</strong> {property.city}
                </div>
                {property.address && (
                  <div>
                    <strong>العنوان:</strong> {property.address}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  الليالي المحجوزة خلال ٩٠ يوماً القادمة: {formatArabicNumber(unavailable.length)}
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <BookingCard
              propertyId={property.id}
              pricePerNight={listing.pricePerNight}
              currency={listing.currency}
              unavailable={unavailable}
              whatsappUrl={site.whatsappUrl}
              title={listing.title}
            />
          </aside>
        </div>
      </div>

      <div style={{ marginTop: 80 }}>
        <Footer />
      </div>
    </div>
  );
}
