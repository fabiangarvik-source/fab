import { apiCreate } from "@/server/service";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const res = await apiCreate(body?.name);
  return Response.json(res, { status: res.ok ? 200 : 400 });
});
