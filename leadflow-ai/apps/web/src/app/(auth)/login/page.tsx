import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { getContext } from "@/server/context";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage() {
  if (await getContext()) redirect("/dashboard");
  return <LoginForm demoHint={process.env.DEMO_MODE === "true"} />;
}
