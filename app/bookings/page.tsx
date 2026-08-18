import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyBookingInvoices } from "@/lib/api/invoices";
import { PageBar } from "@/components/layout/PageBar";
import { MyBookings } from "./MyBookings";
import styles from "./bookings.module.css";

export const metadata: Metadata = { title: "حجوزاتي — إجازة" };
export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/bookings");

  const bookings = await getMyBookingInvoices();

  return (
    <div className={styles.page}>
      <PageBar backHref="/" backLabel="الرئيسية" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>حجوزاتي</h1>
          <p>تابع حالة حجوزاتك وتفاصيل الدفع.</p>
        </div>
        <MyBookings bookings={bookings} />
      </div>
    </div>
  );
}