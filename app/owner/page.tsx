import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/api/profile";
import { getMyProperties } from "@/lib/api/properties";
import { getOwnerInvoices } from "@/lib/api/invoices";
import { formatArabicNumber } from "@/lib/format";
import { PageBar } from "@/components/layout/PageBar";
import { OwnerProperties } from "./OwnerProperties";
import { OwnerBookings } from "./OwnerBookings";
import styles from "./owner.module.css";

export const metadata: Metadata = { title: "لوحة المالك — إجازة" };
// Per-user dashboard: never cache.
export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/owner");

  const profile = await getMyProfile();
  const isOwner = profile?.role === "owner" || profile?.role === "admin";

  if (!isOwner) {
    return (
      <div className={styles.page}>
        <PageBar backHref="/" backLabel="الرئيسية" />
        <div className={styles.notice}>
          <h2>حساب ضيف</h2>
          <p>
            هذا الحساب غير مُفعّل كمالك عقار بعد. إذا عندك فيلا وتريد إدراجها، تواصل معنا وسنقوم
            بتفعيل حسابك كمالك.
          </p>
          <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/#owners">
            كيف أُدرج عقاري؟
          </Link>
        </div>
      </div>
    );
  }

  const [properties, invoices] = await Promise.all([getMyProperties(), getOwnerInvoices()]);
  const activeCount = properties.filter((p) => p.status === "active").length;
  const pendingCount = invoices.filter((i) => i.status === "pending").length;
  const expectedPayout = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + Number(i.owner_payout), 0);

  return (
    <div className={styles.page}>
      <PageBar backHref="/" backLabel="الرئيسية" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>لوحة المالك</h1>
          <p>أهلاً {profile?.full_name || ""} — تابع عقاراتك وحجوزاتك.</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatArabicNumber(properties.length)}</div>
            <div className={styles.statLabel}>عقاراتي</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatArabicNumber(activeCount)}</div>
            <div className={styles.statLabel}>المنشورة</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatArabicNumber(pendingCount)}</div>
            <div className={styles.statLabel}>حجوزات قيد الانتظار</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatArabicNumber(expectedPayout)}</div>
            <div className={styles.statLabel}>صافي متوقّع (ل.س)</div>
          </div>
        </div>

        <section className={styles.section}>
          <OwnerProperties properties={properties} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>الحجوزات الواردة</h2>
          </div>
          <OwnerBookings invoices={invoices} />
        </section>
      </div>
    </div>
  );
}