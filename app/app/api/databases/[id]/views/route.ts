import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/databases/:id/views
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const views = await prisma.view.findMany({ where: { databaseId: id } });
  return Response.json(views);
}

// POST /api/databases/:id/views — create a view.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { name, type, config } = body ?? {};

  if (!name || !type) {
    return Response.json(
      { error: "name and type are required" },
      { status: 400 }
    );
  }

  const view = await prisma.view.create({
    data: {
      name,
      type,
      databaseId: id,
      config: config ?? {},
    },
  });

  return Response.json(view, { status: 201 });
}
