import { NextResponse } from "next/server";
import { getContext } from "@/server/context";
import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  const { id } = await params;
  const job = await prisma.importJob.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!job) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json(
    { status: job.status, importedRows: job.importedRows, duplicateRows: job.duplicateRows, skippedRows: job.skippedRows, errorRows: job.errorRows, errors: job.errors },
    { headers: { "cache-control": "no-store" } },
  );
}
