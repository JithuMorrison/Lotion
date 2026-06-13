import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/databases/:id — database with its properties and views.
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const database = await prisma.database.findUnique({
    where: { id },
    include: {
      page: { select: { title: true } },
      properties: true,
      views: true,
    },
  });

  if (!database) {
    return Response.json({ error: "Database not found" }, { status: 404 });
  }

  return Response.json({
    id: database.id,
    pageId: database.pageId,
    name: database.page.title,
    properties: database.properties,
    views: database.views,
  });
}
