import type { Metadata } from "next";
import { MessagesSquare, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { DraftPanel } from "@/features/outreach/draft-panel";
import { ComposeLauncher, DraftList, StatusTabs } from "@/features/outreach/messages-client";
import { MESSAGE_STATUSES } from "@leadflow/shared";
import type { MessageStatus } from "@/generated/prisma/client";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { deliveryModeFor, getDraft, listDrafts } from "@/server/services/outreach";

export const metadata: Metadata = { title: "Сообщения" };

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const statusParam = sp(params, "status");
  const status = statusParam && (MESSAGE_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as MessageStatus) : undefined;
  const canEdit = hasRole(ctx.role, "MEMBER");
  const [drafts, groups, companies] = await Promise.all([
    listDrafts(ctx.organizationId, { status }),
    prisma.messageDraft.groupBy({ by: ["status"], where: { organizationId: ctx.organizationId }, _count: true }),
    prisma.company.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null, crmStatus: { not: "DO_NOT_CONTACT" } }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 }),
  ]);
  const selectedId = sp(params, "draft") ?? drafts[0]?.id;
  const selected = selectedId ? await getDraft(ctx.organizationId, selectedId).catch(() => null) : null;
  const deliveryMode = selected ? await deliveryModeFor(ctx.organizationId, selected.channel) : "simulated";

  const composeId = sp(params, "compose");
  const composeCompany = composeId && canEdit
    ? await prisma.company.findFirst({
        where: { id: composeId, organizationId: ctx.organizationId, deletedAt: null },
        include: { contacts: { where: { deletedAt: null } } },
      })
    : null;
  const proposalId = sp(params, "proposal");
  const proposal = proposalId ? await prisma.proposal.findFirst({ where: { id: proposalId, organizationId: ctx.organizationId }, select: { id: true } }) : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Сообщения"
        description="Каждое сообщение проходит проверку и согласование. Массовая и автоматическая отправка отключена."
        actions={canEdit ? (
          <ComposeLauncher
            companies={companies}
            target={
              composeCompany
                ? {
                    company: { id: composeCompany.id, name: composeCompany.name, publicEmail: composeCompany.publicEmail, publicPhone: composeCompany.publicPhone },
                    contacts: composeCompany.contacts.map((c) => ({ id: c.id, fullName: c.fullName, email: c.email, phone: c.phone, isPublicBusiness: c.isPublicBusiness })),
                    proposalId: proposal?.id ?? null,
                  }
                : null
            }
          />
        ) : null}
      />
      {process.env.DEMO_MODE === "true" ? (
        <Alert variant="warning">
          <ShieldCheck />
          <AlertDescription>DEMO_MODE: отправка только симулируется — сообщения не покидают систему.</AlertDescription>
        </Alert>
      ) : null}
      <StatusTabs counts={Object.fromEntries(groups.map((g) => [g.status, g._count]))} />
      {drafts.length === 0 && !selected ? (
        <EmptyState icon={MessagesSquare} title="Сообщений нет" description="Создайте черновик из карточки компании или КП." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Card className="max-h-[calc(100vh-260px)] overflow-y-auto lg:sticky lg:top-20">
            <DraftList
              selectedId={selected?.id}
              items={drafts.map((d) => ({ id: d.id, status: d.status, subject: d.subject, body: d.body, recipient: d.recipient, updatedAt: d.updatedAt.toISOString(), company: d.company }))}
            />
          </Card>
          <div>
            {selected ? (
              <DraftPanel
                key={`${selected.id}-${selected.updatedAt.toISOString()}`}
                canEdit={canEdit}
                deliveryMode={deliveryMode}
                draft={{
                  id: selected.id,
                  status: selected.status,
                  channel: selected.channel,
                  recipient: selected.recipient,
                  subject: selected.subject,
                  body: selected.body,
                  legalBasis: selected.legalBasis,
                  isFirstContact: selected.isFirstContact,
                  generatedBy: selected.generatedBy,
                  reviewNote: selected.reviewNote,
                  reviewedBy: selected.reviewedBy?.name ?? null,
                  createdBy: selected.createdBy?.name ?? null,
                  approvedAt: selected.approvedAt?.toISOString() ?? null,
                  sentAt: selected.sentAt?.toISOString() ?? null,
                  lastError: selected.lastError,
                  isDemo: selected.isDemo,
                  company: { id: selected.company.id, name: selected.company.name },
                  contactName: selected.contact?.fullName ?? null,
                  messages: selected.messages.map((m) => ({ id: m.id, direction: m.direction, body: m.body, subject: m.subject, status: m.status, isSimulated: m.isSimulated, createdAt: m.createdAt.toISOString(), error: m.error })),
                }}
              />
            ) : (
              <EmptyState icon={MessagesSquare} title="Выберите сообщение" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
