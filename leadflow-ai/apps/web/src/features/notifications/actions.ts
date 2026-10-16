"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireContext } from "@/server/context";
import { runAction } from "@/server/action";

export async function markAllNotificationsRead() {
  return runAction(async () => {
    const ctx = await requireContext();
    await prisma.notification.updateMany({
      where: { organizationId: ctx.organizationId, OR: [{ userId: ctx.userId }, { userId: null }], readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
  });
}
