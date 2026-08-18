"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";
import { navLinks } from "@/lib/data/navigation";
import { site } from "@/lib/data/site";
import styles from "./Header.module.css";

export function Header() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function sync(userId: string | undefined) {
      setAuthed(!!userId);
      if (!userId) {
        setIsOwner(false);
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
      setIsOwner(data?.role === "owner");
      setIsAdmin(data?.role === "admin");
    }

    supabase.auth.getUser().then(({ data }) => sync(data.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      sync(session?.user?.id),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <a href="#" className={styles.logo}>
          <span className={styles.mark} />
          {site.name}
        </a>

        <nav>
          <ul className={open ? styles.navOpen : styles.nav}>
            {navLinks.map((link) => (
              <li key={link.href + link.label}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.cta}>
          {isAdmin && (
            <Link href="/admin" className={styles.authLink}>
              الإدارة
            </Link>
          )}
          {isOwner && (
            <Link href="/owner" className={styles.authLink}>
              لوحة المالك
            </Link>
          )}
          {authed && (
            <Link href="/bookings" className={styles.authLink}>
              حجوزاتي
            </Link>
          )}
          {authed ? (
            <form action={signOut}>
              <button type="submit" className={styles.authLink}>
                تسجيل الخروج
              </button>
            </form>
          ) : (
            <Link href="/login" className={styles.authLink}>
              دخول
            </Link>
          )}
          <Button href="#cta" variant="light">
            تواصل معنا
          </Button>
        </div>

        <button
          className={styles.toggle}
          aria-label="القائمة"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
