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

// Notion clipboard parsing — converts Notion's block tree to BlockNote PartialBlocks
// with correct nesting for toggleable blocks and their child elements.

interface NotionBlockValue {
  id: string;
  type: string;
  properties?: Record<string, any[][]>;
  content?: string[];
  format?: { toggleable?: boolean };
}

interface NotionBlockEntry {
  spaceId: string;
  value: NotionBlockValue;
}

const INLINE_CONTENT_BLOCKS = new Set([
  "paragraph", "heading", "bulletListItem", "numberedListItem",
  "checkListItem", "toggleListItem", "codeBlock", "quote",
]);

function notionTitleToInlineContent(titleArr: any[][] | undefined): any[] {
  if (!titleArr) return [];
  const result: any[] = [];
  for (const item of titleArr) {
    if (typeof item === "string") {
      if (item) result.push({ type: "text", text: item, styles: {} });
      continue;
    }
    if (!Array.isArray(item)) continue;
    const [text, formats] = item;
    if (text === "‣") {
      if (Array.isArray(formats)) {
        for (const fmt of formats) {
          if (Array.isArray(fmt) && fmt[0] === "lm" && fmt[1]) {
            result.push({
              type: "link",
              href: fmt[1].href || "",
              content: [{ type: "text", text: fmt[1].title || fmt[1].href || "" }],
            });
          }
        }
      }
    } else if (typeof text === "string") {
      const styles: Record<string, any> = {};
      if (Array.isArray(formats)) {
        for (const fmt of formats) {
          if (!Array.isArray(fmt)) continue;
          if (fmt[0] === "b") styles.bold = true;
          else if (fmt[0] === "i") styles.italic = true;
          else if (fmt[0] === "u") styles.underline = true;
          else if (fmt[0] === "s") styles.strikethrough = true;
          else if (fmt[0] === "c") styles.code = true;
        }
      }
      // ProseMirror's code mark has excludes: '_', so it can't coexist with
      // bold/italic/underline/strikethrough. When code is present, drop others.
      if (styles.code) {
        delete styles.bold;
        delete styles.italic;
        delete styles.underline;
        delete styles.strikethrough;
      }
      if (text) result.push({ type: "text", text, styles });
    }
  }
  return result;
}

function notionTypeToBlockNote(value: NotionBlockValue): { type: string; props?: any } {
  const isToggle = !!value.format?.toggleable;
  switch (value.type) {
    case "header":
      return { type: "heading", props: { level: 1, ...(isToggle ? { isToggleable: true } : {}) } };
    case "sub_header":
      return { type: "heading", props: { level: 2, ...(isToggle ? { isToggleable: true } : {}) } };
    case "sub_sub_header":
      return { type: "heading", props: { level: 3, ...(isToggle ? { isToggleable: true } : {}) } };
    case "text":
      return isToggle ? { type: "toggleListItem" } : { type: "paragraph" };
    case "bulleted_list": case "bulletedList": return { type: "bulletListItem" };
    case "numbered_list": case "numberedList": return { type: "numberedListItem" };
    case "to_do": return { type: "checkListItem", props: { checked: value.properties?.checked?.[0]?.[0] === "true" } };
    case "toggle": return { type: "toggleListItem" };
    case "code": return { type: "codeBlock", props: { language: String(value.properties?.language?.[0]?.[0] || "plaintext") } };
    case "quote": return { type: "quote" };
    case "divider": return { type: "divider" };
    case "callout": return { type: "paragraph" };
    case "image": return { type: "image", props: { url: String(value.properties?.source?.[0]?.[0] || "") } };
    default: return { type: "paragraph" };
  }
}

function buildBlockTree(
  blockId: string,
  blockMap: Record<string, NotionBlockEntry>,
  visited: Set<string>
): PartialBlock | null {
  if (visited.has(blockId)) return null;
  visited.add(blockId);
  const entry = blockMap[blockId];
  if (!entry?.value) return null;
  const value = entry.value;
  const { type, props } = notionTypeToBlockNote(value);
  const block: PartialBlock = { type: type as any, props } as any;
  if (INLINE_CONTENT_BLOCKS.has(type)) {
    block.content = notionTitleToInlineContent(value.properties?.title);
  }
  const childIds = value.content || [];
  if (childIds.length > 0) {
    const children: PartialBlock[] = [];
    for (const childId of childIds) {
      const child = buildBlockTree(childId, blockMap, visited);
      if (child) children.push(child);
    }
    if (children.length > 0) block.children = children;
  }
  return block;
}

function parseNotionClipboard(data: string): PartialBlock[] {
  try {
    const parsed = JSON.parse(data);

    // notion-multi-text-production: { blockSelection: { blocks: [...] } }
    // notion-blocks-v3-production: { blocks: [...] }
    // Both formats use the same shape: array of { blockId, blockSubtree: { block: {...} } }
    const selections = parsed?.blockSelection?.blocks || parsed?.blocks;
    if (Array.isArray(selections)) {
      const result: PartialBlock[] = [];
      for (const sel of selections) {
        const blockMap = sel?.blockSubtree?.block;
        if (!blockMap) continue;
        const block = buildBlockTree(sel.blockId, blockMap, new Set());
        if (block) result.push(block);
      }
      return result;
    }

    return [];
  } catch {
    return [];
  }
}

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

  // Handle Notion clipboard paste — uses Notion's block tree for correct nesting
  // of toggleable blocks and their children. Falls back to BlockNote's default
  // HTML-based paste when Notion data is not available.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const types = e.clipboardData?.types || [];
      const notionType = types.find((t) =>
        t.includes("notion-multi-text") || t.includes("notion-blocks-v3")
      );
      const notionData = notionType ? e.clipboardData?.getData(notionType) : null;

      if (notionData) {
        const blocks = parseNotionClipboard(notionData);
        if (blocks.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const docBlocks = editor.document as any[];
          let refBlock = docBlocks[docBlocks.length - 1];
          try {
            const cursor = editor.getTextCursorPosition();
            const matched = docBlocks.find((b) => b.id === cursor?.block?.id);
            if (matched) refBlock = matched;
          } catch {}
          if (!refBlock) return;
          const isEmpty =
            refBlock.type === "paragraph" &&
            (!refBlock.content || (refBlock.content as any[]).length === 0);
          if (isEmpty) {
            editor.replaceBlocks([refBlock], blocks);
          } else {
            editor.insertBlocks(blocks, refBlock, "after");
          }
          return;
        }
      }
    };

    const editorElement = document.querySelector(".bn-editor");
    if (editorElement) {
      editorElement.addEventListener("paste", handlePaste as any, true);
      return () => editorElement.removeEventListener("paste", handlePaste as any, true);
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
