"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  Plus,
  FileText,
  Database as DatabaseIcon,
  MoreHorizontal,
  Trash2,
  PanelLeft,
} from "lucide-react";
import {
  usePageChildren,
  useCreatePage,
  useCreateDatabase,
  useDeletePage,
  type PageTreeNode,
} from "@/lib/queries";
import { useConfirm } from "@/components/ui/confirm";
import { Popover } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function Sidebar({ onToggle }: { onToggle: () => void }) {
  const createPage = useCreatePage();
  const createDatabase = useCreateDatabase();
  const router = useRouter();

  const handleNewPage = async () => {
    const page = await createPage.mutateAsync({ title: "Untitled", parentId: null });
    router.push(`/p/${page.id}`);
  };

  const handleNewDatabase = async () => {
    const { pageId } = await createDatabase.mutateAsync({
      name: "Untitled Database",
      parentId: null,
    });
    router.push(`/p/${pageId}`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <Link href="/" className="text-sm font-semibold text-foreground">
          Workspace
        </Link>
        <button
          onClick={onToggle}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <RootTree />
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-border p-2">
        <Popover
          align="start"
          side="top"
          className="min-w-44"
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-4" />
              New
            </button>
          )}
        >
          {(close) => (
            <div className="w-44">
              <button
                onClick={() => {
                  close();
                  handleNewPage();
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              >
                <FileText className="size-4" />
                Page
              </button>
              <button
                onClick={() => {
                  close();
                  handleNewDatabase();
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              >
                <DatabaseIcon className="size-4" />
                Database
              </button>
            </div>
          )}
        </Popover>
        <ThemeToggle />
      </div>
    </div>
  );
}

function RootTree() {
  const { data, isLoading } = usePageChildren(null);
  if (isLoading) {
    return <div className="px-2 py-2 text-xs text-muted-foreground">Loading…</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="px-2 py-2 text-xs text-muted-foreground">No pages yet.</div>
    );
  }
  return (
    <div className="space-y-0.5">
      {data.map((page) => (
        <SidebarNode key={page.id} page={page} depth={0} />
      ))}
    </div>
  );
}

function SidebarNode({ page, depth }: { page: PageTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const deletePage = useDeletePage();
  const createPage = useCreatePage();
  const createDatabase = useCreateDatabase();

  const active = params?.id === page.id;
  const childrenQuery = usePageChildren(expanded ? page.id : null);

  const handleAddPageInside = async () => {
    setMenuOpen(false);
    const child = await createPage.mutateAsync({
      title: "Untitled",
      parentId: page.id,
    });
    setExpanded(true);
    router.push(`/p/${child.id}`);
  };

  const handleAddDatabaseInside = async () => {
    setMenuOpen(false);
    const { pageId } = await createDatabase.mutateAsync({
      name: "Untitled Database",
      parentId: page.id,
    });
    setExpanded(true);
    router.push(`/p/${pageId}`);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    const ok = await confirm({
      title: `Delete '${page.title}'?`,
      message: "This cannot be undone.",
    });
    if (!ok) return;
    await deletePage.mutateAsync(page.id);
    if (active) router.push("/");
  };

  const Icon = page.isDatabase ? DatabaseIcon : FileText;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-0.5 rounded-md pr-1 text-sm",
          active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
        )}
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          className="rounded p-0.5 hover:bg-muted"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </button>

        <Link
          href={`/p/${page.id}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1"
        >
          {page.icon ? (
            <span className="text-sm leading-none">{page.icon}</span>
          ) : (
            <Icon className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{page.title || "Untitled"}</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
            aria-label="Page actions"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-40 mt-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg">
                <button
                  onClick={handleAddPageInside}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <FileText className="size-3.5" />
                  Add page inside
                </button>
                <button
                  onClick={handleAddDatabaseInside}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <DatabaseIcon className="size-3.5" />
                  Add database inside
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-muted"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div>
          {childrenQuery.data && childrenQuery.data.length > 0 ? (
            childrenQuery.data.map((child) => (
              <SidebarNode key={child.id} page={child} depth={depth + 1} />
            ))
          ) : (
            <div
              className="py-1 text-xs text-muted-foreground"
              style={{ paddingLeft: (depth + 1) * 12 + 20 }}
            >
              {childrenQuery.isLoading ? "Loading…" : "No pages inside"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
