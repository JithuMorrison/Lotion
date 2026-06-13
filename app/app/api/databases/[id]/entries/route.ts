import { prisma } from "@/lib/prisma";
import { json } from "@/lib/json";
import type { EntryValues } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

// GET /api/databases/:id/entries — list entries, excluding templates.
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const entries = await prisma.entry.findMany({
    where: { databaseId: id, isTemplate: false },
    include: { page: true },
    orderBy: { page: { createdAt: "asc" } },
  });

  return Response.json(
    entries.map((e) => ({
      id: e.id,
      pageId: e.pageId,
      databaseId: e.databaseId,
      isTemplate: e.isTemplate,
      values: (e.values as EntryValues) ?? {},
      title: e.page.title,
      icon: e.page.icon,
      updatedAt: e.page.updatedAt.toISOString(),
    }))
  );
}

// POST /api/databases/:id/entries — create an entry with a backing page.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { title, values, blocksContent } = body ?? {};

  // The entry's page lives under the database's page.
  const database = await prisma.database.findUnique({
    where: { id },
    select: { pageId: true },
  });
  if (!database) {
    return Response.json({ error: "Database not found" }, { status: 404 });
  }

  const page = await prisma.page.create({
    data: {
      title: typeof title === "string" && title ? title : "Untitled",
      parentId: database.pageId,
      blocksContent: json(blocksContent ?? []),
    },
  });

  const entry = await prisma.entry.create({
    data: {
      pageId: page.id,
      databaseId: id,
      values: json((values as EntryValues) ?? {}),
    },
  });

  return Response.json(
    {
      id: entry.id,
      pageId: entry.pageId,
      databaseId: entry.databaseId,
      isTemplate: entry.isTemplate,
      values: (entry.values as EntryValues) ?? {},
      title: page.title,
      icon: page.icon,
      updatedAt: page.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
