"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOwner } from "./actions";
import styles from "./admin.module.css";

export function CreateOwnerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState({ fullName: "", phone: "", email: "", password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createOwner({
        fullName: f.fullName,
        phone: f.phone || undefined,
        email: f.email,
        password: f.password,
      });
      if (res.ok) {
        setMsg({ ok: true, text: `تم إنشاء حساب المالك (${f.email}). سلّمه البريد وكلمة المرور.` });
        setF({ fullName: "", phone: "", email: "", password: "" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <form className={styles.card} onSubmit={submit}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label>الاسم الكامل</label>
          <input required value={f.fullName} onChange={set("fullName")} />
        </div>
        <div className={styles.field}>
          <label>الهاتف (اختياري)</label>
          <input type="tel" value={f.phone} onChange={set("phone")} placeholder="9639XXXXXXXX" />
        </div>
        <div className={styles.field}>
          <label>البريد الإلكتروني</label>
          <input type="email" required value={f.email} onChange={set("email")} />
        </div>
        <div className={styles.field}>
          <label>كلمة مرور مبدئية</label>
          <input type="text" required value={f.password} onChange={set("password")} />
          <span className={styles.hint}>8 أحرف+، حرف كبير وصغير ورقم. يسلّمها المالك ويغيّرها لاحقاً.</span>
        </div>
      </div>
      <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
          {pending ? "جارٍ الإنشاء…" : "إنشاء حساب مالك"}
        </button>
      </div>
      {msg && <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>}
    </form>
  );
}