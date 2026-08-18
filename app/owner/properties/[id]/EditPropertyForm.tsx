"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProperty } from "@/app/actions/property";
import type { PropertyRow } from "@/lib/supabase/database.types";
import styles from "../../owner.module.css";

export function EditPropertyForm({ property }: { property: PropertyRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState({
    nameAr: property.name_ar,
    name: property.name,
    type: property.type,
    city: property.city,
    area: property.area,
    region: property.region ?? "damascus-countryside",
    areaKey: property.area_key ?? "",
    address: property.address ?? "",
    capacity: String(property.capacity),
    bedrooms: String(property.bedrooms),
    bathrooms: String(property.bathrooms),
    pricePerNight: String(property.price_per_night),
    status: property.status,
    amenities: property.amenities.join(", "),
    images: property.images.join(", "),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await updateProperty({
        id: property.id,
        type: f.type as PropertyRow["type"],
        name: f.name || f.nameAr,
        nameAr: f.nameAr,
        city: f.city,
        area: f.area,
        region: f.region,
        areaKey: f.areaKey || undefined,
        address: f.address || undefined,
        capacity: Number(f.capacity),
        bedrooms: Number(f.bedrooms),
        bathrooms: Number(f.bathrooms),
        pricePerNight: Number(f.pricePerNight),
        status: f.status as PropertyRow["status"],
        amenities: f.amenities.split(",").map((s) => s.trim()).filter(Boolean),
        images: f.images.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (res.ok) {
        setMsg({ ok: true, text: "تم حفظ التعديلات." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {msg && <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`} style={{ marginBottom: 8 }}>{msg.text}</div>}
      <div className={styles.formGrid}>
        <div className={styles.field}><label>الاسم (عربي)</label><input required value={f.nameAr} onChange={set("nameAr")} /></div>
        <div className={styles.field}><label>الاسم (لاتيني)</label><input value={f.name} onChange={set("name")} /></div>
        <div className={styles.field}><label>النوع</label>
          <select value={f.type} onChange={set("type")}>
            <option value="villa">فيلا</option><option value="hotel">فندق</option><option value="event">قاعة</option>
          </select>
        </div>
        <div className={styles.field}><label>الحالة</label>
          <select value={f.status} onChange={set("status")}>
            <option value="draft">مسودة</option>
            <option value="active">منشور</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
        <div className={styles.field}><label>المدينة</label><input required value={f.city} onChange={set("city")} /></div>
        <div className={styles.field}><label>المنطقة</label><input required value={f.area} onChange={set("area")} /></div>
        <div className={styles.field}><label>المحافظة</label>
          <select value={f.region} onChange={set("region")}>
            <option value="damascus-countryside">ريف دمشق</option><option value="coast">الساحل</option>
          </select>
        </div>
        <div className={styles.field}><label>مفتاح الفلترة</label><input value={f.areaKey} onChange={set("areaKey")} /></div>
        <div className={styles.field}><label>السعر / الليلة</label><input type="number" required value={f.pricePerNight} onChange={set("pricePerNight")} /></div>
        <div className={styles.field}><label>السعة</label><input type="number" required value={f.capacity} onChange={set("capacity")} /></div>
        <div className={styles.field}><label>غرف النوم</label><input type="number" required value={f.bedrooms} onChange={set("bedrooms")} /></div>
        <div className={styles.field}><label>الحمّامات</label><input type="number" required value={f.bathrooms} onChange={set("bathrooms")} /></div>
        <div className={`${styles.field} ${styles.full}`}><label>العنوان</label><input value={f.address} onChange={set("address")} /></div>
        <div className={`${styles.field} ${styles.full}`}><label>المرافق (مفصولة بفاصلة)</label><input value={f.amenities} onChange={set("amenities")} /></div>
        <div className={`${styles.field} ${styles.full}`}><label>روابط الصور (مفصولة بفاصلة)</label><input value={f.images} onChange={set("images")} /></div>
      </div>
      <div className={styles.actions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
          {pending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
        </button>
      </div>
    </form>
  );
}