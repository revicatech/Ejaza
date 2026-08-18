"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelBooking } from "@/app/actions/booking";
import { formatArabicNumber } from "@/lib/format";
import type { BookingInvoiceRow } from "@/lib/supabase/database.types";
import styles from "./bookings.module.css";

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد الانتظار", cls: styles.bPending },
  confirmed: { label: "مؤكد", cls: styles.bConfirmed },
  cancelled: { label: "ملغى", cls: styles.bCancelled },
  completed: { label: "منتهي", cls: styles.bCompleted },
};
const payBadge: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "غير مدفوع", cls: styles.bUnpaid },
  pending: { label: "قيد الدفع", cls: styles.bPending },
  paid: { label: "مدفوع", cls: styles.bPaid },
  refunded: { label: "مُسترجع", cls: styles.bCancelled },
};
const payMethod: Record<string, string> = { cash: "نقداً", bank_transfer: "تحويل بنكي" };

export function MyBookings({ bookings }: { bookings: BookingInvoiceRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  function cancel(id: string) {
    if (!confirm("إلغاء هذا الحجز؟")) return;
    setBusyId(id);
    setMsg(null);
    startTransition(async () => {
      const res = await cancelBooking({ bookingId: id });
      setBusyId(null);
      if (res.ok) {
        setMsg({ id, ok: true, text: "تم إلغاء الحجز." });
        router.refresh();
      } else {
        setMsg({ id, ok: false, text: res.error });
      }
    });
  }

  if (bookings.length === 0) {
    return (
      <div className={styles.empty}>
        ما عندك حجوزات بعد. <Link href="/properties">تصفّح الفلل</Link> واحجز إجازتك.
      </div>
    );
  }

  return (
    <>
      {bookings.map((b) => {
        const s = statusBadge[b.status];
        const p = payBadge[b.payment_status];
        const busy = pending && busyId === b.booking_id;
        return (
          <div key={b.booking_id} className={styles.card}>
            <div className={styles.rowTop}>
              <div>
                <Link href={`/properties/${b.property_id}`} className={styles.title}>
                  {b.property_name}
                </Link>
                <div className={styles.sub}>{b.property_area}</div>
              </div>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${s.cls}`}>{s.label}</span>
                <span className={`${styles.badge} ${p.cls}`}>{p.label}</span>
              </div>
            </div>

            <div className={styles.grid}>
              <div><span>الوصول</span><strong>{b.check_in}</strong></div>
              <div><span>المغادرة</span><strong>{b.check_out}</strong></div>
              <div><span>الليالي</span><strong>{formatArabicNumber(b.nights)}</strong></div>
              <div><span>الإجمالي</span><strong>{formatArabicNumber(b.total_price)} ل.س</strong></div>
              <div><span>طريقة الدفع</span><strong>{payMethod[b.payment_method] ?? b.payment_method}</strong></div>
            </div>

            {b.status === "pending" && (
              <div className={styles.actions}>
                <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => cancel(b.booking_id)}>
                  إلغاء الحجز
                </button>
              </div>
            )}
            {b.status === "confirmed" && b.payment_status !== "paid" && (
              <div className={styles.sub}>حجزك مؤكّد — سيتم التواصل معك لإتمام الدفع.</div>
            )}
            {msg && msg.id === b.booking_id && (
              <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>
            )}
          </div>
        );
      })}
    </>
  );
}