"use client";

import { MEMBER_ROLES, MEMBER_ROLE_LABELS, SERVICE_TIERS, SERVICE_TIER_LABELS, type MemberRoleValue, type ServiceTierValue } from "@leadflow/shared";
import { Download, Pencil, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { formatDate, formatMoney } from "@/lib/utils";
import {
  addMemberAction,
  addSuppressionAction,
  changeRoleAction,
  deleteOrganizationAction,
  purgeDemoAction,
  removeMemberAction,
  removeSuppressionAction,
  saveAiBudgetAction,
  saveOutreachSettingsAction,
  saveSenderProfileAction,
  updateOrganizationAction,
  upsertServiceAction,
} from "./actions";

export function SenderProfileForm({ initial, disabled }: { initial: Record<string, string>; disabled: boolean }) {
  const [v, setV] = useState(initial);
  const { run, pending } = useAction();
  const f = (k: string, label: string, opts: { area?: boolean; hint?: string; span?: boolean } = {}) => (
    <Field label={label} hint={opts.hint} className={opts.span ? "sm:col-span-2" : ""}>
      {opts.area ? (
        <Textarea rows={3} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} disabled={disabled} />
      ) : (
        <Input value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} disabled={disabled} />
      )}
    </Field>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Профиль отправителя</CardTitle>
        <CardDescription>Используется в КП, подписях и сообщениях. AI не меняет эти данные.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {f("name", "Имя")}
        {f("company", "Компания / бренд")}
        {f("email", "Email")}
        {f("phone", "Телефон")}
        {f("website", "Сайт или портфолио", { span: true })}
        {f("signature", "Подпись", { area: true, span: true })}
        {f("portfolio", "Реальные примеры работ", { area: true, span: true, hint: "Только реальные проекты — используются в КП как есть, AI не придумывает кейсы" })}
        {!disabled ? (
          <div className="sm:col-span-2">
            <Button disabled={pending} onClick={() => run(() => saveSenderProfileAction(v))}>
              Сохранить
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export interface ServiceRow {
  id: string;
  name: string;
  description: string;
  tier: ServiceTierValue;
  priceFrom: number;
  priceTo: number | null;
  durationDays: number;
  features: string[];
  isActive: boolean;
}

function ServiceDialog({ initial, onClose }: { initial?: ServiceRow; onClose: () => void }) {
  const [v, setV] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    tier: initial?.tier ?? ("CUSTOM" as ServiceTierValue),
    priceFrom: String(initial?.priceFrom ?? ""),
    priceTo: initial?.priceTo !== null && initial?.priceTo !== undefined ? String(initial.priceTo) : "",
    durationDays: String(initial?.durationDays ?? 7),
    features: (initial?.features ?? []).join("\n"),
    isActive: initial?.isActive ?? true,
  });
  const { run, pending } = useAction();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Услуга" : "Новая услуга"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Название" className="sm:col-span-2">
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label="Пакет">
            <Select value={v.tier} onValueChange={(t) => setV({ ...v, tier: t as ServiceTierValue })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {SERVICE_TIER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Срок, дней">
            <Input value={v.durationDays} onChange={(e) => setV({ ...v, durationDays: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Цена от, ₽">
            <Input value={v.priceFrom} onChange={(e) => setV({ ...v, priceFrom: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Цена до, ₽" hint="Пусто — «от»">
            <Input value={v.priceTo} onChange={(e) => setV({ ...v, priceTo: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Описание" className="sm:col-span-2">
            <Textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
          </Field>
          <Field label="Возможности (по одной на строку)" className="sm:col-span-2">
            <Textarea rows={4} value={v.features} onChange={(e) => setV({ ...v, features: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={v.isActive} onCheckedChange={(c) => setV({ ...v, isActive: c })} /> Активна
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={pending || !v.name || !v.priceFrom}
            onClick={() =>
              run(
                () =>
                  upsertServiceAction(
                    {
                      name: v.name,
                      description: v.description,
                      tier: v.tier,
                      priceFrom: Number(v.priceFrom),
                      priceTo: v.priceTo ? Number(v.priceTo) : null,
                      durationDays: Number(v.durationDays) || 1,
                      features: v.features.split("\n").map((s) => s.trim()).filter(Boolean),
                      isActive: v.isActive,
                    },
                    initial?.id,
                  ),
                { onSuccess: onClose },
              )
            }
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ServicesCatalog({ services, canAdmin }: { services: ServiceRow[]; canAdmin: boolean }) {
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Каталог услуг и цены</CardTitle>
          <CardDescription>Ориентиры цен используются в КП и сделках. Цены редактируемые.</CardDescription>
        </div>
        {canAdmin ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> Услуга
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className="flex flex-col gap-2 rounded-[12px] border p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="violet">{SERVICE_TIER_LABELS[s.tier]}</Badge>
              {!s.isActive ? <Badge variant="secondary">неактивна</Badge> : null}
            </div>
            <div className="font-medium">{s.name}</div>
            <div className="text-[13px] text-muted-foreground">{s.description}</div>
            <div className="text-lg font-semibold tabular-nums">{s.priceTo ? `${formatMoney(s.priceFrom)} – ${formatMoney(s.priceTo)}` : `от ${formatMoney(s.priceFrom)}`}</div>
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {s.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            {canAdmin ? (
              <Button size="sm" variant="outline" className="mt-auto self-start" onClick={() => setEditing(s)}>
                <Pencil /> Изменить
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
      {creating ? <ServiceDialog onClose={() => setCreating(false)} /> : null}
      {editing ? <ServiceDialog initial={editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}

export interface MemberRow {
  id: string;
  role: MemberRoleValue;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

export function TeamCard({ orgName, members, currentUserId, myRole }: { orgName: string; members: MemberRow[]; currentUserId: string; myRole: MemberRoleValue }) {
  const [name, setName] = useState(orgName);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRoleValue>("MEMBER");
  const { run, pending } = useAction();
  const isAdmin = myRole === "OWNER" || myRole === "ADMIN";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Организация и команда</CardTitle>
        <CardDescription>Роли: владелец — всё; администратор — настройки, интеграции, удаление; менеджер — работа с клиентами; наблюдатель — только просмотр.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Название организации" className="flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
          </Field>
          {isAdmin ? (
            <Button variant="outline" disabled={pending || name === orgName} onClick={() => run(() => updateOrganizationAction(name))}>
              Сохранить
            </Button>
          ) : null}
        </div>
        <div className="divide-y rounded-[12px] border">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <Avatar name={m.user.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {m.user.name} {m.user.id === currentUserId ? <span className="text-muted-foreground">(вы)</span> : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.user.email} · с {formatDate(m.createdAt)}
                </div>
              </div>
              {myRole === "OWNER" ? (
                <Select value={m.role} onValueChange={(r) => run(() => changeRoleAction(m.id, r))}>
                  <SelectTrigger size="sm" className="w-[160px]" aria-label={`Роль ${m.user.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {MEMBER_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{MEMBER_ROLE_LABELS[m.role]}</Badge>
              )}
              {isAdmin && m.user.id !== currentUserId ? (
                <ConfirmDialog
                  title={`Удалить ${m.user.name} из организации?`}
                  destructive
                  confirmLabel="Удалить"
                  onConfirm={() => run(() => removeMemberAction(m.id))}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Удалить участника">
                      <Trash />
                    </Button>
                  }
                />
              ) : null}
            </div>
          ))}
        </div>
        {isAdmin ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="Добавить пользователя по email" className="flex-1" hint="Пользователь должен быть зарегистрирован">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Select value={role} onValueChange={(r) => setRole(r as MemberRoleValue)}>
              <SelectTrigger className="sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEMBER_ROLES.filter((r) => r !== "OWNER" || myRole === "OWNER").map((r) => (
                  <SelectItem key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={pending || !email} onClick={() => run(() => addMemberAction(email, role), { onSuccess: () => setEmail("") })}>
              Добавить
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LimitsCard({ budget, outreach, canAdmin }: { budget: number; outreach: { dailyLimit: number; requireReviewForFollowUps: boolean; unsubscribeText: string }; canAdmin: boolean }) {
  const [b, setB] = useState(String(budget));
  const [o, setO] = useState(outreach);
  const { run, pending } = useAction();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Лимиты и правила</CardTitle>
        <CardDescription>Контроль расходов на AI и ограничения коммуникаций.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Месячный лимит расходов на AI, $" hint="0 — без ограничения. При достижении лимита AI-функции блокируются.">
          <div className="flex gap-2">
            <Input value={b} onChange={(e) => setB(e.target.value.replace(/[^\d.]/g, ""))} disabled={!canAdmin} />
            {canAdmin ? (
              <Button variant="outline" disabled={pending} onClick={() => run(() => saveAiBudgetAction(Number(b)))}>
                OK
              </Button>
            ) : null}
          </div>
        </Field>
        <Field label="Лимит отправок в сутки" hint="Защита от массовых рассылок">
          <Input value={String(o.dailyLimit)} onChange={(e) => setO({ ...o, dailyLimit: Number(e.target.value.replace(/\D/g, "")) || 1 })} disabled={!canAdmin} />
        </Field>
        <Field label="Строка об отказе от сообщений (добавляется к email)" className="sm:col-span-2">
          <Input value={o.unsubscribeText} onChange={(e) => setO({ ...o, unsubscribeText: e.target.value })} disabled={!canAdmin} />
        </Field>
        {canAdmin ? (
          <div className="sm:col-span-2">
            <Button disabled={pending} onClick={() => run(() => saveOutreachSettingsAction(o))}>
              Сохранить правила
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SuppressionCard({ entries, canEdit, canAdmin }: { entries: Array<{ id: string; value: string; kind: string; reason: string | null; source: string; createdAt: string }>; canEdit: boolean; canAdmin: boolean }) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const { run, pending } = useAction();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Список исключений (suppression list)</CardTitle>
        <CardDescription>Адресаты, которым запрещено отправлять сообщения: отписки, отказы, «не связываться». Можно указать email, телефон или домен.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="email, телефон или домен" />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина" />
            <Button disabled={pending || !value.trim()} onClick={() => run(() => addSuppressionAction(value, reason), { onSuccess: () => { setValue(""); setReason(""); } })}>
              Добавить
            </Button>
          </div>
        ) : null}
        <div className="max-h-80 divide-y overflow-y-auto rounded-[12px] border">
          {entries.length === 0 ? <div className="p-4 text-sm text-muted-foreground">Список пуст</div> : null}
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Badge variant="secondary">{e.kind}</Badge>
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{e.value}</span>
              <span className="hidden truncate text-xs text-muted-foreground sm:block">
                {e.reason ?? "—"} · {e.source} · {formatDate(e.createdAt)}
              </span>
              {canAdmin ? (
                <Button variant="ghost" size="icon-sm" aria-label="Удалить из списка" onClick={() => run(() => removeSuppressionAction(e.id))}>
                  <Trash />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DataCard({ orgName, isOwner, canAdmin }: { orgName: string; isOwner: boolean; canAdmin: boolean }) {
  const [confirm, setConfirm] = useState("");
  const { run, pending } = useAction();
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Данные</CardTitle>
        <CardDescription>Экспорт и удаление данных организации. Резервное копирование БД — scripts/backup.sh (см. docs/deployment.md).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href="/api/export">
                <Download /> Экспорт всех данных (JSON)
              </a>
            </Button>
            <ConfirmDialog
              title="Удалить все DEMO-данные?"
              description="Будут удалены компании, контакты, сделки, КП и сообщения с пометкой DEMO. Ваши реальные данные не затрагиваются."
              destructive
              confirmLabel="Удалить DEMO-данные"
              onConfirm={() => run(() => purgeDemoAction())}
              trigger={<Button variant="outline">Удалить DEMO-данные</Button>}
            />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Экспорт доступен администраторам.</div>
        )}
        {isOwner ? (
          <div className="rounded-[12px] border border-red-200 p-4 dark:border-red-500/30">
            <div className="font-medium text-destructive">Удаление организации</div>
            <div className="mt-1 text-[13px] text-muted-foreground">Безвозвратно удаляет все данные организации. Введите название «{orgName}» для подтверждения.</div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={orgName} />
              <Button variant="destructive" disabled={pending || confirm !== orgName} onClick={() => run(() => deleteOrganizationAction(confirm), { onSuccess: () => router.push("/login"), refresh: false })}>
                Удалить навсегда
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
