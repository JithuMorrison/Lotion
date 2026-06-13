import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/pages/:id/ancestors — the breadcrumb chain from root to this page.
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const chain: { id: string; title: string; icon: string | null }[] = [];

  let currentId: string | null = id;
  const seen = new Set<string>();
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const page: {
      id: string;
      title: string;
      icon: string | null;
      parentId: string | null;
    } | null = await prisma.page.findUnique({
      where: { id: currentId },
      select: { id: true, title: true, icon: true, parentId: true },
    });
    if (!page) break;
    chain.unshift({ id: page.id, title: page.title, icon: page.icon });
    currentId = page.parentId;
  }

  return Response.json(chain);
}
