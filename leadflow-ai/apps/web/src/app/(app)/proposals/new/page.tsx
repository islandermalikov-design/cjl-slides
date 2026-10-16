import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { NewProposalSection } from "@/features/proposals/new-proposal-section";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";

export const metadata: Metadata = { title: "Новое КП" };

export default async function NewProposalPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  if (!hasRole(ctx.role, "MEMBER")) redirect("/proposals");
  const params = await searchParams;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Новое коммерческое предложение" description="Выберите компанию и услуги из каталога. Цены редактируются в настройках каталога." />
      <NewProposalSection organizationId={ctx.organizationId} companyId={sp(params, "companyId")} />
    </div>
  );
}
