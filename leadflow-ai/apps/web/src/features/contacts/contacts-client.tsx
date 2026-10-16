"use client";

import { formatPhone } from "@leadflow/shared";
import { ExternalLink, Pencil, Search, ShieldAlert, Trash } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CrmStatusBadge } from "@/components/common/badges";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { formatDate } from "@/lib/utils";
import type { CrmStatusValue } from "@leadflow/shared";
import { deleteContactAction } from "@/features/companies/actions";
import { ContactDialog, type ContactView } from "@/features/companies/company-widgets";

export interface ContactRow extends ContactView {
  company: { id: string; name: string; crmStatus: CrmStatusValue };
}

export function ContactsSearch() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") === q) return;
      const p = new URLSearchParams(params.toString());
      if (q) p.set("q", q);
      else p.delete("q");
      p.delete("page");
      router.push(`${pathname}?${p.toString()}`);
    }, 350);
    return () => clearTimeout(t);
  }, [q, params, pathname, router]);
  return (
    <div className="relative w-full sm:w-80">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Имя, email, должность, компания" className="h-8 pl-8 text-[13px]" aria-label="Поиск контактов" />
    </div>
  );
}

export function ContactsTable({ rows, canEdit }: { rows: ContactRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const { run } = useAction();
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Контакт</TableHead>
            <TableHead>Компания</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Источник</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="font-medium">{c.fullName}</div>
                <div className="text-xs text-muted-foreground">{c.position ?? "—"}</div>
              </TableCell>
              <TableCell>
                <Link href={`/companies/${c.company.id}`} className="hover:text-primary hover:underline">
                  {c.company.name}
                </Link>
                <div className="mt-0.5">
                  <CrmStatusBadge status={c.company.crmStatus} />
                </div>
              </TableCell>
              <TableCell className="text-[13px]">{c.email ?? "—"}</TableCell>
              <TableCell className="text-[13px] whitespace-nowrap">{c.phone ? formatPhone(c.phone) : "—"}</TableCell>
              <TableCell>
                {c.sourceUrl ? (
                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="size-3" /> {formatDate(c.verifiedAt)}
                  </a>
                ) : (
                  <Badge variant="warning">
                    <ShieldAlert /> нет источника
                  </Badge>
                )}
                {!c.isPublicBusiness ? (
                  <Badge variant="destructive" className="ml-1">
                    не деловой
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>
                {canEdit ? (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label="Редактировать контакт">
                      <Pencil />
                    </Button>
                    <ConfirmDialog
                      title={`Удалить контакт «${c.fullName}»?`}
                      destructive
                      confirmLabel="Удалить"
                      onConfirm={() => run(() => deleteContactAction(c.id))}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Удалить контакт">
                          <Trash />
                        </Button>
                      }
                    />
                  </div>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing ? <ContactDialog open onOpenChange={(o) => !o && setEditing(null)} companyId={editing.company.id} initial={editing} /> : null}
    </>
  );
}
