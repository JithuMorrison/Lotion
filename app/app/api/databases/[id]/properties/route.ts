import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST /api/databases/:id/properties — add a property.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { name, type, options } = body ?? {};

  if (!name || !type) {
    return Response.json(
      { error: "name and type are required" },
      { status: 400 }
    );
  }

  const property = await prisma.property.create({
    data: {
      name,
      type,
      databaseId: id,
      options: options ?? null,
    },
  });

  return Response.json(property, { status: 201 });
}
