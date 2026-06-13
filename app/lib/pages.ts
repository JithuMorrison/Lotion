import { prisma } from "@/lib/prisma";

// Recursively delete a page, its descendants, and any associated Entry /
// Database rows. Implemented explicitly (not via Prisma onDelete cascade) so the
// behavior is testable. Deletion is silent — no error if children exist.
export async function deletePageRecursive(pageId: string): Promise<void> {
  const children = await prisma.page.findMany({
    where: { parentId: pageId },
    select: { id: true },
  });

  for (const child of children) {
    await deletePageRecursive(child.id);
  }

  // Delete the Entry row first (if this page is a database row), then the page.
  await prisma.entry.deleteMany({ where: { pageId } });

  // If this page hosts a database, tear down its dependents first.
  const database = await prisma.database.findUnique({
    where: { pageId },
    select: { id: true },
  });
  if (database) {
    await prisma.entry.deleteMany({ where: { databaseId: database.id } });
    await prisma.view.deleteMany({ where: { databaseId: database.id } });
    await prisma.property.deleteMany({ where: { databaseId: database.id } });
    await prisma.database.delete({ where: { id: database.id } });
  }

  await prisma.page.delete({ where: { id: pageId } });
}
