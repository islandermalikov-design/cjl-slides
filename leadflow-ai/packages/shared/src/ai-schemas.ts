import { z } from "zod";

// ---------------------------------------------------------------------------
// Схемы структурированных ответов AI. Любой ответ модели валидируется этими
// схемами перед сохранением в БД; невалидный ответ — ошибка, а не «догадка».
// ---------------------------------------------------------------------------

export const SCORE_CRITERIA = [
  "audience_fit",
  "automation_need",
  "manual_process_signals",
  "analytics_value",
  "contact_channel",
  "data_completeness",
] as const;

export const SCORE_CRITERIA_LABELS: Record<(typeof SCORE_CRITERIA)[number], string> = {
  audience_fit: "Соответствие целевой аудитории",
  automation_need: "Вероятная потребность в автоматизации",
  manual_process_signals: "Признаки ручных процессов",
  analytics_value: "Польза аналитики",
  contact_channel: "Доступный деловой канал связи",
  data_completeness: "Полнота и актуальность данных",
};

/** Максимум баллов по каждому критерию; сумма = 100. */
export const SCORE_CRITERIA_WEIGHTS: Record<(typeof SCORE_CRITERIA)[number], number> = {
  audience_fit: 25,
  automation_need: 20,
  manual_process_signals: 15,
  analytics_value: 15,
  contact_channel: 15,
  data_completeness: 10,
};

export const LeadScoreBreakdownSchema = z.object({
  criterion: z.enum(SCORE_CRITERIA),
  points: z.number().int().min(0).max(25),
  comment: z.string(),
});

export const LeadScoreFactSchema = z.object({
  statement: z.string(),
  sourceUrl: z.string().nullable(),
});

export const LeadScoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  breakdown: z.array(LeadScoreBreakdownSchema),
  reasons: z.array(z.string()),
  facts: z.array(LeadScoreFactSchema),
  hypotheses: z.array(z.string()),
  recommendations: z.array(z.string()),
  unknowns: z.array(z.string()),
  clientTasks: z.array(z.string()),
  recommendedProduct: z.string(),
  recommendedTier: z.enum(["START", "BUSINESS", "PREMIUM", "CUSTOM"]),
});
export type LeadScoreResult = z.infer<typeof LeadScoreResultSchema>;

/** Проверка согласованности: сумма баллов не превышает веса критериев, итог = сумма. */
export function normalizeLeadScore(result: LeadScoreResult): LeadScoreResult {
  const seen = new Set<string>();
  const breakdown = result.breakdown
    .filter((b) => {
      if (seen.has(b.criterion)) return false;
      seen.add(b.criterion);
      return true;
    })
    .map((b) => ({ ...b, points: Math.min(b.points, SCORE_CRITERIA_WEIGHTS[b.criterion]) }));
  const total = breakdown.reduce((sum, b) => sum + b.points, 0);
  return { ...result, breakdown, score: Math.max(0, Math.min(100, total)) };
}

// ---------------------------------------------------------------------------
// Коммерческое предложение
// ---------------------------------------------------------------------------

export const ProposalStageSchema = z.object({
  title: z.string(),
  description: z.string(),
  durationDays: z.number().int().min(0).max(365),
});

export const ProposalPriceItemSchema = z.object({
  name: z.string(),
  price: z.number().int().min(0),
  comment: z.string(),
});

export const ProposalContentSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  clientName: z.string(),
  problem: z.string(),
  solution: z.string(),
  features: z.array(z.string()),
  stages: z.array(ProposalStageSchema),
  priceItems: z.array(ProposalPriceItemSchema),
  totalPrice: z.number().int().min(0),
  durationDays: z.number().int().min(0).max(365),
  nextStep: z.string(),
  assumptions: z.array(z.string()),
  contacts: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    website: z.string(),
  }),
});
export type ProposalContent = z.infer<typeof ProposalContentSchema>;

export const OutreachTextsSchema = z.object({
  firstMessage: z.string(),
  emailSubject: z.string(),
  emailBody: z.string(),
  messengerText: z.string(),
  interestedReply: z.string(),
  priceObjectionReply: z.string(),
});
export type OutreachTexts = z.infer<typeof OutreachTextsSchema>;

export const ProposalGenerationSchema = z.object({
  content: ProposalContentSchema,
  texts: OutreachTextsSchema,
});
export type ProposalGeneration = z.infer<typeof ProposalGenerationSchema>;

// ---------------------------------------------------------------------------
// AI-ассистент
// ---------------------------------------------------------------------------

export const AssistantReplySchema = z.object({
  answer: z.string(),
  suggestedActions: z.array(
    z.object({
      label: z.string(),
      kind: z.enum(["open_company", "create_task", "generate_proposal", "draft_message", "rescore", "none"]),
      companyId: z.string().nullable(),
    }),
  ),
});
export type AssistantReply = z.infer<typeof AssistantReplySchema>;
