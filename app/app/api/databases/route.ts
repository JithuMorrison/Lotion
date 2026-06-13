import { prisma } from "@/lib/prisma";

// GET /api/databases — list all databases (id + name via parent page title)
export async function GET() {
  const databases = await prisma.database.findMany({
    include: { page: { select: { title: true } } },
  });
  return Response.json(
    databases.map((d) => ({
      id: d.id,
      pageId: d.pageId,
      name: d.page.title,
    }))
  );
}

// POST /api/databases — create a database together with its parent page.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { name, parentId } = body ?? {};

  const page = await prisma.page.create({
    data: {
      title: typeof name === "string" && name ? name : "Untitled Database",
      parentId: parentId ?? null,
      blocksContent: [],
    },
  });

  const database = await prisma.database.create({
    data: { pageId: page.id },
  });

  // Seed a default Status property and a default board + table view so the
  // database is immediately usable.
  const status = await prisma.property.create({
    data: {
      name: "Status",
      type: "status",
      databaseId: database.id,
      options: [
        { label: "To Do", color: "gray" },
        { label: "In Progress", color: "blue" },
        { label: "Done", color: "green" },
      ],
    },
  });

  await prisma.view.create({
    data: {
      name: "Board",
      type: "kanban",
      databaseId: database.id,
      config: {
        groupingPropertyId: status.id,
        visibleProperties: [],
        filters: [],
        sorts: [],
      },
    },
  });
  await prisma.view.create({
    data: {
      name: "Table",
      type: "table",
      databaseId: database.id,
      config: { filters: [], sorts: [] },
    },
  });

  return Response.json(
    { databaseId: database.id, pageId: page.id },
    { status: 201 }
  );
}
