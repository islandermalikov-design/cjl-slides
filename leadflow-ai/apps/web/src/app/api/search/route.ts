import { NextResponse } from "next/server";
import { getContext } from "@/server/context";
import { rateLimit } from "@/server/rate-limit";
import { globalSearch } from "@/server/services/search";
import { AppError } from "@/server/errors";

export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  try {
    await rateLimit(`search:${ctx.userId}`, 120, 60);
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(await globalSearch(ctx.organizationId, q));
}
