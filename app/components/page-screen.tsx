"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Database as DatabaseIcon } from "lucide-react";
import { usePage, useUpdatePage, useCreateDatabase } from "@/lib/queries";
import { useEditorStore } from "@/lib/stores";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/editor/page-header";
import { BlockEditor } from "@/components/editor/block-editor";
import { ErrorBoundary } from "@/components/editor/error-boundary";
import { DatabaseScreen } from "@/components/database/database-screen";
import { EntryProperties } from "@/components/entry-properties";

interface PageData {
  id: string;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  blocksContent: unknown;
  isDatabase: boolean;
  databaseId: string | null;
  entryId?: string | null;
  entryDatabaseId?: string | null;
}

export function PageScreen({ pageId }: { pageId: string }) {
  const { data, isLoading } = usePage(pageId) as {
    data: PageData | undefined;
    isLoading: boolean;
  };
  const updatePage = useUpdatePage();
  const createDatabase = useCreateDatabase();
  const router = useRouter();
  const qc = useQueryClient();
  const { saveStatus, setSaving, setSaved, setIdle } = useEditorStore();
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaved = useCallback(() => {
    setSaved();
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setIdle(), 2000);
  }, [setSaved, setIdle]);

  const persist = useCallback(
    (patch: Partial<PageData>) => {
      setSaving();
      updatePage.mutate(
        { id: pageId, ...patch },
        { onSuccess: () => markSaved() }
      );
    },
    [pageId, updatePage, setSaving, markSaved]
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Page not found.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 pl-12">
        <Breadcrumb pageId={pageId} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        <PageHeader
          key={pageId}
          title={data.title}
          icon={data.icon}
          coverUrl={data.coverUrl}
          saveStatus={saveStatus}
          onTitleChange={(title) => persist({ title })}
          onIconChange={(icon) => persist({ icon })}
          onCoverChange={(coverUrl) => persist({ coverUrl })}
        />

        {data.isDatabase && data.databaseId ? (
          <div className="mt-4 h-[calc(100vh-220px)]">
            <DatabaseScreen databaseId={data.databaseId} />
          </div>
        ) : (
          <>
            {data.entryId && data.entryDatabaseId && (
              <EntryProperties
                entryId={data.entryId}
                databaseId={data.entryDatabaseId}
              />
            )}
            <div className="mx-auto mt-4 max-w-3xl px-14">
              <ErrorBoundary>
                <BlockEditor
                  key={pageId}
                  pageId={pageId}
                  initialContent={data.blocksContent}
                  onPendingChange={(pending) => pending && setSaving()}
                  onSave={(blocks) => {
                    updatePage.mutate(
                      { id: pageId, blocksContent: blocks as unknown as never },
                      {
                        onSuccess: () => {
                          markSaved();
                          qc.invalidateQueries({ queryKey: ["page", pageId] });
                        },
                      }
                    );
                  }}
                />
              </ErrorBoundary>

              <button
                onClick={async () => {
                  const { pageId: newId } = await createDatabase.mutateAsync({
                    name: "Untitled Database",
                    parentId: pageId,
                  });
                  router.push(`/p/${newId}`);
                }}
                className="mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <DatabaseIcon className="size-4" />
                Add a database
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-14 pt-16">
      <div className="mb-4 h-16 w-16 animate-pulse rounded-lg bg-muted" />
      <div className="mb-6 h-10 w-2/3 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-muted"
            style={{ width: `${90 - i * 8}%` }}
          />
        ))}
      </div>
    </div>
  );
}
