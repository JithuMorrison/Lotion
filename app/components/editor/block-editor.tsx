"use client";

import { useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
  FormattingToolbarController,
  FormattingToolbar,
  BlockTypeSelect,
  BasicTextStyleButton,
  TextAlignButton,
  ColorStyleButton,
  NestBlockButton,
  UnnestBlockButton,
  CreateLinkButton,
  useBlockNoteEditor,
} from "@blocknote/react";

// The base @blocknote/react only exports BlockNoteViewRaw, which renders the
// editor content but NOT the UI menus (slash menu, formatting toolbar) — those
// need a components provider. @blocknote/mantine's BlockNoteView wraps the raw
// view and supplies that provider + theme, so menus actually render.
import { BlockNoteView } from "@blocknote/mantine";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultStyleSpecs,
  defaultInlineContentSpecs,
  filterSuggestionItems,
  type PartialBlock,
} from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import { withMultiColumn, locales as multiColumnLocales } from "@blocknote/xl-multi-column";
import { Database as DatabaseIcon, FileText, Sigma } from "lucide-react";
import { createReactStyleSpec } from "@blocknote/react";

// Keep equation as a style spec for backward compatibility with saved content
const EquationStyle = createReactStyleSpec(
  { type: "equation", propSchema: "string" },
  { render: (props) => <span className="bn-equation" ref={props.contentRef} /> }
);

import { databaseBlockSpec } from "@/components/editor/database-block";
import { pageBlockSpec } from "@/components/editor/page-block";
import { equationInlineSpec } from "@/components/editor/equation-inline";
import { createReactBlockSpec } from "@blocknote/react";

// Minimal legacy block spec for backward compatibility with old saved pages
const legacyEquationBlockSpec = createReactBlockSpec(
  {
    type: "mathEquation",
    propSchema: { formula: { default: "" } },
    content: "none",
  },
  {
    render: (props) => (
      <div className="text-muted-foreground text-sm p-2 border border-dashed rounded bg-muted/30">
        Math (Legacy Block): {props.block.props.formula}
      </div>
    ),
  }
)();
import { useCreateDatabase, useCreatePage } from "@/lib/queries";
import { useThemeStore } from "@/lib/stores";

// Editor schema: default blocks + our custom blocks.
// We override the default "video" block with our custom one that supports YouTube.
const schema = withMultiColumn(BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,

    database: databaseBlockSpec,
    page: pageBlockSpec,
    mathEquation: legacyEquationBlockSpec,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    inlineEquation: equationInlineSpec,
  },
  styleSpecs: {
    ...defaultStyleSpecs,
    equation: EquationStyle,
  },
}));

// Toolbar button that inserts a KaTeX equation block below the current block
function EquationToolbarButton() {
  const editor = useBlockNoteEditor();

  return (
    <button
      className="bn-button"
      onClick={() => {
        const currentBlock = editor.getTextCursorPosition().block;
        // Get selected text to use as initial formula
        let formula = "";
        try {
          // @ts-ignore - accessing internal tiptap editor
          const tiptap = editor._tiptapEditor;
          const { from, to } = tiptap.state.selection;
          if (from !== to) {
            formula = tiptap.state.doc.textBetween(from, to);
          }
        } catch {
          // ignore
        }
        // Delete selected text if any, then insert inline content
        editor.insertInlineContent([{ type: "inlineEquation", props: { formula } }] as any);
      }}
      title="Insert Equation"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "28px",
        height: "28px",
        padding: "0 4px",
        background: "transparent",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        color: "inherit"
      }}
    >
      <Sigma size={16} />
    </button>
  );
}

