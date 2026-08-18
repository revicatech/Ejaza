import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول — إجازة" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  // Only allow same-site relative redirects (no open-redirect to other hosts).
  const safe = redirect && redirect.startsWith("/") ? redirect : "/";
  return <LoginForm redirectTo={safe} />;
}
