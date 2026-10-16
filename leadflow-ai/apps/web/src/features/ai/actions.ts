"use server";

import { runAction } from "@/server/action";
import { requireContext } from "@/server/context";
import { rateLimit } from "@/server/rate-limit";
import { askAssistant } from "@/server/services/assistant";

export async function askAssistantAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("VIEWER");
    await rateLimit(`assistant:${ctx.userId}`, 30, 60);
    return askAssistant(ctx, input);
  });
}