const CustomFormattingToolbar = (props: any) => {
  return (
    <FormattingToolbar {...props}>
      <BlockTypeSelect key={"blockTypeSelect"} />
      <BasicTextStyleButton basicTextStyle={"bold"} key={"boldStyleButton"} />
      <BasicTextStyleButton basicTextStyle={"italic"} key={"italicStyleButton"} />
      <BasicTextStyleButton basicTextStyle={"underline"} key={"underlineStyleButton"} />
      <BasicTextStyleButton basicTextStyle={"strike"} key={"strikeStyleButton"} />
      <BasicTextStyleButton basicTextStyle={"code"} key={"codeStyleButton"} />
      <EquationToolbarButton key={"equationStyleButton"} />
      <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />
      <TextAlignButton textAlignment={"center"} key={"textAlignCenterButton"} />
      <TextAlignButton textAlignment={"right"} key={"textAlignRightButton"} />
      <ColorStyleButton key={"colorStyleButton"} />
      <NestBlockButton key={"nestBlockButton"} />
      <UnnestBlockButton key={"unnestBlockButton"} />
      <CreateLinkButton key={"createLinkButton"} />
    </FormattingToolbar>
  );
};

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
    dictionary: {
      ...locales.en,
      slash_menu: {
        ...locales.en.slash_menu,
        database_subtext: "Inline database",
      },
    },
    uploadFile: async (file: File) => {
      // Handle image paste/upload
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        return new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      return "";
    },
  });

  // Log clipboard data on paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const html = e.clipboardData?.getData("text/html");
      const plain = e.clipboardData?.getData("text/plain");

      console.log("========== AVAILABLE CLIPBOARD TYPES ==========");
      console.log(e.clipboardData?.types);
      console.log("\n========== PASTED HTML ==========");
      console.log(html);
      console.log("\n========== PASTED PLAIN TEXT ==========");
      console.log(plain);

      // Try to get Notion's custom format if available
      const types = e.clipboardData?.types || [];
      types.forEach((type) => {
        if (type.includes("notion") || type.includes("application")) {
          console.log(`\n========== ${type} ==========`);
          try {
            const data = e.clipboardData?.getData(type);
            console.log(data);
          } catch (err) {
            console.log("(Unable to read this format)");
          }
        }
      });

      if (html) {
        console.log("\n========== FORMATTED HTML ==========");
        const div = document.createElement("div");
        div.innerHTML = html;
        console.log(div.innerHTML);
      }
      console.log("=====================================\n");
    };

    const editorElement = document.querySelector(".bn-editor");
    if (editorElement) {
      editorElement.addEventListener("paste", handlePaste as any);
      return () => editorElement.removeEventListener("paste", handlePaste as any);
    }
  }, [editor]);

  const themeStore = useThemeStore();
  const theme = themeStore.theme === "system" ? "light" : themeStore.theme;

  const createDatabase = useCreateDatabase();
  const createPage = useCreatePage();
  const router = useRouter();

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

  // Slash menu: default items plus custom items.
  const getSlashItems = useMemo(() => {
    return async (query: string): Promise<DefaultReactSuggestionItem[]> => {
      const databaseItem: DefaultReactSuggestionItem = {
        title: "Database",
        subtext: "Embed a database with Kanban, Calendar, Table views",
        aliases: ["database", "db", "board", "kanban", "table"],
        group: "Embeds",
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

      const pageItem: DefaultReactSuggestionItem = {
        title: "Page",
        subtext: "Create a subpage inside this page",
        aliases: ["page", "subpage"],
        group: "Embeds",
        icon: <FileText className="size-4" />,
        onItemClick: async () => {
          const page = await createPage.mutateAsync({
            title: "Untitled",
            parentId: pageId ?? null,
          });
          const ref = editor.getTextCursorPosition().block;
          editor.replaceBlocks(
            [ref],
            [
              {
                type: "page" as any,
                props: { pageId: page.id, title: page.title },
              },
            ]
          );
          onSave(editor.document);
          router.push(`/p/${page.id}`);
        },
      };

      // Equation block
      const equationItem: DefaultReactSuggestionItem = {
        title: "Equation",
        subtext: "Render a LaTeX math equation",
        aliases: ["equation", "math", "latex", "formula", "katex"],
        group: "Math",
        icon: <Sigma className="size-4" />,
        onItemClick: () => {
          editor.insertInlineContent([{ type: "inlineEquation", props: { formula: "" } }] as any);
        },
      };

      // Add multi-column options
      const columnItems = [2, 3, 4, 5].map(
        (n): DefaultReactSuggestionItem => ({
          title: `${n} Column`,
          subtext: `${n} columns side by side`,
          aliases: [`${n}col`, `${n}columns`, "columns"],
          group: "Layout",
          icon: <DatabaseIcon className="size-4" />,
          onItemClick: () => {
            const ref = editor.getTextCursorPosition().block;
            editor.replaceBlocks(
              [ref],
              [
                {
                  type: "columnList" as any,
                  children: Array.from({ length: n }, () => ({
                    type: "column" as any,
                    children: [{ type: "paragraph" as any }],
                  })),
                },
              ]
            );
          },
        })
      );

      return filterSuggestionItems(
        [
          ...getDefaultReactSlashMenuItems(editor),
          databaseItem,
          pageItem,
          equationItem,
          ...columnItems,
        ],
        query
      );
    };
  }, [editor, pageId, createDatabase, createPage, router, onSave]);

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme={theme}
      className="-mx-[54px]"
      slashMenu={false}
      formattingToolbar={false}
    >
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={getSlashItems}
      />
    </BlockNoteView>
  );
}
