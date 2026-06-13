import { prisma } from "@/lib/prisma";
import { json } from "@/lib/json";
import type { EntryValues } from "@/lib/types";

type Params = { params: Promise<{ id: string; entryId: string }> };

// POST /api/databases/:id/entries/:entryId/duplicate
// Deep-copies the entry and its top-level page (blocksContent included). The new
// entry is independent and not a template. Child pages are not recursively copied.
// Optional body `values` overrides/merges onto the copy's values (used to pre-set
// the grouping property when creating from a template in a Kanban column).
export async function POST(request: Request, { params }: Params) {
  const { id, entryId } = await params;
  const source = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { page: true },
  });
  if (!source) {
    return Response.json({ error: "Entry not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const overrideValues = (body?.values as EntryValues) ?? {};

  const newPage = await prisma.page.create({
    data: {
      title: source.page.title,
      icon: source.page.icon,
      coverUrl: source.page.coverUrl,
      blocksContent: json(source.page.blocksContent ?? []),
      parentId: source.page.parentId,
    },
  });

  const newEntry = await prisma.entry.create({
    data: {
      pageId: newPage.id,
      databaseId: id,
      isTemplate: false,
      values: json({
        ...((source.values as EntryValues) ?? {}),
        ...overrideValues,
      }),
    },
  });

  return Response.json(
    {
      id: newEntry.id,
      pageId: newEntry.pageId,
      databaseId: newEntry.databaseId,
      isTemplate: newEntry.isTemplate,
      values: (newEntry.values as EntryValues) ?? {},
      title: newPage.title,
      icon: newPage.icon,
      updatedAt: newPage.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
