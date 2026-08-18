import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedProperty } from "@/lib/api/properties";
import { getOwnerInvoices } from "@/lib/api/invoices";
import { getUnavailableDates } from "@/lib/api/availability";
import { formatArabicNumber } from "@/lib/format";
import { PageBar } from "@/components/layout/PageBar";
import { Gallery } from "@/components/property/Gallery";
import { OwnerBookings } from "../../OwnerBookings";
import { EditPropertyForm } from "./EditPropertyForm";
import { AvailabilityManager } from "./AvailabilityManager";
import styles from "../../owner.module.css";

export const metadata: Metadata = { title: "إدارة عقار — إجازة" };
export const dynamic = "force-dynamic";

const propBadge: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: styles.bDraft },
  pending_review: { label: "قيد المراجعة", cls: styles.bPending },
  active: { label: "منشور", cls: styles.bActive },
  inactive: { label: "غير نشط", cls: styles.bInactive },
};

export default async function ManagePropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/owner/properties/${id}`);

  const property = await getOwnedProperty(id);
  if (!property) notFound();

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const from = iso(new Date());
  const to = iso(new Date(Date.now() + 180 * 864e5));
  const [allInvoices, unavailable] = await Promise.all([
    getOwnerInvoices(),
    getUnavailableDates(id, from, to),
  ]);
  const invoices = allInvoices.filter((i) => i.property_id === id);
  const blockedDates = unavailable.filter((r) => r.status === "blocked").map((r) => r.date);
  const bookedDates = unavailable.filter((r) => r.status === "booked").map((r) => r.date);
  const b = propBadge[property.status];

  return (
    <div className={styles.page}>
      <PageBar backHref="/owner" backLabel="لوحة المالك" />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.rowTop}>
            <div>
              <h1>{property.name_ar || property.name}</h1>
              <p>
                {property.area} — {formatArabicNumber(Number(property.price_per_night))} ل.س / الليلة
              </p>
            </div>
            <span className={`${styles.badge} ${b.cls}`}>{b.label}</span>
          </div>
          {property.status === "active" && (
            <Link className={styles.btn} href={`/properties/${property.id}`} target="_blank">
              شاهد الصفحة العامة ↗
            </Link>
          )}
        </div>

        {property.images.length > 0 && (
          <section className={styles.section}>
            <Gallery images={property.images} alt={property.name_ar || property.name} />
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}><h2>تعديل التفاصيل</h2></div>
          <EditPropertyForm property={property} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><h2>إدارة التوفّر</h2></div>
          <AvailabilityManager
            propertyId={property.id}
            blockedDates={blockedDates}
            bookedDates={bookedDates}
          />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><h2>حجوزات هذا العقار</h2></div>
          <OwnerBookings invoices={invoices} />
        </section>
      </div>
    </div>
  );
}