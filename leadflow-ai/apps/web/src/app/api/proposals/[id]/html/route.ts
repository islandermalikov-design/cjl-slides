import { NextResponse } from "next/server";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { renderProposalHtml } from "@/server/services/proposal-render";
import { getProposalVersion } from "@/server/services/proposals";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  const { id } = await params;
  const v = Number(new URL(req.url).searchParams.get("v")) || undefined;
  try {
    const { proposal, version, data } = await getProposalVersion(ctx.organizationId, id, v);
    const html = renderProposalHtml(data.content, { date: version.createdAt, version: version.version, isDemo: proposal.isDemo });
    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Превью открывается в iframe того же origin; скрипты в документе запрещены.
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'",
        "x-frame-options": "SAMEORIGIN",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
