"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { CRM_STATUSES } from "@leadflow/shared";
import type { CrmStatus } from "@/generated/prisma/client";
import { runAction } from "@/server/action";
import { audit } from "@/server/audit";
import { requireContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { enqueueJob } from "@/server/jobs/queue";
import { rateLimit } from "@/server/rate-limit";
import {
  addNote,
  addTagsToCompanies,
  createCompany,
  mergeCompanies,
  removeTagFromCompany,
  setCompanyStatus,
  softDeleteCompanies,
  updateCompany,
  updateNextStep,
} from "@/server/services/companies";
import { deleteContact, upsertContact } from "@/server/services/contacts";
import { hardDeleteCompany } from "@/server/services/data-export";
import { buildPreview, createImportJob, parseImportFile } from "@/server/services/imports";
import { scoreCompany } from "@/server/services/scoring";

async function reqMeta() {
  const h = await headers();
  return { ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function createCompanyAction(input: unknown, allowDuplicate = false) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rateLimit(`mutate:${ctx.userId}`, 120, 60);
    const company = await createCompany(ctx, input, { allowDuplicate });
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "company.create", entityType: "Company", entityId: company.id, ...(await reqMeta()) });
    revalidatePath("/companies");
    return { id: company.id };
  }, "Компания добавлена");
}

export async function updateCompanyAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await updateCompany(ctx, id, input);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "company.update", entityType: "Company", entityId: id });
    revalidatePath(`/companies/${id}`);
    return null;
  }, "Изменения сохранены");
}

export async function setStatusAction(id: string, status: string, order?: number) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const parsed = z.enum(CRM_STATUSES).parse(status) as CrmStatus;
    await setCompanyStatus(ctx, id, parsed, order);
    revalidatePath("/crm");
    return null;
  });
}

export async function bulkSetStatusAction(ids: string[], status: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const parsed = z.enum(CRM_STATUSES).parse(status) as CrmStatus;
    const list = z.array(z.string()).max(500).parse(ids);
    for (const id of list) await setCompanyStatus(ctx, id, parsed);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "company.bulk_status", entityType: "Company", meta: { count: list.length, status: parsed } });
    revalidatePath("/companies");
    return { count: list.length };
  }, "Статус обновлён");
}

export async function bulkTagAction(ids: string[], tags: string[]) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const list = z.array(z.string()).max(1000).parse(ids);
    const tagList = z.array(z.string().trim().min(1).max(50)).min(1, "Укажите тег").max(20).parse(tags);
    const count = await addTagsToCompanies(ctx.organizationId, list, tagList);
    revalidatePath("/companies");
    return { count };
  }, "Теги назначены");
}

export async function removeTagAction(companyId: string, tagId: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await removeTagFromCompany(ctx.organizationId, companyId, tagId);
    revalidatePath(`/companies/${companyId}`);
    return null;
  });
}

export async function bulkDeleteAction(ids: string[]) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const list = z.array(z.string()).max(1000).parse(ids);
    const count = await softDeleteCompanies(ctx, list);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "company.delete", entityType: "Company", meta: { ids: list.slice(0, 100), count }, ...(await reqMeta()) });
    revalidatePath("/companies");
    return { count };
  }, "Компании удалены");
}

export async function hardDeleteCompanyAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const count = await hardDeleteCompany(ctx.organizationId, id);
    if (!count) throw new AppError("Компания не найдена", "NOT_FOUND", 404);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "company.erase", entityType: "Company", entityId: id, ...(await reqMeta()) });
    revalidatePath("/companies");
    return null;
  }, "Данные компании удалены безвозвратно");
}

export async function bulkScoreAction(ids: string[], force = false) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const list = z.array(z.string()).min(1, "Выберите компании").max(200).parse(ids);
    const job = await enqueueJob({ organizationId: ctx.organizationId, userId: ctx.userId, type: "AI_SCORING", payload: { companyIds: list, force } });
    return { jobId: job.id };
  }, "Анализ поставлен в очередь");
}

