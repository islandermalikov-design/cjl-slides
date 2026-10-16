"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import { audit } from "@/server/audit";
import { requireContext } from "@/server/context";
import { enqueueJob } from "@/server/jobs/queue";
import { deleteCredential, saveCredential } from "@/server/services/integrations";

export async function saveAnthropicKeyAction(key: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await saveCredential(ctx.organizationId, "ANTHROPIC", z.string().max(300).parse(key));
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "integration.save", entityType: "IntegrationCredential", meta: { provider: "ANTHROPIC" } });
    revalidatePath("/integrations");
    return null;
  }, "Ключ сохранён в зашифрованном виде");
}

const SmtpSchema = z.object({
  host: z.string().trim().min(3).max(200),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().max(200),
  from: z.string().trim().max(200),
  password: z.string().min(1).max(300),
});

export async function saveSmtpAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const v = SmtpSchema.parse(input);
    await saveCredential(ctx.organizationId, "SMTP", v.password, { host: v.host, port: v.port, user: v.user, from: v.from });
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "integration.save", entityType: "IntegrationCredential", meta: { provider: "SMTP", host: v.host } });
    revalidatePath("/integrations");
    return null;
  }, "Настройки SMTP сохранены");
}

export async function deleteCredentialAction(provider: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await deleteCredential(ctx.organizationId, z.enum(["ANTHROPIC", "SMTP"]).parse(provider));
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "integration.delete", entityType: "IntegrationCredential", meta: { provider } });
    revalidatePath("/integrations");
    return null;
  }, "Удалено");
}

export async function checkIntegrationsAction() {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const job = await enqueueJob({ organizationId: ctx.organizationId, userId: ctx.userId, type: "INTEGRATION_CHECK", payload: {}, waitInline: true });
    revalidatePath("/integrations");
    return { jobId: job.id };
  }, "Проверка выполнена");
}
