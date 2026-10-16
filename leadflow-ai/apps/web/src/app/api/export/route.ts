import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getContext, hasRole } from "@/server/context";
import { rateLimit } from "@/server/rate-limit";
import { exportOrganizationData } from "@/server/services/data-export";

export async function GET() {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  if (!hasRole(ctx.role, "ADMIN")) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  try {
    await rateLimit(`export-all:${ctx.organizationId}`, 5, 300);
  } catch {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }
  const data = await exportOrganizationData(ctx.organizationId);
  await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "data.export", entityType: "Organization" });
  return new NextResponse(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="leadflow-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
