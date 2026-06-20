"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { FileText } from "lucide-react";
import Link from "next/link";
import { usePage } from "@/lib/queries";

function PageBlockView({ pageId }: { pageId: string }) {
  const { data: page } = usePage(pageId || null);

  if (!pageId) {
    return (
      <div className="flex items-center gap-2 rounded-md p-2 text-muted-foreground">
        <FileText className="size-4" />
        <span>Creating page…</span>
      </div>
    );
  }

  const title = page?.title || "Untitled";
  const icon = page?.icon;

  return (
    <div
      contentEditable={false}
      onMouseDown={(e) => e.stopPropagation()}
      className="my-1 flex"
    >
      <Link
        href={`/p/${pageId}`}
        className="page-embed-link flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors cursor-pointer text-foreground underline-offset-4"
      >
        {icon ? (
          <span className="text-base">{icon}</span>
        ) : (
          <FileText className="size-4 text-muted-foreground" />
        )}
        <span className="font-medium border-b border-muted-foreground/30 hover:border-foreground">
          {title}
        </span>
      </Link>
    </div>
  );
}

export const pageBlockSpec = createReactBlockSpec(
  {
    type: "page",
    propSchema: {
      pageId: { default: "" },
      title: { default: "Untitled" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <PageBlockView pageId={props.block.props.pageId} />
    ),
  }
)();
