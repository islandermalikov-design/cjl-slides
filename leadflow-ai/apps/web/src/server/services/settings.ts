import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";

export const SenderProfileSchema = z.object({
  name: z.string().trim().max(200).default(""),
  company: z.string().trim().max(200).default(""),
  email: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(50).default(""),
  website: z.string().trim().max(300).default(""),
  signature: z.string().trim().max(1000).default(""),
  portfolio: z.string().trim().max(3000).default(""),
});
export type SenderProfile = z.infer<typeof SenderProfileSchema>;

export async function getSetting<T>(organizationId: string, key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const row = await prisma.appSetting.findUnique({ where: { organizationId_key: { organizationId, key } } });
  if (!row) return fallback;
  const parsed = schema.safeParse(row.value);
  return parsed.success ? parsed.data : fallback;
}

export async function setSetting(organizationId: string, key: string, value: Prisma.InputJsonValue) {
  await prisma.appSetting.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, value },
    update: { value },
  });
}

export async function getSenderProfile(organizationId: string): Promise<SenderProfile> {
  return getSetting(organizationId, "profile.sender", SenderProfileSchema, SenderProfileSchema.parse({}));
}

export const OutreachSettingsSchema = z.object({
  dailyLimit: z.coerce.number().int().min(1).max(500).default(30),
  requireReviewForFollowUps: z.boolean().default(true),
  unsubscribeText: z
    .string()
    .max(500)
    .default("Если тема неактуальна, ответьте «нет» — больше не побеспокою."),
});
export type OutreachSettings = z.infer<typeof OutreachSettingsSchema>;

export async function getOutreachSettings(organizationId: string): Promise<OutreachSettings> {
  return getSetting(organizationId, "outreach", OutreachSettingsSchema, OutreachSettingsSchema.parse({}));
}
