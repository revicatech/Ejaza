import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAllUsers } from "@/lib/api/admin";
import { getInvoices } from "@/lib/api/invoices";
import { formatArabicNumber } from "@/lib/format";
import { PageBar } from "@/components/layout/PageBar";
import { CreateOwnerForm } from "./CreateOwnerForm";
import { UsersTable } from "./UsersTable";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "لوحة الإدارة — إجازة" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return (
      <div className={styles.page}>
        <PageBar backHref="/" backLabel="الرئيسية" />
        <div className={styles.container}>
          <div className={styles.card} style={{ marginTop: "3rem", textAlign: "center" }}>
            <h2>غير مصرّح</h2>
            <p>هذه الصفحة مخصّصة لمدير المنصة فقط.</p>
            <Link className={styles.btn} href="/">العودة للرئيسية</Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin RLS lets the session client read everything.
  const [users, invoices, { data: props }] = await Promise.all([
    listAllUsers(),
    getInvoices(),
    supabase.from("properties").select("id,status"),
  ]);

  const owners = users.filter((u) => u.role === "owner").length;
  const totalProps = props?.length ?? 0;
  const activeProps = (props ?? []).filter((p) => p.status === "active").length;
  const nonCancelled = invoices.filter((i) => i.status !== "cancelled");
  const commission = nonCancelled.reduce((s, i) => s + Number(i.platform_fee), 0);

  return (
    <div className={styles.page}>
      <PageBar backHref="/" backLabel="الرئيسية" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>لوحة الإدارة</h1>
          <p>إدارة المستخدمين والمُلّاك ومتابعة المنصة.</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}><div className={styles.statVal}>{formatArabicNumber(users.length)}</div><div className={styles.statLabel}>المستخدمون</div></div>
          <div className={styles.stat}><div className={styles.statVal}>{formatArabicNumber(owners)}</div><div className={styles.statLabel}>المُلّاك</div></div>
          <div className={styles.stat}><div className={styles.statVal}>{formatArabicNumber(activeProps)}/{formatArabicNumber(totalProps)}</div><div className={styles.statLabel}>عقارات منشورة / الكل</div></div>
          <div className={styles.stat}><div className={styles.statVal}>{formatArabicNumber(nonCancelled.length)}</div><div className={styles.statLabel}>الحجوزات</div></div>
          <div className={styles.stat}><div className={styles.statVal}>{formatArabicNumber(commission)}</div><div className={styles.statLabel}>عمولة المنصة (ل.س)</div></div>
        </div>

        <section className={styles.section}>
          <h2>إضافة حساب مالك</h2>
          <CreateOwnerForm />
        </section>

        <section className={styles.section}>
          <h2>المستخدمون</h2>
          <UsersTable users={users} currentUserId={user.id} />
        </section>
      </div>
    </div>
  );
}