import { prisma } from "@/lib/prisma";
import { deletePageRecursive } from "@/lib/pages";

type Params = { params: Promise<{ id: string }> };

// GET /api/pages/:id
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      database: { select: { id: true } },
      entry: { select: { id: true, databaseId: true } },
    },
  });

  if (!page) {
    return Response.json({ error: "Page not found" }, { status: 404 });
  }

  return Response.json({
    ...page,
    isDatabase: !!page.database,
    databaseId: page.database?.id ?? null,
    entryId: page.entry?.id ?? null,
    entryDatabaseId: page.entry?.databaseId ?? null,
  });
}

// PATCH /api/pages/:id — update title, icon, coverUrl, blocksContent, parentId
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Page not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.icon !== undefined) data.icon = body.icon;
  if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;
  // blocksContent is treated as an opaque blob — no schema validation.
  if (body.blocksContent !== undefined) data.blocksContent = body.blocksContent;
  if (body.parentId !== undefined) data.parentId = body.parentId;

  const page = await prisma.page.update({ where: { id }, data });
  return Response.json(page);
}

// DELETE /api/pages/:id — recursive cascade delete; also deletes Entry rows.
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Page not found" }, { status: 404 });
  }

  await deletePageRecursive(id);
  return new Response(null, { status: 204 });
}
