import { prisma } from "@/lib/prisma";
import type { EntryDTO, EntryValues } from "@/lib/types";

// Serialize an Entry joined with its Page into the API/DTO shape.
export async function serializeEntry(entryId: string): Promise<EntryDTO | null> {
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { page: true },
  });
  if (!entry) return null;
  return {
    id: entry.id,
    pageId: entry.pageId,
    databaseId: entry.databaseId,
    isTemplate: entry.isTemplate,
    values: (entry.values as EntryValues) ?? {},
    title: entry.page.title,
    icon: entry.page.icon,
    updatedAt: entry.page.updatedAt.toISOString(),
  };
}
