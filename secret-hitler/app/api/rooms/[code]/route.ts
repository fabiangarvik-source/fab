import type { RoomOp } from "@/protocol";
import { apiGet, apiOp } from "@/server/service";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };
const noStore = { "cache-control": "no-store" };

/** Poll the room. With x-player-token you get your private view; without it, the public table view. */
export const GET = handle(async (req: Request, { params }: Ctx) => {
  const { code } = await params;
  const res = await apiGet(code.toUpperCase(), req.headers.get("x-player-token"));
  return Response.json(res, { status: res.ok ? 200 : 404, headers: noStore });
});

/** A seated player's request (start, vote, nominate, kick, ...). */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { code } = await params;
  const body = (await req.json().catch(() => null)) as RoomOp | null;
  if (!body || typeof body.op !== "string") return Response.json({ ok: false, error: "Bad request" }, { status: 400 });
  const res = await apiOp(code.toUpperCase(), req.headers.get("x-player-token"), body);
  return Response.json(res, { status: res.ok ? 200 : 400, headers: noStore });
});
