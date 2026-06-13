"use client";

import { useEffect, useRef } from "react";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
// The base @blocknote/react only exports BlockNoteViewRaw, which renders the
// editor content but NOT the UI menus (slash menu, formatting toolbar) — those
// need a components provider. @blocknote/mantine's BlockNoteView wraps the raw
// view and supplies that provider + theme, so menus actually render.
import { BlockNoteView } from "@blocknote/mantine";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  type PartialBlock,
} from "@blocknote/core";
import { Database as DatabaseIcon } from "lucide-react";
import { databaseBlockSpec } from "@/components/editor/database-block";
import { useCreateDatabase } from "@/lib/queries";
import { useThemeStore } from "@/lib/stores";

// Editor schema: default blocks + our custom inline "database" block.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    database: databaseBlockSpec,
  },
});

// Debounced block editor. Persists the document 1000ms after the last edit and
// flushes any pending change on tab close (beforeunload). Supports a `/database`
// slash command that creates a database and embeds it inline.
export function BlockEditor({
  pageId,
  initialContent,
  onSave,
  onPendingChange,
}: {
  pageId?: string;
  initialContent: unknown;
  onSave: (blocks: unknown) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const editor = useCreateBlockNote({
    schema,
    initialContent:
      Array.isArray(initialContent) && initialContent.length > 0
        ? (initialContent as PartialBlock[])
        : undefined,
  });
  const createDatabase = useCreateDatabase();
  const theme = useThemeStore((s) => s.resolved);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBlocks = useRef<unknown>(null);

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pendingBlocks.current !== null) {
      onSave(pendingBlocks.current);
      pendingBlocks.current = null;
      onPendingChange?.(false);
    }
  };

  useEffect(() => {
    const handler = () => flush();
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      // Flush on unmount (navigating away) so edits aren't lost.
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = () => {
    pendingBlocks.current = editor.document;
    onPendingChange?.(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flush();
    }, 1000);
  };

  // Slash menu: default items plus a "/database" item that creates a database
  // (parented to this page) and inserts a reference block.
  const getSlashItems = async (
    query: string
  ): Promise<DefaultReactSuggestionItem[]> => {
    const databaseItem: DefaultReactSuggestionItem = {
      title: "Database",
      subtext: "Embed a database with Kanban, Calendar, Table views",
      aliases: ["database", "db", "board", "kanban", "table"],
      group: "Advanced",
      icon: <DatabaseIcon className="size-4" />,
      onItemClick: async () => {
        const { databaseId } = await createDatabase.mutateAsync({
          name: "Untitled Database",
          parentId: pageId ?? null,
        });
        const ref = editor.getTextCursorPosition().block;
        editor.insertBlocks(
          [{ type: "database", props: { databaseId } }],
          ref,
          "after"
        );
      },
    };
    return filterSuggestionItems(
      [...getDefaultReactSlashMenuItems(editor), databaseItem],
      query
    );
  };

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme={theme}
      className="-mx-[54px]"
      slashMenu={false}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={getSlashItems}
      />
    </BlockNoteView>
  );
}
