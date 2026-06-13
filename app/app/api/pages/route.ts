import { prisma } from "@/lib/prisma";

// GET /api/pages — list root pages (parentId is null), or children of a page
// when a `?parentId=` query param is supplied.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentParam = searchParams.get("parentId");
  const pages = await prisma.page.findMany({
    where: { parentId: parentParam ?? null },
    include: { database: { select: { id: true } }, entry: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(
    pages.map((p) => ({
      ...p,
      isDatabase: !!p.database,
      databaseId: p.database?.id ?? null,
      isEntry: !!p.entry,
    }))
  );
}

// POST /api/pages — create a root or child page
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { title, parentId, icon, coverUrl, blocksContent } = body ?? {};

  const page = await prisma.page.create({
    data: {
      title: typeof title === "string" ? title : "Untitled",
      parentId: parentId ?? null,
      icon: icon ?? null,
      coverUrl: coverUrl ?? null,
      blocksContent: blocksContent ?? [],
    },
  });

  return Response.json(page, { status: 201 });
}
