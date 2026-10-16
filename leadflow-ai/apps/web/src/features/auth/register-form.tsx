"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function RegisterForm({ allowed }: { allowed: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      return;
    }
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      setError(error.code === "USER_ALREADY_EXISTS" || error.status === 422 ? "Пользователь с таким email уже существует" : error.message ?? "Не удалось зарегистрироваться");
      return;
    }
    toast.success("Аккаунт создан");
    router.push("/dashboard");
    router.refresh();
  }

  if (!allowed) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Регистрация закрыта</h1>
        <p className="mt-2 text-sm text-muted-foreground">Обратитесь к администратору рабочего пространства.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Вернуться ко входу
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Регистрация</h1>
        <p className="mt-1 text-sm text-muted-foreground">Будет создано личное рабочее пространство</p>
      </div>
      <Field label="Имя" htmlFor="name">
        <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Пароль" htmlFor="password" hint="Минимум 8 символов">
        <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button type="submit" disabled={loading} size="lg">
        {loading ? "Создание…" : "Создать аккаунт"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
