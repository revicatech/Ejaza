"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/app/actions/auth";
import { site } from "@/lib/data/site";
import styles from "../auth.module.css";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn({ email, password });
      if (res.ok) {
        // Honor an explicit destination (e.g. back to a villa); otherwise send
        // owners/admins to their dashboard and guests to the home page.
        const roleHome =
          res.data.role === "admin" ? "/admin" : res.data.role === "owner" ? "/owner" : "/";
        router.replace(redirectTo !== "/" ? redirectTo : roleHome);
        router.refresh(); // re-render server components with the new session
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span className={styles.mark} />
          {site.name}
        </Link>
        <h1 className={styles.title}>تسجيل الدخول</h1>
        <p className={styles.sub}>سجّل دخولك لإتمام الحجز ومتابعة طلباتك.</p>

        {error && <div className={`${styles.msg} ${styles.msgErr}`}>{error}</div>}

        <form onSubmit={submit}>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className={styles.submit} type="submit" disabled={pending}>
            {pending ? "جارٍ الدخول…" : "دخول"}
          </button>
        </form>

        <p className={styles.alt}>
          ما عندك حساب؟{" "}
          <Link href={`/signup?redirect=${encodeURIComponent(redirectTo)}`}>أنشئ حساب</Link>
        </p>
      </div>
    </div>
  );
}
