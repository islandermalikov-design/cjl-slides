// DEMO seed: демонстрационная организация с явно помеченными данными (isDemo = true, «(DEMO)» в названиях).
// Запуск: pnpm db:seed  (идемпотентен — пересоздаёт демо-организацию).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { normalizeCompanyName, normalizePhone, dedupeKeys, type CrmStatusValue } from "@leadflow/shared";
import { PrismaClient, type Prisma } from "../../generated/prisma/client.ts";
import { DEFAULT_PIPELINE_STAGES, DEFAULT_SERVICES } from "../defaults.ts";
import { allDemoCandidates } from "../services/demo-candidates.ts";
import { heuristicScore } from "../domain/heuristic-score.ts";
import { templateProposal } from "../domain/proposal-template.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, "../../../../../.env"), quiet: true });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const DEMO_SLUG = "leadflow-demo";
export const DEMO_USERS = [
  { email: "demo@leadflow.local", password: "demo12345", name: "Демо Пользователь", role: "OWNER" as const },
  { email: "viewer@leadflow.local", password: "viewer12345", name: "Наблюдатель (DEMO)", role: "VIEWER" as const },
];

// Детерминированный генератор, чтобы seed давал одинаковый результат.
let rngState = 42;
function rand() {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const daysAgo = (n: number, hour = 11) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(rand() * 60), 0, 0);
  return d;
};

async function ensureUser(u: (typeof DEMO_USERS)[number]) {
  const existing = await prisma.user.findUnique({ where: { email: u.email } });
  if (existing) return existing;
  const id = crypto.randomUUID();
  return prisma.user.create({
    data: {
      id,
      email: u.email,
      name: u.name,
      emailVerified: true,
      accounts: { create: { id: crypto.randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(u.password) } },
    },
  });
}

