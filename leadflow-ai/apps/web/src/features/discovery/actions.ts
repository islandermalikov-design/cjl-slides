"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import { audit } from "@/server/audit";
import { requireContext } from "@/server/context";
import { enqueueJob } from "@/server/jobs/queue";
import { rateLimit } from "@/server/rate-limit";
import { importCandidates, startDiscovery } from "@/server/services/discovery";

export async function startDiscoveryAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rateLimit(`discovery:${ctx.organizationId}`, 20, 300);
    const dj = await startDiscovery(ctx, input);
    await enqueueJob({ organizationId: ctx.organizationId, userId: ctx.userId, type: "DISCOVERY", payload: { discoveryJobId: dj.id }, idempotencyKey: `discovery:${dj.id}`, waitInline: true, maxAttempts: 2 });
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "discovery.start", entityType: "DiscoveryJob", entityId: dj.id, meta: { adapter: dj.adapterKey } });
    revalidatePath("/discovery");
    return { id: dj.id };
  });
}

export async function importCandidatesAction(discoveryJobId: string, indexes: number[]) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const res = await importCandidates(ctx, discoveryJobId, z.array(z.number().int().min(0)).max(200).parse(indexes));
    revalidatePath("/discovery");
    revalidatePath("/companies");
    return res;
  });
}
