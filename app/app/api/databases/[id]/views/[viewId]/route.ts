import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; viewId: string }> };

// PATCH — update a view's name, type, or config.
export async function PATCH(request: Request, { params }: Params) {
  const { viewId } = await params;
  const existing = await prisma.view.findUnique({ where: { id: viewId } });
  if (!existing) {
    return Response.json({ error: "View not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type;
  if (body.config !== undefined) data.config = body.config;

  const view = await prisma.view.update({ where: { id: viewId }, data });
  return Response.json(view);
}

// DELETE — remove a view.
export async function DELETE(_request: Request, { params }: Params) {
  const { viewId } = await params;
  const existing = await prisma.view.findUnique({ where: { id: viewId } });
  if (!existing) {
    return Response.json({ error: "View not found" }, { status: 404 });
  }

  await prisma.view.delete({ where: { id: viewId } });
  return new Response(null, { status: 204 });
}
