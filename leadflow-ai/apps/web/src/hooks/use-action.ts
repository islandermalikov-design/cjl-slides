"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/errors";

/** Вызывает server action, показывает toast с результатом и обновляет данные страницы. */
export function useAction() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, opts: { success?: string; onSuccess?: (data: T) => void; refresh?: boolean } = {}) =>
      new Promise<ActionResult<T>>((resolve) => {
        start(async () => {
          try {
            const res = await fn();
            if (res.ok) {
              const msg = opts.success ?? res.message;
              if (msg) toast.success(msg);
              opts.onSuccess?.(res.data);
              if (opts.refresh !== false) router.refresh();
            } else {
              toast.error(res.error);
            }
            resolve(res);
          } catch {
            toast.error("Нет соединения с сервером");
            resolve({ ok: false, error: "Нет соединения с сервером" });
          }
        });
      }),
    [router],
  );
  return { run, pending };
}
