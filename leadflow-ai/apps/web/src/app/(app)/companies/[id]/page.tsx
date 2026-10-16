import { ACTIVITY_TYPE_LABELS, MARKETPLACE_LABELS, MESSAGE_CHANNEL_LABELS, SOURCE_TYPE_LABELS, formatPhone } from "@leadflow/shared";
import { ExternalLink, FileText, Mail, MessagesSquare, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DealStatusBadge, DemoBadge, MessageStatusBadge, PriorityBadge, ProposalStatusBadge, ScoreBadge } from "@/components/common/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditCompanyButton } from "@/features/companies/add-company-button";
import { AnalyzeButton, ContactsList, EnrichButton, NextStepCard, NoteForm, ScorePanel, StatusSelect } from "@/features/companies/company-widgets";
import { NewDealButton } from "@/features/deals/deal-dialog";
import { NewTaskButton } from "@/features/tasks/task-dialog";
import { TaskCheckbox } from "@/features/tasks/task-list";
import { formatDate, formatDateTime, formatMoney, relativeTime } from "@/lib/utils";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getCompany } from "@/server/services/companies";

export const metadata: Metadata = { title: "Карточка компании" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 py-1.5 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words">{children ?? "—"}</div>
    </div>
  );
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePageContext();
  const { id } = await params;
  let company;
  try {
    company = await getCompany(ctx.organizationId, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const canEdit = hasRole(ctx.role, "MEMBER");
  const [stages, services] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({ where: { organizationId: ctx.organizationId, isActive: true }, select: { id: true, name: true, priceFrom: true } }),
  ]);
  const score = company.scores[0];
  const openTasks = company.tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
  const dealsSum = company.deals.filter((d) => d.status !== "LOST").reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight">{company.name}</h1>
            {company.isDemo ? <DemoBadge /> : null}
            <ScoreBadge score={company.aiScore} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {company.legalName ? <span>{company.legalName}</span> : null}
            {company.city ? <span>{company.city}</span> : null}
            {company.niche ? <span>{company.niche}</span> : null}
            {company.website ? (
              <a href={company.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-primary hover:underline">
                {company.website.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
              </a>
            ) : null}
            {company.tags.map((t) => (
              <Badge key={t.tagId} variant="secondary">
                {t.tag.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect companyId={company.id} status={company.crmStatus} disabled={!canEdit} />
          {canEdit ? (
            <>
              <EditCompanyButton
                initial={{
                  id: company.id,
                  name: company.name,
                  legalName: company.legalName,
                  inn: company.inn,
                  website: company.website,
                  category: company.category,
                  niche: company.niche,
                  city: company.city,
                  region: company.region,
                  marketplace: company.marketplace,
                  publicEmail: company.publicEmail,
                  publicPhone: company.publicPhone,
                  sourceUrl: company.sourceUrl,
                  notes: company.notes,
                }}
              />
              <EnrichButton companyId={company.id} disabled={!company.website} />
              <Button size="sm" variant="outline" asChild>
                <Link href={`/proposals/new?companyId=${company.id}`}>
                  <FileText /> КП
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/messages?compose=${company.id}`}>
                  <MessagesSquare /> Сообщение
                </Link>
              </Button>
              <AnalyzeButton companyId={company.id} hasScore={Boolean(score)} />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Tabs defaultValue="analysis">
            <TabsList>
              <TabsTrigger value="analysis">AI-анализ</TabsTrigger>
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="sources">Источники ({company.evidence.length})</TabsTrigger>
              <TabsTrigger value="history">История ({company.activities.length})</TabsTrigger>
              <TabsTrigger value="messages">Сообщения ({company.messages.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="analysis">
              <Card>
                <CardContent className="p-5">
                  {score ? (
                    <ScorePanel
                      score={{
                        score: score.score,
                        summary: score.summary,
                        breakdown: score.breakdown as never,
                        reasons: score.reasons as string[],
                        facts: score.facts as Array<{ statement: string; sourceUrl: string | null }>,
                        hypotheses: score.hypotheses as string[],
                        recommendations: score.recommendations as string[],
                        unknowns: score.unknowns as string[],
                        clientTasks: score.clientTasks as string[],
                        recommendedProduct: score.recommendedProduct,
                        recommendedTier: score.recommendedTier,
                        generatedBy: score.generatedBy,
                        model: score.model,
                        createdAt: score.createdAt.toISOString(),
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <div className="text-sm text-muted-foreground">Компания ещё не анализировалась.</div>
                      {canEdit ? <AnalyzeButton companyId={company.id} hasScore={false} size="default" /> : null}
                    </div>
                  )}
                  {company.scores.length > 1 ? (
                    <div className="mt-5 border-t pt-3 text-xs text-muted-foreground">
                      История оценок: {company.scores.map((s) => `${s.score} (${formatDate(s.createdAt)})`).join(" → ")}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="info">
              <Card>
                <CardContent className="grid gap-x-8 p-5 md:grid-cols-2">
                  <div>
                    <Row label="Название">{company.name}</Row>
                    <Row label="Юр. название">{company.legalName}</Row>
                    <Row label="ИНН">{company.inn}</Row>
                    <Row label="Категория">{company.category}</Row>
                    <Row label="Ниша">{company.niche}</Row>
                    <Row label="Площадка">{company.marketplace === "NONE" ? null : MARKETPLACE_LABELS[company.marketplace]}</Row>
                  </div>
                  <div>
                    <Row label="Город">{company.city}</Row>
                    <Row label="Регион">{company.region}</Row>
                    <Row label="Email">{company.publicEmail ? <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{company.publicEmail}</span> : null}</Row>
                    <Row label="Телефон">{company.publicPhone ? <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{formatPhone(company.publicPhone)}</span> : null}</Row>
                    <Row label="Источник">
                      {company.sourceUrl ? (
                        <a href={company.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">
                          {company.sourceUrl}
                        </a>
                      ) : null}
                    </Row>
                    <Row label="Проверено">{company.verifiedAt ? formatDate(company.verifiedAt) : null}</Row>
                    <Row label="Добавлено">{`${formatDate(company.createdAt)} · ${SOURCE_TYPE_LABELS[company.sourceType]}`}</Row>
                  </div>
                  {company.notes ? (
                    <div className="mt-3 rounded-[10px] bg-muted/60 p-3 text-sm whitespace-pre-wrap md:col-span-2">{company.notes}</div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="sources">
              <Card>
                <CardContent className="p-5">
                  {company.evidence.length === 0 ? <div className="text-sm text-muted-foreground">Подтверждающих данных пока нет. Используйте «Обогатить с сайта» или укажите источник вручную.</div> : null}
                  <div className="flex flex-col divide-y">
                    {company.evidence.map((e) => (
                      <div key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={e.kind === "CONTACT" ? "default" : e.kind === "SIGNAL" ? "warning" : "secondary"}>{e.kind === "CONTACT" ? "Контакт" : e.kind === "SIGNAL" ? "Сигнал" : "Факт"}</Badge>
                            <span className="text-xs text-muted-foreground">{e.field}</span>
                            {e.isDemo ? <DemoBadge /> : null}
                          </div>
                          <div className="mt-1">{e.value}</div>
                          {e.snippet ? <div className="mt-0.5 text-xs text-muted-foreground">«{e.snippet}»</div> : null}
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          {e.url ? (
                            <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-primary hover:underline">
                              источник <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                          <div>{formatDate(e.capturedAt)}</div>
                          {e.source ? <div>{e.source.name}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardContent className="flex flex-col gap-4 p-5">
                  {canEdit ? <NoteForm companyId={company.id} /> : null}
                  <ol className="relative flex flex-col gap-3 border-l pl-4">
                    {company.activities.map((a) => (
                      <li key={a.id} className="relative">
                        <span className="absolute top-1.5 -left-[21px] size-2 rounded-full border-2 border-card bg-primary" />
                        <div className="text-sm font-medium">{a.title}</div>
                        {a.body ? <div className="mt-0.5 text-[13px] whitespace-pre-wrap text-muted-foreground">{a.body}</div> : null}
                        <div className="text-xs text-muted-foreground">
                          {ACTIVITY_TYPE_LABELS[a.type]} · {a.user?.name ?? "Система"} · {formatDateTime(a.createdAt)}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="messages">
              <Card>
                <CardContent className="flex flex-col gap-3 p-5">
                  {company.messages.length === 0 ? <div className="text-sm text-muted-foreground">Переписки пока нет</div> : null}
                  {company.messages.map((m) => (
                    <div key={m.id} className={`max-w-[85%] rounded-[12px] border p-3 text-sm ${m.direction === "INBOUND" ? "self-start bg-muted/50" : "self-end bg-accent/60"}`}>
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{m.direction === "INBOUND" ? "Входящее" : "Исходящее"}</span>
                        <span>· {MESSAGE_CHANNEL_LABELS[m.channel]}</span>
                        <span>· {formatDateTime(m.createdAt)}</span>
                        {m.isSimulated ? <Badge variant="demo">симуляция</Badge> : null}
                      </div>
                      {m.subject ? <div className="font-medium">{m.subject}</div> : null}
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </div>
                  ))}
                  {company.drafts.length ? (
                    <div className="mt-2 border-t pt-3">
                      <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Черновики и статусы</div>
                      {company.drafts.map((d) => (
                        <Link key={d.id} href={`/messages?draft=${d.id}`} className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-sm hover:bg-muted/60">
                          <span className="truncate">{d.subject ?? d.body.slice(0, 60)}</span>
                          <MessageStatusBadge status={d.status} />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Следующий шаг</CardTitle>
            </CardHeader>
            <CardContent>
              <NextStepCard companyId={company.id} nextStep={company.nextStep} nextStepAt={company.nextStepAt?.toISOString() ?? null} disabled={!canEdit} />
              {company.lastContactedAt ? <div className="mt-3 text-xs text-muted-foreground">Последний контакт: {relativeTime(company.lastContactedAt)}</div> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Контакты</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactsList
                companyId={company.id}
                canEdit={canEdit}
                contacts={company.contacts.map((c) => ({
                  id: c.id,
                  fullName: c.fullName,
                  position: c.position,
                  email: c.email,
                  phone: c.phone,
                  isPublicBusiness: c.isPublicBusiness,
                  sourceUrl: c.sourceUrl,
                  verifiedAt: c.verifiedAt?.toISOString() ?? null,
                  notes: c.notes,
                }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Задачи ({openTasks.length})</CardTitle>
              {canEdit ? <NewTaskButton companyId={company.id} /> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {company.tasks.length === 0 ? <div className="text-sm text-muted-foreground">Задач нет</div> : null}
              {company.tasks.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-start gap-2.5 text-sm">
                  <TaskCheckbox id={t.id} done={t.status === "DONE"} disabled={!canEdit} />
                  <div className="min-w-0 flex-1">
                    <div className={t.status === "DONE" ? "text-muted-foreground line-through" : ""}>{t.title}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {t.dueAt ? <span className={t.dueAt < new Date() && t.status !== "DONE" ? "text-destructive" : ""}>{formatDateTime(t.dueAt)}</span> : "Без срока"}
                      <PriorityBadge priority={t.priority} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Сделки · {formatMoney(dealsSum)}</CardTitle>
              {canEdit ? <NewDealButton companyId={company.id} options={{ stages, services }} /> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {company.deals.length === 0 ? <div className="text-sm text-muted-foreground">Сделок нет</div> : null}
              {company.deals.map((d) => (
                <Link key={d.id} href={`/deals?highlight=${d.id}`} className="flex items-center justify-between gap-2 rounded-[10px] border p-2.5 text-sm hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.stage?.name ?? "Без этапа"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium tabular-nums">{formatMoney(Number(d.amount))}</div>
                    <DealStatusBadge status={d.status} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Коммерческие предложения</CardTitle>
              {canEdit ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/proposals/new?companyId=${company.id}`}>+ КП</Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {company.proposals.length === 0 ? <div className="text-sm text-muted-foreground">КП ещё не создавались</div> : null}
              {company.proposals.map((p) => (
                <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center justify-between gap-2 rounded-[10px] border p-2.5 text-sm hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      v{p.currentVersion} · {formatMoney(p.totalPrice)}
                    </div>
                  </div>
                  <ProposalStatusBadge status={p.status} />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
