import { apiJoin } from "@/server/service";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await apiJoin(code.toUpperCase(), body?.name, req.headers.get("x-player-token"));
  return Response.json(res, { status: res.ok ? 200 : 400, headers: { "cache-control": "no-store" } });
});
