"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockDates, unblockDates } from "@/app/actions/availability";
import styles from "../../owner.module.css";

/** Every night in [from, to) — checkout day excluded, matching bookings. */
function nightsInRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = Date.parse(from);
  const end = Date.parse(to);
  while (cur < end) {
    out.push(new Date(cur).toISOString().slice(0, 10));
    cur += 864e5;
  }
  return out;
}

export function AvailabilityManager({
  propertyId,
  blockedDates,
  bookedDates,
}: {
  propertyId: string;
  blockedDates: string[];
  bookedDates: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function block() {
    setMsg(null);
    const dates = nightsInRange(from, to);
    if (dates.length === 0) {
      setMsg({ ok: false, text: "اختر نطاق تواريخ صحيح." });
      return;
    }
    startTransition(async () => {
      const res = await blockDates({ propertyId, dates });
      if (res.ok) {
        setMsg({ ok: true, text: `تم حجب ${dates.length} ليلة.` });
        setFrom("");
        setTo("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  function unblock(date: string) {
    startTransition(async () => {
      const res = await unblockDates({ propertyId, dates: [date] });
      if (res.ok) router.refresh();
      else setMsg({ ok: false, text: res.error });
    });
  }

  const sortedBlocked = [...blockedDates].sort();

  return (
    <div className={styles.card}>
      <p className={styles.rowSub} style={{ marginBottom: 12 }}>
        احجب تواريخ لا تريد استقبال حجوزات فيها (صيانة، استخدام شخصي…). التواريخ المحجوزة بحجوزات
        فعلية محميّة ولا يمكن حجبها.
      </p>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label>من</label>
          <input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>إلى (يوم المغادرة)</label>
          <input type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={block} disabled={pending}>
          حجب التواريخ
        </button>
      </div>
      {msg && <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>}

      <div style={{ marginTop: 16 }}>
        <div className={styles.rowSub} style={{ marginBottom: 8 }}>
          الليالي المحجوبة يدوياً ({sortedBlocked.length}):
        </div>
        {sortedBlocked.length === 0 ? (
          <span className={styles.rowSub}>لا يوجد.</span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sortedBlocked.map((d) => (
              <button
                key={d}
                className={styles.btn}
                disabled={pending}
                onClick={() => unblock(d)}
                title="اضغط لإلغاء الحجب"
              >
                {d} ✕
              </button>
            ))}
          </div>
        )}
        {bookedDates.length > 0 && (
          <div className={styles.rowSub} style={{ marginTop: 10 }}>
            ليالٍ محجوزة بحجوزات فعلية: {bookedDates.length} (محميّة).
          </div>
        )}
      </div>
    </div>
  );
}