async function main() {
  console.log("LeadFlow seed: создаю DEMO-организацию…");
  await prisma.organization.deleteMany({ where: { slug: DEMO_SLUG } });
  const users = await Promise.all(DEMO_USERS.map(ensureUser));
  const owner = users[0]!;
  // Пользователи демо могли получить личные пространства — демо-организация должна быть первой.
  await prisma.organizationMember.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });

  const org = await prisma.organization.create({
    data: {
      name: "LeadFlow Demo (DEMO)",
      slug: DEMO_SLUG,
      isDemo: true,
      members: { create: DEMO_USERS.map((u, i) => ({ userId: users[i]!.id, role: u.role })) },
      stages: { create: DEFAULT_PIPELINE_STAGES },
      services: { create: DEFAULT_SERVICES.map((s) => ({ ...s, features: s.features })) },
    },
    include: { stages: { orderBy: { order: "asc" } }, services: true },
  });
  const orgId = org.id;
  const sender = {
    name: "Демо Отправитель",
    company: "LeadFlow Demo",
    email: "hello@leadflow-demo.example",
    phone: "+7 900 000-00-00",
    website: "https://leadflow-demo.example",
    signature: "С уважением,\nДемо Отправитель\nАвтоматизация учёта и аналитики\nhttps://leadflow-demo.example",
    portfolio: "",
  };
  await prisma.appSetting.createMany({
    data: [
      { organizationId: orgId, key: "profile.sender", value: sender },
      { organizationId: orgId, key: "outreach", value: { dailyLimit: 30, requireReviewForFollowUps: true, unsubscribeText: "Если тема неактуальна, ответьте «нет» — больше не побеспокою." } },
      { organizationId: orgId, key: "ai.monthlyBudgetUsd", value: 20 },
    ],
  });

  const demoSource = await prisma.leadSource.create({
    data: {
      organizationId: orgId,
      name: "DEMO-каталог",
      type: "DEMO",
      adapterKey: "demo",
      status: "ACTIVE",
      robotsChecked: true,
      termsReviewed: true,
      legalBasis: "Синтетические данные для демонстрации, не относятся к реальным компаниям.",
      isDemo: true,
    },
  });
  await prisma.leadSource.createMany({
    data: [
      {
        organizationId: orgId,
        name: "Корпоративные сайты (по списку URL)",
        type: "WEBSITE",
        adapterKey: "website",
        status: "PENDING_REVIEW",
        legalBasis: null,
        notes: "Сбор только опубликованных деловых контактов с соблюдением robots.txt. Требуется проверка перед активацией.",
      },
      {
        organizationId: orgId,
        name: "DaData — реквизиты организаций",
        type: "OFFICIAL_API",
        adapterKey: "dadata",
        baseUrl: "https://suggestions.dadata.ru",
        status: "PENDING_REVIEW",
        notes: "Требуется ключ DADATA_API_KEY в окружении collector и проверка условий тарифа.",
      },
    ],
  });

  const tags = await Promise.all(
    [
      ["Маркетплейс", "blue"],
      ["Горячий лид", "red"],
      ["Повторный контакт", "amber"],
      ["Excel", "green"],
    ].map(([name, color]) => prisma.leadTag.create({ data: { organizationId: orgId, name: name!, color: color! } })),
  );

  const statusPlan: CrmStatusValue[] = [
    "NEW", "NEW", "NEW", "NEW", "NEW", "VERIFIED", "VERIFIED", "VERIFIED", "PREPARE_PROPOSAL", "PREPARE_PROPOSAL",
    "PROPOSAL_READY", "PROPOSAL_READY", "CONTACTED", "CONTACTED", "CONTACTED", "REPLIED", "REPLIED", "NEGOTIATION", "NEGOTIATION",
    "WON", "WON", "WON", "LOST", "DO_NOT_CONTACT",
  ];
  // Половина DEMO-каталога загружается в базу, вторая половина остаётся доступной в «Поиске клиентов».
  const candidates = allDemoCandidates().filter((_, idx) => idx % 2 === 0);
  const stagesByName = new Map(org.stages.map((s) => [s.name, s]));
  const serviceByTier = new Map(org.services.map((s) => [s.tier, s]));
  let companiesCreated = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    const status = statusPlan[i % statusPlan.length]!;
    const createdAt = daysAgo(Math.floor(rand() * 88) + 1);
    const keys = dedupeKeys(c);
    const company = await prisma.company.create({
      data: {
        organizationId: orgId,
        ownerId: owner.id,
        name: c.name,
        normalizedName: normalizeCompanyName(c.name),
        website: c.website,
        domain: keys.domain,
        category: c.category,
        niche: c.niche,
        city: c.city,
        region: c.region,
        marketplace: c.marketplace === "Wildberries" ? "WILDBERRIES" : c.marketplace === "Ozon" ? "OZON" : c.marketplace === "Яндекс Маркет" ? "YANDEX_MARKET" : "NONE",
        publicEmail: c.publicEmail,
        publicPhone: normalizePhone(c.publicPhone),
        sourceUrl: c.sourceUrl,
        sourceType: i % 5 === 0 ? "CSV_IMPORT" : i % 7 === 0 ? "MANUAL" : "DEMO",
        verifiedAt: createdAt,
        crmStatus: status,
        isDemo: true,
        createdAt,
        notes: i % 4 === 0 ? "DEMO: ведут учёт остатков в Excel, отчёты собирают вручную раз в неделю." : null,
        lastContactedAt: ["CONTACTED", "REPLIED", "NEGOTIATION", "WON", "LOST"].includes(status) ? daysAgo(Math.floor(rand() * 20)) : null,
        nextStep: status === "NEGOTIATION" ? "Согласовать объём работ на созвоне" : status === "REPLIED" ? "Ответить и предложить созвон" : null,
        nextStepAt: status === "NEGOTIATION" || status === "REPLIED" ? daysAgo(-2) : null,
        evidence: {
          create: c.evidence.map((e) => ({ organizationId: orgId, sourceId: demoSource.id, kind: e.kind, field: e.field, value: e.value, url: e.url ?? null, isDemo: true, capturedAt: createdAt })),
        },
        tags: {
          create: [
            ...(c.marketplace ? [{ tagId: tags[0]!.id }] : []),
            ...(status === "REPLIED" || status === "NEGOTIATION" ? [{ tagId: tags[1]!.id }] : []),
            ...(i % 4 === 0 ? [{ tagId: tags[3]!.id }] : []),
          ],
        },
      },
    });
    companiesCreated++;
    await prisma.activity.create({ data: { organizationId: orgId, companyId: company.id, userId: owner.id, type: "SYSTEM", title: "Компания добавлена в базу (DEMO)", isDemo: true, createdAt } });

    if (c.publicEmail && i % 3 === 0) {
      await prisma.contact.create({
        data: {
          organizationId: orgId,
          companyId: company.id,
          fullName: pick(["Отдел продаж", "Коммерческий отдел", "Руководитель (DEMO)", "Менеджер по закупкам"]),
          position: pick(["Отдел продаж", "Коммерческий директор", "Менеджер"]),
          email: c.publicEmail,
          isPublicBusiness: true,
          sourceUrl: c.sourceUrl,
          verifiedAt: createdAt,
          isDemo: true,
        },
      });
    }

    // Оценка (эвристика DEMO)
    if (status !== "NEW" || i % 2 === 0) {
      const result = heuristicScore({
        name: c.name,
        legalName: null,
        website: c.website ?? null,
        category: c.category ?? null,
        niche: c.niche ?? null,
        city: c.city ?? null,
        region: c.region ?? null,
        marketplace: c.marketplace ?? "Не указана",
        hasPublicEmail: Boolean(c.publicEmail),
        hasPublicPhone: Boolean(c.publicPhone),
        sourceUrl: c.sourceUrl ?? null,
        verifiedAt: createdAt.toISOString(),
        notes: company.notes,
        tags: [],
        contacts: [],
        evidence: c.evidence.map((e) => ({ kind: e.kind, field: e.field, value: e.value, url: e.url ?? null })),
      });
      await prisma.leadScore.create({
        data: {
          organizationId: orgId,
          companyId: company.id,
          score: result.score,
          breakdown: result.breakdown as Prisma.InputJsonValue,
          reasons: result.reasons,
          facts: result.facts as Prisma.InputJsonValue,
          hypotheses: result.hypotheses,
          recommendations: result.recommendations,
          unknowns: result.unknowns,
          clientTasks: result.clientTasks,
          recommendedProduct: result.recommendedProduct,
          recommendedTier: result.recommendedTier,
          summary: result.summary,
          model: "demo-heuristics",
          generatedBy: "DEMO",
          inputHash: `seed-${company.id}`,
          promptVersion: "score-v1",
          createdAt,
        },
      });
      await prisma.company.update({ where: { id: company.id }, data: { aiScore: result.score } });
    }

    // КП
    if (["PROPOSAL_READY", "CONTACTED", "REPLIED", "NEGOTIATION", "WON", "LOST"].includes(status)) {
      const svc = (c.marketplace ? serviceByTier.get("BUSINESS") : serviceByTier.get("START"))!;
      const gen = templateProposal({
        companyName: c.name,
        niche: c.niche ?? null,
        marketplace: company.marketplace,
        services: [svc],
        totalPrice: svc.priceFrom + (svc.priceTo ? Math.round((svc.priceTo - svc.priceFrom) / 2 / 1000) * 1000 : 0),
        durationDays: svc.durationDays,
        sender,
      });
      const sent = status !== "PROPOSAL_READY";
      const proposal = await prisma.proposal.create({
        data: {
          organizationId: orgId,
          companyId: company.id,
          createdById: owner.id,
          title: gen.content.title,
          status: status === "WON" ? "ACCEPTED" : status === "LOST" ? "REJECTED" : sent ? "SENT" : "READY",
          serviceIds: [svc.id],
          totalPrice: gen.content.totalPrice,
          durationDays: gen.content.durationDays,
          currentVersion: 1,
          sentAt: sent ? daysAgo(Math.floor(rand() * 25) + 1) : null,
          isDemo: true,
          versions: { create: { version: 1, content: gen as unknown as Prisma.InputJsonValue, generatedBy: "TEMPLATE", note: "Шаблон (DEMO)" } },
        },
      });

      // Сообщения
      if (sent) {
        const sentAt = proposal.sentAt!;
        const draft = await prisma.messageDraft.create({
          data: {
            organizationId: orgId,
            companyId: company.id,
            proposalId: proposal.id,
            channel: "EMAIL",
            recipient: c.publicEmail ?? `sales@${keys.domain ?? "demo.example"}`,
            subject: gen.texts.emailSubject,
            body: gen.texts.emailBody,
            status: status === "CONTACTED" ? "SENT" : status === "LOST" ? "OPTED_OUT" : "REPLIED",
            legalBasis: "LEGITIMATE_INTEREST_B2B",
            isFirstContact: true,
            generatedBy: "TEMPLATE",
            createdById: owner.id,
            reviewedById: owner.id,
            reviewedAt: sentAt,
            approvedAt: sentAt,
            sentAt,
            isDemo: true,
          },
        });
        await prisma.message.create({
          data: {
            organizationId: orgId,
            companyId: company.id,
            draftId: draft.id,
            direction: "OUTBOUND",
            channel: "EMAIL",
            recipient: draft.recipient,
            subject: draft.subject,
            body: draft.body,
            status: "SENT",
            idempotencyKey: `draft:${draft.id}`,
            isSimulated: true,
            sentAt,
            isDemo: true,
            createdAt: sentAt,
          },
        });
        await prisma.activity.create({ data: { organizationId: orgId, companyId: company.id, userId: owner.id, type: "MESSAGE", title: "Сообщение отправлено (симуляция DEMO)", isDemo: true, createdAt: sentAt } });
        if (status !== "CONTACTED") {
          const replyAt = new Date(sentAt.getTime() + 2 * 86400000);
          await prisma.message.create({
            data: {
              organizationId: orgId,
              companyId: company.id,
              draftId: draft.id,
              direction: "INBOUND",
              channel: "EMAIL",
              recipient: draft.recipient,
              subject: `Re: ${draft.subject}`,
              body: status === "LOST" ? "DEMO: Спасибо, неактуально." : "DEMO: Здравствуйте! Интересно, давайте созвонимся на этой неделе.",
              status: "REPLIED",
              isDemo: true,
              createdAt: replyAt,
            },
          });
          await prisma.activity.create({ data: { organizationId: orgId, companyId: company.id, type: "MESSAGE", title: "Получен ответ (DEMO)", isDemo: true, createdAt: replyAt } });
        } else {
          await prisma.task.create({
            data: { organizationId: orgId, companyId: company.id, assigneeId: owner.id, createdById: owner.id, title: `Проверить ответ: ${c.name}`, dueAt: new Date(sentAt.getTime() + 4 * 86400000), isFollowUp: true, isDemo: true },
          });
        }
        if (status === "LOST" && draft.recipient) {
          await prisma.suppressionEntry.create({ data: { organizationId: orgId, value: draft.recipient, kind: "email", channel: "EMAIL", reason: "Отказ (DEMO)", source: "opt-out" } });
        }
      }

      // Сделки
      if (["NEGOTIATION", "WON", "LOST"].includes(status)) {
        const stageName = status === "WON" ? "Выиграна" : status === "LOST" ? "Проиграна" : pick(["Переговоры", "Согласование договора"]);
        const stage = stagesByName.get(stageName)!;
        const closedAt = status === "NEGOTIATION" ? null : daysAgo(Math.floor(rand() * 330) + 1);
        await prisma.deal.create({
          data: {
            organizationId: orgId,
            companyId: company.id,
            stageId: stage.id,
            serviceId: svc.id,
            ownerId: owner.id,
            title: `${svc.tier}: ${c.category ?? "автоматизация"}`,
            amount: gen.content.totalPrice,
            status: status === "WON" ? "WON" : status === "LOST" ? "LOST" : "OPEN",
            closedAt,
            expectedCloseAt: status === "NEGOTIATION" ? daysAgo(-10) : null,
            isDemo: true,
          },
        });
      }
    }

    if (status === "REPLIED" || status === "NEGOTIATION") {
      await prisma.task.create({
        data: {
          organizationId: orgId,
          companyId: company.id,
          assigneeId: owner.id,
          createdById: owner.id,
          title: status === "REPLIED" ? `Ответить: ${c.name}` : `Подготовить договор: ${c.name}`,
          dueAt: daysAgo(i % 3 === 0 ? 1 : -2),
          priority: status === "REPLIED" ? "HIGH" : "MEDIUM",
          isDemo: true,
        },
      });
    }
  }

  // Черновики на согласовании — чтобы было что проверить в центре коммуникаций.
  const toReview = await prisma.company.findMany({ where: { organizationId: orgId, crmStatus: "PREPARE_PROPOSAL", publicEmail: { not: null } }, take: 2 });
  for (const c of toReview) {
    await prisma.messageDraft.create({
      data: {
        organizationId: orgId,
        companyId: c.id,
        channel: "EMAIL",
        recipient: c.publicEmail,
        subject: `Автоматизация отчётности для «${c.name}»`,
        body: `Здравствуйте!\n\nМеня зовут Демо Отправитель, я занимаюсь автоматизацией учёта и аналитики для продавцов маркетплейсов. Если актуально, пришлю короткое предложение.\n\n${sender.signature}`,
        status: "PENDING_REVIEW",
        legalBasis: "LEGITIMATE_INTEREST_B2B",
        generatedBy: "TEMPLATE",
        createdById: owner.id,
        isDemo: true,
      },
    });
  }

  await prisma.notification.create({
    data: { organizationId: orgId, userId: owner.id, title: "Добро пожаловать в LeadFlow AI", body: "Это демо-пространство: все данные помечены DEMO и вымышлены.", link: "/dashboard" },
  });
  await prisma.auditLog.create({ data: { organizationId: orgId, userId: owner.id, action: "seed.completed", entityType: "Organization", entityId: orgId, meta: { companies: companiesCreated } } });

  console.log(`Готово: ${companiesCreated} компаний (DEMO).`);
  for (const u of DEMO_USERS) console.log(`  Вход: ${u.email} / ${u.password} (${u.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
