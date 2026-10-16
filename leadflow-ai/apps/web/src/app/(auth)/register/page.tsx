import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/register-form";
import { getContext } from "@/server/context";

export const metadata: Metadata = { title: "Регистрация" };

export default async function RegisterPage() {
  if (await getContext()) redirect("/dashboard");
  return <RegisterForm allowed={process.env.ALLOW_SIGNUP !== "false"} />;
}
