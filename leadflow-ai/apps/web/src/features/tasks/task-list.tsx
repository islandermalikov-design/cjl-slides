"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useAction } from "@/hooks/use-action";
import { setTaskStatusAction } from "./actions";

export function TaskCheckbox({ id, done, disabled }: { id: string; done: boolean; disabled?: boolean }) {
  const { run, pending } = useAction();
  return (
    <Checkbox
      className="mt-0.5"
      checked={done}
      disabled={disabled || pending}
      aria-label={done ? "Вернуть в работу" : "Отметить выполненной"}
      onCheckedChange={(v) => run(() => setTaskStatusAction(id, v ? "DONE" : "TODO"), { success: v ? "Задача выполнена" : undefined })}
    />
  );
}
