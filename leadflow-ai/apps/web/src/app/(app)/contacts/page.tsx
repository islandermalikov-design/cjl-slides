import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Card } from "@/components/ui/card";
import { ContactsSearch, ContactsTable } from "@/features/contacts/contacts-client";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { ContactListQuerySchema, listContacts } from "@/server/services/contacts";

export const metadata: Metadata = { title: "Контакты" };

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const query = ContactListQuerySchema.parse({ q: sp(params, "q"), page: sp(params, "page"), hasEmail: sp(params, "hasEmail") });
  const { items, total } = await listContacts(ctx.organizationId, query);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Контакты" description="Деловые контакты компаний. Каждый контакт должен иметь ссылку на источник, где он опубликован. Добавление — в карточке компании." />
      <ContactsSearch />
      {items.length === 0 ? (
        <EmptyState icon={Users} title="Контактов нет" description="Откройте карточку компании и добавьте опубликованный деловой контакт с указанием источника." />
      ) : (
        <Card className="overflow-hidden">
          <ContactsTable
            canEdit={hasRole(ctx.role, "MEMBER")}
            rows={items.map((c) => ({
              id: c.id,
              fullName: c.fullName,
              position: c.position,
              email: c.email,
              phone: c.phone,
              isPublicBusiness: c.isPublicBusiness,
              sourceUrl: c.sourceUrl,
              verifiedAt: c.verifiedAt?.toISOString() ?? null,
              notes: c.notes,
              company: c.company,
            }))}
          />
          <div className="border-t px-3">
            <Pagination total={total} page={query.page} pageSize={query.pageSize} />
          </div>
        </Card>
      )}
    </div>
  );
}
