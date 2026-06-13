import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; propertyId: string }> };

// PATCH — rename, retype, or update options on a property.
export async function PATCH(request: Request, { params }: Params) {
  const { propertyId } = await params;
  const existing = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!existing) {
    return Response.json({ error: "Property not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type;
  if (body.options !== undefined) data.options = body.options;

  const property = await prisma.property.update({
    where: { id: propertyId },
    data,
  });
  return Response.json(property);
}

// DELETE — remove a property.
export async function DELETE(_request: Request, { params }: Params) {
  const { propertyId } = await params;
  const existing = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!existing) {
    return Response.json({ error: "Property not found" }, { status: 404 });
  }

  await prisma.property.delete({ where: { id: propertyId } });
  return new Response(null, { status: 204 });
}
