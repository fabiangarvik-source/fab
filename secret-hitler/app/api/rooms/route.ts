import { apiCreate } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const res = await apiCreate(body?.name);
  return Response.json(res, { status: res.ok ? 200 : 400 });
}
