import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/databases/:id/templates — list template entries (id, title, updatedAt).
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const templates = await prisma.entry.findMany({
    where: { databaseId: id, isTemplate: true },
    include: { page: { select: { title: true, icon: true, updatedAt: true } } },
    orderBy: { page: { updatedAt: "desc" } },
  });

  return Response.json(
    templates.map((t) => ({
      id: t.id,
      title: t.page.title,
      icon: t.page.icon,
      updatedAt: t.page.updatedAt.toISOString(),
    }))
  );
}
