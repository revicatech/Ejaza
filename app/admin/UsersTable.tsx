"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserRole } from "./actions";
import type { AdminUser } from "@/lib/api/admin";
import type { UserRole } from "@/lib/supabase/database.types";
import styles from "./admin.module.css";

const roleBadge: Record<UserRole, { label: string; cls: string }> = {
  admin: { label: "مدير", cls: styles.bAdmin },
  owner: { label: "مالك", cls: styles.bOwner },
  guest: { label: "ضيف", cls: styles.bGuest },
};

export function UsersTable({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function change(userId: string, role: UserRole) {
    setBusyId(userId);
    setErr(null);
    startTransition(async () => {
      const res = await setUserRole({ userId, role });
      setBusyId(null);
      if (res.ok) router.refresh();
      else setErr(res.error);
    });
  }

  return (
    <>
      {err && <div className={`${styles.msg} ${styles.msgErr}`}>{err}</div>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الهاتف</th>
              <th>الدور</th>
              <th>تغيير الدور</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const b = roleBadge[u.role];
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id}>
                  <td>{u.full_name || "—"}</td>
                  <td>{u.email ?? "—"}</td>
                  <td>{u.phone ?? "—"}</td>
                  <td><span className={`${styles.badge} ${b.cls}`}>{b.label}</span></td>
                  <td>
                    {isSelf ? (
                      <span className={styles.self}>أنت</span>
                    ) : (
                      <select
                        className={styles.roleSelect}
                        value={u.role}
                        disabled={pending && busyId === u.id}
                        onChange={(e) => change(u.id, e.target.value as UserRole)}
                      >
                        <option value="guest">ضيف</option>
                        <option value="owner">مالك</option>
                        <option value="admin">مدير</option>
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}