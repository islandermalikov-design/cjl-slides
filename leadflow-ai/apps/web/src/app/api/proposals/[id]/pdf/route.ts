import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { htmlToPdf, renderProposalHtml } from "@/server/services/proposal-render";
import { getProposalVersion } from "@/server/services/proposals";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  const { id } = await params;
  const v = Number(new URL(req.url).searchParams.get("v")) || undefined;
  try {
    await rateLimit(`pdf:${ctx.userId}`, 20, 60);
    const { proposal, version, data } = await getProposalVersion(ctx.organizationId, id, v);
    const html = renderProposalHtml(data.content, { date: version.createdAt, version: version.version, isDemo: proposal.isDemo });
    const pdf = await htmlToPdf(html);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "proposal.pdf", entityType: "Proposal", entityId: id, meta: { version: version.version } });
    const filename = `KP-${proposal.company.name.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60)}-v${version.version}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="proposal-v${version.version}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
