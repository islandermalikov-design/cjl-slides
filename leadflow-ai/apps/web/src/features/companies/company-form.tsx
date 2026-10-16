"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CompanyInputSchema, MARKETPLACES, MARKETPLACE_LABELS, TARGET_NICHES, formatPhone, type CompanyInput } from "@leadflow/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCompanyAction, updateCompanyAction } from "./actions";

export interface CompanyFormValues {
  id?: string;
  name: string;
  legalName?: string | null;
  inn?: string | null;
  website?: string | null;
  category?: string | null;
  niche?: string | null;
  city?: string | null;
  region?: string | null;
  marketplace?: string;
  publicEmail?: string | null;
  publicPhone?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CompanyFormValues;
}) {
  const router = useRouter();
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const form = useForm<CompanyInput>({
    resolver: zodResolver(CompanyInputSchema) as never,
    defaultValues: {
      name: initial?.name ?? "",
      legalName: initial?.legalName ?? "",
      inn: initial?.inn ?? "",
      website: initial?.website ?? "",
      category: initial?.category ?? "",
      niche: initial?.niche ?? "",
      city: initial?.city ?? "",
      region: initial?.region ?? "",
      marketplace: (initial?.marketplace as CompanyInput["marketplace"]) ?? "NONE",
      publicEmail: initial?.publicEmail ?? "",
      publicPhone: initial?.publicPhone ? formatPhone(initial.publicPhone) : "",
      sourceUrl: initial?.sourceUrl ?? "",
      notes: initial?.notes ?? "",
    },
  });
  const errors = form.formState.errors;

  async function submit(values: CompanyInput, allowDuplicate = false) {
    const res = initial?.id ? await updateCompanyAction(initial.id, values) : await createCompanyAction(values, allowDuplicate);
    if (!res.ok) {
      if (!initial?.id && res.error.startsWith("Похоже")) setDuplicateWarning(res.error);
      else toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Сохранено");
    onOpenChange(false);
    form.reset();
    setDuplicateWarning(null);
    if (!initial?.id && res.data && "id" in (res.data as object)) router.push(`/companies/${(res.data as { id: string }).id}`);
    else router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Редактирование компании" : "Новая компания"}</DialogTitle>
          <DialogDescription>Указывайте только публичные деловые контакты и ссылку на источник, где они опубликованы.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => submit(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Название компании *" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" {...form.register("name")} aria-invalid={Boolean(errors.name)} autoFocus />
          </Field>
          <Field label="Юридическое название" htmlFor="legalName">
            <Input id="legalName" {...form.register("legalName")} placeholder="ООО «…»" />
          </Field>
          <Field label="ИНН" htmlFor="inn" error={errors.inn?.message}>
            <Input id="inn" inputMode="numeric" {...form.register("inn")} aria-invalid={Boolean(errors.inn)} />
          </Field>
          <Field label="Сайт" htmlFor="website">
            <Input id="website" {...form.register("website")} placeholder="example.ru" />
          </Field>
          <Field label="Площадка">
            <Controller
              control={form.control}
              name="marketplace"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETPLACES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MARKETPLACE_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Ниша" htmlFor="niche">
            <Input id="niche" list="niche-options" {...form.register("niche")} />
            <datalist id="niche-options">
              {TARGET_NICHES.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="Категория" htmlFor="category">
            <Input id="category" {...form.register("category")} placeholder="Например: Домашний текстиль" />
          </Field>
          <Field label="Город" htmlFor="city">
            <Input id="city" {...form.register("city")} />
          </Field>
          <Field label="Регион" htmlFor="region">
            <Input id="region" {...form.register("region")} />
          </Field>
          <Field label="Публичный рабочий email" htmlFor="publicEmail" error={errors.publicEmail?.message}>
            <Input id="publicEmail" type="email" {...form.register("publicEmail")} aria-invalid={Boolean(errors.publicEmail)} />
          </Field>
          <Field label="Публичный рабочий телефон" htmlFor="publicPhone">
            <Input id="publicPhone" type="tel" {...form.register("publicPhone")} />
          </Field>
          <Field label="URL источника" htmlFor="sourceUrl" hint="Страница, где опубликованы данные компании" className="sm:col-span-2">
            <Input id="sourceUrl" {...form.register("sourceUrl")} placeholder="https://example.ru/contacts" />
          </Field>
          <Field label="Примечания" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </Field>
          {duplicateWarning ? (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {duplicateWarning}
              {!duplicateWarning.includes("ИНН") ? (
                <Button type="button" variant="link" size="sm" className="ml-1 h-auto p-0" onClick={form.handleSubmit((v) => submit(v, true))}>
                  Всё равно добавить
                </Button>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
