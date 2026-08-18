"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/app/actions/auth";
import { site } from "@/lib/data/site";
import styles from "../auth.module.css";

export function SignupForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "confirm">(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signUp({ fullName, phone: phone || undefined, email, password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.data.needsConfirmation) {
        // Email confirmation is enabled — the user must verify before signing in.
        setDone("confirm");
        return;
      }
      // Confirmation disabled → a session already exists; go straight in.
      const login = await signIn({ email, password });
      if (login.ok) {
        router.replace(redirectTo);
        router.refresh();
      } else {
        setDone("confirm");
      }
    });
  }

  if (done === "confirm") {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <Link href="/" className={styles.logo}>
            <span className={styles.mark} />
            {site.name}
          </Link>
          <h1 className={styles.title}>تأكيد البريد الإلكتروني</h1>
          <div className={`${styles.msg} ${styles.msgOk}`}>
            أرسلنا رابط تأكيد إلى <strong>{email}</strong>. افتح الرابط لتفعيل حسابك ثم سجّل الدخول.
          </div>
          <p className={styles.alt}>
            <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>الذهاب لتسجيل الدخول</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span className={styles.mark} />
          {site.name}
        </Link>
        <h1 className={styles.title}>إنشاء حساب</h1>
        <p className={styles.sub}>أنشئ حسابك لتحجز الفلل وتتابع طلباتك.</p>

        {error && <div className={`${styles.msg} ${styles.msgErr}`}>{error}</div>}

        <form onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="fullName">الاسم الكامل</label>
            <input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="phone">رقم الهاتف (اختياري)</label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="9639XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className={styles.hint}>8 أحرف على الأقل، وتحتوي على حرف كبير وصغير ورقم.</span>
          </div>
          <button className={styles.submit} type="submit" disabled={pending}>
            {pending ? "جارٍ الإنشاء…" : "إنشاء حساب"}
          </button>
        </form>

        <p className={styles.alt}>
          عندك حساب؟{" "}
          <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>سجّل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