export async function scoreCompanyAction(id: string, force = true) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const res = await scoreCompany(ctx, id, { force });
    revalidatePath(`/companies/${id}`);
    return { score: res.score.score, cached: res.cached };
  }, "Анализ выполнен");
}

export async function enrichCompanyAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const job = await enqueueJob({ organizationId: ctx.organizationId, userId: ctx.userId, type: "ENRICHMENT", payload: { companyId: id }, idempotencyKey: `enrich:${id}:${new Date().toISOString().slice(0, 13)}`, waitInline: true });
    return { jobId: job.id, status: job.status };
  }, "Обогащение запущено");
}

export async function addNoteAction(companyId: string, body: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await addNote(ctx, companyId, body);
    revalidatePath(`/companies/${companyId}`);
    return null;
  }, "Заметка добавлена");
}

export async function updateNextStepAction(companyId: string, nextStep: string | null, nextStepAt: string | null) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await updateNextStep(ctx, companyId, nextStep?.trim().slice(0, 500) || null, nextStepAt ? new Date(nextStepAt) : null);
    revalidatePath(`/companies/${companyId}`);
    return null;
  }, "Следующий шаг сохранён");
}

export async function upsertContactAction(input: unknown, id?: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const c = await upsertContact(ctx, input, id);
    revalidatePath(`/companies/${c.companyId}`);
    revalidatePath("/contacts");
    return { id: c.id };
  }, id ? "Контакт обновлён" : "Контакт добавлен");
}

export async function deleteContactAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await deleteContact(ctx, id);
    revalidatePath("/contacts");
    return null;
  }, "Контакт удалён");
}

export async function mergeCompaniesAction(primaryId: string, duplicateId: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await mergeCompanies(ctx, primaryId, duplicateId);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "company.merge", entityType: "Company", entityId: primaryId, meta: { duplicateId } });
    revalidatePath("/companies");
    return null;
  }, "Дубль объединён");
}

export async function runDedupScanAction() {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const job = await enqueueJob({ organizationId: ctx.organizationId, userId: ctx.userId, type: "DEDUPLICATION", payload: {}, waitInline: true });
    return { jobId: job.id };
  }, "Проверка дублей выполнена");
}

// ---------------- Импорт ----------------

const ALLOWED_TYPES = [
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "",
];

async function readUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new AppError("Файл не выбран");
  if (file.size === 0) throw new AppError("Файл пуст");
  if (file.size > 5 * 1024 * 1024) throw new AppError("Файл больше 5 МБ");
  if (!ALLOWED_TYPES.includes(file.type)) throw new AppError("Недопустимый тип файла");
  const name = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 200);
  return { name, buffer: Buffer.from(await file.arrayBuffer()) };
}

export async function previewImportAction(formData: FormData) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rateLimit(`import:${ctx.userId}`, 30, 300);
    const { name, buffer } = await readUpload(formData);
    const table = await parseImportFile(name, buffer);
    return { fileName: name, ...buildPreview(table) };
  });
}

export async function runImportAction(formData: FormData) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rateLimit(`import:${ctx.userId}`, 30, 300);
    const { name, buffer } = await readUpload(formData);
    const mapping = JSON.parse(String(formData.get("mapping") ?? "{}")) as unknown;
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const table = await parseImportFile(name, buffer);
    const payload = await createImportJob(ctx, name, table, mapping, tags);
    const job = await enqueueJob({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      type: "IMPORT",
      payload: payload as unknown as Parameters<typeof enqueueJob>[0]["payload"],
      idempotencyKey: `import:${payload.importJobId}`,
      waitInline: true,
    });
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "import.start", entityType: "ImportJob", entityId: payload.importJobId, meta: { fileName: name, rows: table.rows.length } });
    revalidatePath("/companies");
    return { importJobId: payload.importJobId, jobId: job.id };
  });
}
