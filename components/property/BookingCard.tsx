"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { requestBooking } from "@/app/actions/booking";
import { createClient } from "@/lib/supabase/client";
import { formatArabicNumber } from "@/lib/format";
import type { PaymentMethod } from "@/lib/supabase/database.types";
import styles from "./BookingCard.module.css";

interface BookingCardProps {
  propertyId: string;
  pricePerNight: number;
  currency: string;
  /** ISO dates (YYYY-MM-DD) that are booked or blocked. */
  unavailable: string[];
  whatsappUrl: string;
  title: string;
}

const MS_PER_DAY = 86_400_000;
const todayIso = () => new Date().toISOString().slice(0, 10);

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = (Date.parse(checkOut) - Date.parse(checkIn)) / MS_PER_DAY;
  return diff > 0 ? Math.round(diff) : 0;
}

/** Every night in [checkIn, checkOut) — the checkout day itself is not a stay night. */
function nightsInRange(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cursor = Date.parse(checkIn);
  const end = Date.parse(checkOut);
  while (cursor < end) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += MS_PER_DAY;
  }
  return out;
}

export function BookingCard({
  propertyId,
  pricePerNight,
  currency,
  unavailable,
  whatsappUrl,
  title,
}: BookingCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // null = still checking the session
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(!!session?.user),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;
  const unavailableSet = useMemo(() => new Set(unavailable), [unavailable]);
  const nights = nightsBetween(checkIn, checkOut);
  const total = nights * pricePerNight;
  const hasConflict =
    nights > 0 && nightsInRange(checkIn, checkOut).some((d) => unavailableSet.has(d));

  function submit() {
    setMsg(null);
    if (authed === false) {
      router.push(loginHref);
      return;
    }
    if (nights <= 0) {
      setMsg({ ok: false, text: "اختر تاريخ الوصول وتاريخ المغادرة." });
      return;
    }
    if (hasConflict) {
      setMsg({ ok: false, text: "بعض الليالي المختارة محجوزة. الرجاء اختيار تواريخ أخرى." });
      return;
    }
    startTransition(async () => {
      // Totals are recomputed server-side by the request_booking RPC — never trusted from here.
      const res = await requestBooking({ propertyId, checkIn, checkOut, paymentMethod: payment });
      if (res.ok) {
        setMsg({ ok: true, text: "تم استلام طلب الحجز! سنتواصل معك لتأكيد الدفع والتفاصيل." });
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  const waText = encodeURIComponent(
    `مرحباً، مهتم بحجز «${title}»${checkIn && checkOut ? ` من ${checkIn} إلى ${checkOut}` : ""}.`,
  );
  const waHref = `${whatsappUrl}?text=${waText}`;

  return (
    <div className={styles.card}>
      <div className={styles.price}>
        <span className={styles.priceVal}>{formatArabicNumber(pricePerNight)}</span>
        <span className={styles.priceUnit}>{currency} / الليلة</span>
      </div>

      <div className={styles.dates}>
        <div className={styles.field}>
          <label htmlFor="checkIn">الوصول</label>
          <input
            id="checkIn"
            type="date"
            min={todayIso()}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="checkOut">المغادرة</label>
          <input
            id="checkOut"
            type="date"
            min={checkIn || todayIso()}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
      </div>

      <div className={`${styles.field} ${styles.pay}`}>
        <label htmlFor="payment">طريقة الدفع</label>
        <select
          id="payment"
          value={payment}
          onChange={(e) => setPayment(e.target.value as PaymentMethod)}
        >
          <option value="cash">نقداً</option>
          <option value="bank_transfer">تحويل بنكي</option>
        </select>
      </div>

      {nights > 0 && (
        <div className={styles.summary}>
          <div className={styles.row}>
            <span>
              {formatArabicNumber(pricePerNight)} {currency} × {formatArabicNumber(nights)} ليالٍ
            </span>
            <span>
              {formatArabicNumber(total)} {currency}
            </span>
          </div>
          <div className={styles.total}>
            <span>الإجمالي</span>
            <span>
              {formatArabicNumber(total)} {currency}
            </span>
          </div>
        </div>
      )}

      <button className={styles.submit} onClick={submit} disabled={pending || authed === null}>
        {pending
          ? "جارٍ الإرسال…"
          : authed === false
            ? "سجّل الدخول للحجز"
            : "اطلب الحجز"}
      </button>

      <a className={styles.whatsapp} href={waHref} target="_blank" rel="noopener noreferrer">
        استفسر عبر واتساب
      </a>

      {msg && (
        <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>
      )}

      <p className={styles.note}>لن يتم خصم أي مبلغ الآن — الدفع يدوي بعد تأكيد الحجز.</p>
    </div>
  );
}
