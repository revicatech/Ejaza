"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmBooking, cancelBooking, setPaymentStatus } from "@/app/actions/booking";
import { formatArabicNumber } from "@/lib/format";
import type { BookingInvoiceRow } from "@/lib/supabase/database.types";
import styles from "./owner.module.css";

const bookingBadge: Record<string, { label: string; cls: string }> = {
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

export function OwnerBookings({ invoices }: { invoices: BookingInvoiceRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusyId(id);
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setBusyId(null);
      if (res.ok) {
        setMsg({ id, ok: true, text: "تم." });
        router.refresh();
      } else {
        setMsg({ id, ok: false, text: res.error ?? "خطأ." });
      }
    });
  }

  if (invoices.length === 0) {
    return <div className={styles.empty}>لا توجد حجوزات بعد على عقاراتك.</div>;
  }

  return (
    <>
      {invoices.map((inv) => {
        const b = bookingBadge[inv.status];
        const p = payBadge[inv.payment_status];
        const busy = pending && busyId === inv.booking_id;
        return (
          <div key={inv.booking_id} className={styles.card}>
            <div className={styles.rowTop}>
              <div>
                <div className={styles.rowTitle}>{inv.property_name}</div>
                <div className={styles.rowSub}>
                  {inv.guest_name}
                  {inv.guest_phone ? ` — ${inv.guest_phone}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className={`${styles.badge} ${b.cls}`}>{b.label}</span>
                <span className={`${styles.badge} ${p.cls}`}>{p.label}</span>
              </div>
            </div>

            <div className={styles.grid}>
              <div><span>الوصول</span><strong>{inv.check_in}</strong></div>
              <div><span>المغادرة</span><strong>{inv.check_out}</strong></div>
              <div><span>الليالي</span><strong>{formatArabicNumber(inv.nights)}</strong></div>
              <div><span>الإجمالي</span><strong>{formatArabicNumber(inv.total_price)} ل.س</strong></div>
              <div><span>عمولة المنصة</span><strong>{formatArabicNumber(inv.platform_fee)} ل.س</strong></div>
              <div><span>صافي لك</span><strong>{formatArabicNumber(inv.owner_payout)} ل.س</strong></div>
            </div>

            <div className={styles.actions}>
              {inv.status === "pending" && (
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={busy}
                  onClick={() => run(inv.booking_id, () => confirmBooking({ bookingId: inv.booking_id }))}
                >
                  تأكيد الحجز
                </button>
              )}
              {inv.status !== "cancelled" && inv.payment_status !== "paid" && (
                <button
                  className={styles.btn}
                  disabled={busy}
                  onClick={() =>
                    run(inv.booking_id, () => setPaymentStatus({ bookingId: inv.booking_id, status: "paid" }))
                  }
                >
                  تحديد كمدفوع
                </button>
              )}
              {(inv.status === "pending" || inv.status === "confirmed") && (
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  disabled={busy}
                  onClick={() => run(inv.booking_id, () => cancelBooking({ bookingId: inv.booking_id }))}
                >
                  إلغاء
                </button>
              )}
            </div>
            {msg && msg.id === inv.booking_id && (
              <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>
            )}
          </div>
        );
      })}
    </>
  );
}