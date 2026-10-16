import "server-only";
import type { BackgroundJob } from "@/generated/prisma/client";
import { AppError } from "../errors";

/** Диспетчер обработчиков фоновых заданий по типу. */
export async function runHandler(job: BackgroundJob): Promise<unknown> {
  const ctx = { organizationId: job.organizationId, userId: job.createdById };
  const payload = (job.payload ?? {}) as Record<string, unknown>;
  switch (job.type) {
    case "IMPORT": {
      const { runImport } = await import("../services/imports");
      const { prisma } = await import("../db");
      try {
        return await runImport(ctx, payload as never);
      } catch (e) {
        await prisma.importJob.updateMany({
          where: { id: String(payload.importJobId), organizationId: ctx.organizationId, status: { not: "SUCCEEDED" } },
          data: { status: job.attempts >= job.maxAttempts ? "FAILED" : "QUEUED", errors: [{ row: 0, message: e instanceof Error ? e.message.slice(0, 300) : "Ошибка" }] },
        });
        throw e;
      }
    }
    case "AI_SCORING": {
      const { scoreCompanies } = await import("../services/scoring");
      const ids = Array.isArray(payload.companyIds) ? (payload.companyIds as string[]) : [];
      return scoreCompanies(ctx, ids, { force: Boolean(payload.force) });
    }
    case "ENRICHMENT": {
      const { enrichCompany } = await import("../services/discovery");
      return enrichCompany(ctx, String(payload.companyId));
    }
    case "DEDUPLICATION": {
      const { scanDuplicates } = await import("../services/companies");
      const res = await scanDuplicates(ctx.organizationId);
      return { checked: res.checked, groups: res.groups.slice(0, 200), groupsCount: res.groups.length };
    }
    case "PROPOSAL_GENERATION": {
      const { generateProposalVersion } = await import("../services/proposals");
      return generateProposalVersion(ctx, String(payload.proposalId), (payload.options ?? {}) as never);
    }
    case "STATS_RECALC": {
      const { recalcStats } = await import("../services/analytics");
      return recalcStats(ctx.organizationId);
    }
    case "INTEGRATION_CHECK": {
      const { checkIntegrations } = await import("../services/integrations");
      return checkIntegrations(ctx.organizationId);
    }
    case "DISCOVERY": {
      const { runDiscoveryJob } = await import("../services/discovery");
      return runDiscoveryJob(ctx, String(payload.discoveryJobId));
    }
    default:
      throw new AppError(`Неизвестный тип задания: ${String(job.type)}`, "VALIDATION");
  }
}
