"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProperty, deleteProperty, registerProperty } from "@/app/actions/property";
import { formatArabicNumber } from "@/lib/format";
import type { PropertyRow } from "@/lib/supabase/database.types";
import styles from "./owner.module.css";

const propBadge: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: styles.bDraft },
  pending_review: { label: "قيد المراجعة", cls: styles.bPending },
  active: { label: "منشور", cls: styles.bActive },
  inactive: { label: "غير نشط", cls: styles.bInactive },
};

export function OwnerProperties({ properties }: { properties: PropertyRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <>
      <div className={styles.sectionHead}>
        <h2>عقاراتي</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "إغلاق" : "+ أضف عقار"}
        </button>
      </div>

      {showForm && <AddPropertyForm onDone={() => { setShowForm(false); router.refresh(); }} />}

      {properties.length === 0 && !showForm && (
        <div className={styles.empty}>لا عقارات بعد. أضف أول عقار لك.</div>
      )}

      {properties.map((p) => {
        const b = propBadge[p.status];
        const busy = pending && busyId === p.id;
        return (
          <div key={p.id} className={styles.card}>
            <div className={styles.rowTop}>
              <div>
                <div className={styles.rowTitle}>{p.name_ar || p.name}</div>
                <div className={styles.rowSub}>
                  {p.area} — {formatArabicNumber(Number(p.price_per_night))} ل.س / الليلة
                </div>
              </div>
              <span className={`${styles.badge} ${b.cls}`}>{b.label}</span>
            </div>

            <div className={styles.actions}>
              <Link className={`${styles.btn} ${styles.btnPrimary}`} href={`/owner/properties/${p.id}`}>
                إدارة
              </Link>
              {p.status === "active" ? (
                <>
                  <Link className={styles.btn} href={`/properties/${p.id}`} target="_blank">
                    معاينة ↗
                  </Link>
                  <button
                    className={styles.btn}
                    disabled={busy}
                    onClick={() => run(p.id, () => updateProperty({ id: p.id, status: "inactive" }))}
                  >
                    إخفاء
                  </button>
                </>
              ) : (
                <button
                  className={styles.btn}
                  disabled={busy}
                  onClick={() => run(p.id, () => updateProperty({ id: p.id, status: "active" }))}
                >
                  نشر
                </button>
              )}
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                disabled={busy}
                onClick={() => {
                  if (confirm("حذف هذا العقار نهائياً؟")) run(p.id, () => deleteProperty({ id: p.id }));
                }}
              >
                حذف
              </button>
            </div>
            {msg && msg.id === p.id && (
              <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>
            )}
          </div>
        );
      })}
    </>
  );
}

function AddPropertyForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    nameAr: "", name: "", city: "", area: "", areaKey: "", region: "damascus-countryside",
    type: "villa", capacity: "6", bedrooms: "3", bathrooms: "2", pricePerNight: "150000",
    amenities: "", images: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await registerProperty({
        type: f.type as "villa" | "hotel" | "event",
        name: f.name || f.nameAr,
        nameAr: f.nameAr,
        city: f.city,
        area: f.area,
        region: f.region,
        areaKey: f.areaKey || undefined,
        capacity: Number(f.capacity),
        bedrooms: Number(f.bedrooms),
        bathrooms: Number(f.bathrooms),
        pricePerNight: Number(f.pricePerNight),
        amenities: f.amenities.split(",").map((s) => s.trim()).filter(Boolean),
        images: f.images.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {error && <div className={`${styles.msg} ${styles.msgErr}`} style={{ marginBottom: 8 }}>{error}</div>}
      <div className={styles.formGrid}>
        <div className={styles.field}><label>الاسم (عربي)</label><input required value={f.nameAr} onChange={set("nameAr")} /></div>
        <div className={styles.field}><label>الاسم (لاتيني)</label><input value={f.name} onChange={set("name")} placeholder="اختياري" /></div>
        <div className={styles.field}><label>النوع</label>
          <select value={f.type} onChange={set("type")}>
            <option value="villa">فيلا</option><option value="hotel">فندق</option><option value="event">قاعة</option>
          </select>
        </div>
        <div className={styles.field}><label>المدينة</label><input required value={f.city} onChange={set("city")} /></div>
        <div className={styles.field}><label>المنطقة</label><input required value={f.area} onChange={set("area")} /></div>
        <div className={styles.field}><label>المحافظة</label>
          <select value={f.region} onChange={set("region")}>
            <option value="damascus-countryside">ريف دمشق</option><option value="coast">الساحل</option>
          </select>
        </div>
        <div className={styles.field}><label>مفتاح الفلترة</label><input value={f.areaKey} onChange={set("areaKey")} placeholder="yafour" /></div>
        <div className={styles.field}><label>السعر / الليلة</label><input type="number" required value={f.pricePerNight} onChange={set("pricePerNight")} /></div>
        <div className={styles.field}><label>السعة</label><input type="number" required value={f.capacity} onChange={set("capacity")} /></div>
        <div className={styles.field}><label>غرف النوم</label><input type="number" required value={f.bedrooms} onChange={set("bedrooms")} /></div>
        <div className={styles.field}><label>الحمّامات</label><input type="number" required value={f.bathrooms} onChange={set("bathrooms")} /></div>
        <div className={`${styles.field} ${styles.full}`}><label>المرافق (مفصولة بفاصلة)</label><input value={f.amenities} onChange={set("amenities")} placeholder="مسبح, شرفة, واي فاي" /></div>
        <div className={`${styles.field} ${styles.full}`}><label>روابط الصور (مفصولة بفاصلة)</label><input value={f.images} onChange={set("images")} placeholder="https://…" /></div>
      </div>
      <div className={styles.actions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
          {pending ? "جارٍ الحفظ…" : "حفظ كمسودة"}
        </button>
      </div>
    </form>
  );
}