import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "إنشاء حساب — إجازة" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const safe = redirect && redirect.startsWith("/") ? redirect : "/";
  return <SignupForm redirectTo={safe} />;
}
