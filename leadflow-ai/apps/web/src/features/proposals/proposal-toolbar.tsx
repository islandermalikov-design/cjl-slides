"use client";

import { PROPOSAL_STATUSES, PROPOSAL_STATUS_LABELS } from "@leadflow/shared";
import { FileDown, MessagesSquare, RefreshCw, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { deleteProposalAction, regenerateProposalAction, setProposalStatusAction } from "./actions";

export function ProposalToolbar({ id, companyId, status, version, canEdit, aiLive }: { id: string; companyId: string; status: string; version: number; canEdit: boolean; aiLive: boolean }) {
  const router = useRouter();
  const [regen, setRegen] = useState(false);
  const [tasks, setTasks] = useState("");
  const [facts, setFacts] = useState("");
  const [useAi, setUseAi] = useState(aiLive);
  const { run, pending } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
        <Select value={status} onValueChange={(v) => run(() => setProposalStatusAction(id, v))}>
          <SelectTrigger className="w-[150px]" aria-label="Статус КП">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROPOSAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PROPOSAL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Button variant="outline" asChild>
        <a href={`/api/proposals/${id}/pdf?v=${version}`}>
          <FileDown /> PDF
        </a>
      </Button>
      {canEdit ? (
        <>
          <Button variant="outline" asChild>
            <Link href={`/messages?compose=${companyId}&proposal=${id}`}>
              <MessagesSquare /> Подготовить сообщение
            </Link>
          </Button>
          <Button onClick={() => setRegen(true)}>
            <RefreshCw /> Перегенерировать
          </Button>
          <ConfirmDialog
            title="Удалить КП?"
            description="КП будет скрыто из списка. Версии сохранятся в экспорте данных."
            destructive
            confirmLabel="Удалить"
            onConfirm={() => run(() => deleteProposalAction(id), { onSuccess: () => router.push("/proposals"), refresh: false })}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Удалить КП">
                <Trash />
              </Button>
            }
          />
        </>
      ) : null}
      <Dialog open={regen} onOpenChange={setRegen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая версия КП</DialogTitle>
            <DialogDescription>Текущие версии сохранятся. Цены и сроки берутся из КП.</DialogDescription>
          </DialogHeader>
          <Field label="Дополнительные факты">
            <Textarea rows={3} value={facts} onChange={(e) => setFacts(e.target.value)} />
          </Field>
          <Field label="Задачи клиента">
            <Textarea rows={3} value={tasks} onChange={(e) => setTasks(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={useAi} onCheckedChange={setUseAi} disabled={!aiLive} /> Использовать Claude AI {aiLive ? "" : "(недоступно — будет шаблон)"}
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegen(false)}>
              Отмена
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() => regenerateProposalAction(id, { tasks: tasks || undefined, facts: facts || undefined, useAi }), {
                  onSuccess: (d) => {
                    setRegen(false);
                    router.push(`/proposals/${id}?v=${(d as { version: number }).version}`);
                  },
                })
              }
            >
              {pending ? "Генерация…" : "Создать версию"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
