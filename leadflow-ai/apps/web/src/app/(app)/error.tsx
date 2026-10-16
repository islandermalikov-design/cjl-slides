"use client";

import { ErrorState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Произошла ошибка"
      description={error.digest ? `Код ошибки: ${error.digest}. Подробности записаны в лог сервера.` : "Попробуйте повторить действие."}
      action={<Button onClick={() => reset()}>Повторить</Button>}
    />
  );
}
