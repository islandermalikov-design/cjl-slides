import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-5xl font-semibold tracking-tight text-muted-foreground/40">404</div>
      <h1 className="text-lg font-semibold">Страница не найдена</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Запись могла быть удалена, или у вас нет к ней доступа.</p>
      <Button asChild className="mt-2">
        <Link href="/dashboard">На главную</Link>
      </Button>
    </div>
  );
}
