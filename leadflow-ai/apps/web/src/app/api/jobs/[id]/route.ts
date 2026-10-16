import { NextResponse } from "next/server";
import { getContext } from "@/server/context";
import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  const { id } = await params;
  const job = await prisma.backgroundJob.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, type: true, status: true, result: true, error: true, attempts: true, maxAttempts: true, createdAt: true, startedAt: true, finishedAt: true },
  });
  if (!job) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json(job, { headers: { "cache-control": "no-store" } });
}
