"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

type Crumb = { id: string; title: string; icon: string | null };

export function Breadcrumb({ pageId }: { pageId: string }) {
  const { data } = useQuery({
    queryKey: ["ancestors", pageId],
    queryFn: () => api.get<Crumb[]>(`/api/pages/${pageId}/ancestors`),
  });

  if (!data) return <div className="h-5" />;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {data.map((crumb, i) => (
        <span key={crumb.id} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 opacity-50" />}
          <Link
            href={`/p/${crumb.id}`}
            className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
          >
            {crumb.icon && <span>{crumb.icon}</span>}
            <span className="max-w-[16rem] truncate">
              {crumb.title || "Untitled"}
            </span>
          </Link>
        </span>
      ))}
    </nav>
  );
}
