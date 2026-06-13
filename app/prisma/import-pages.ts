import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, Prisma } from "../app/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });
const json = (v: unknown) => v as Prisma.InputJsonValue;

const PAGES_DIR = "/Users/zafontana/Desktop/Notion/data/pages";
const PARENT_TITLE = "Imported Notes";

// Per-file emoji icons (fallback 📄).
const ICONS: Record<string, string> = {
  "A Special Batch": "💡",
  "Client 0 - La Villa": "🤝",
  "Tools list": "🧰",
};

// --- Inline markdown → BlockNote inline content ----------------------------
type Inline =
  | { type: "text"; text: string; styles: Record<string, boolean> }
  | { type: "link"; href: string; content: { type: "text"; text: string; styles: Record<string, boolean> }[] };

function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re =
    /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushText = (s: string, styles: Record<string, boolean> = {}) => {
    if (s) out.push({ type: "text", text: s, styles });
  };
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) pushText(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push({
        type: "link",
        href: m[2],
        content: [{ type: "text", text: m[1], styles: {} }],
      });
    } else if (m[3] !== undefined) {
      pushText(m[3], { bold: true });
    } else if (m[4] !== undefined) {
      pushText(m[4], { bold: true });
    } else if (m[5] !== undefined) {
      pushText(m[5], { italic: true });
    } else if (m[6] !== undefined) {
      pushText(m[6], { code: true });
    }
    last = re.lastIndex;
  }
  if (last < text.length) pushText(text.slice(last));
  return out;
}

// --- Block builders --------------------------------------------------------
type Block = Record<string, unknown>;

const heading = (level: number, text: string): Block => ({
  type: "heading",
  props: { level: Math.min(Math.max(level, 1), 3) },
  content: parseInline(text),
});
const paragraph = (text: string): Block => ({
  type: "paragraph",
  content: parseInline(text),
});
const quote = (text: string): Block => ({
  type: "quote",
  content: parseInline(text),
});
const codeBlock = (text: string): Block => ({
  type: "codeBlock",
  props: { language: "text" },
  content: text ? [{ type: "text", text, styles: {} }] : [],
});
const divider = (): Block => ({ type: "divider" });
const listItem = (
  type: "bulletListItem" | "numberedListItem",
  text: string
): Block => ({ type, content: parseInline(text), children: [] });
const todoItem = (text: string, checked: boolean): Block => ({
  type: "checkListItem",
  props: { checked },
  content: parseInline(text),
});

// --- Markdown document → blocks --------------------------------------------
function markdownToBlocks(md: string): { title: string; blocks: Block[] } {
  // Normalise and drop callout wrapper tags (we keep the inner content).
  const rawLines = md
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "<aside>" && l.trim() !== "</aside>");

  // Title = first H1; remove it (and an immediately-following duplicate line).
  let title = "Untitled";
  let start = 0;
  for (let i = 0; i < rawLines.length; i++) {
    const h1 = rawLines[i].match(/^#\s+(.+)$/);
    if (h1) {
      title = h1[1].trim();
      start = i + 1;
      break;
    }
    if (rawLines[i].trim() !== "") break;
  }
  const lines = rawLines.slice(start);

  const roots: Block[] = [];
  // List-nesting stack: parents[d] = last list item at depth d.
  let parents: Block[] = [];
  const resetLists = () => {
    parents = [];
  };

  let inCode = false;
  let codeBuf: string[] = [];
  let tableBuf: string[] = [];

  const flushTable = () => {
    if (tableBuf.length === 0) return;
    // Best-effort: render the markdown table as a monospace code block,
    // skipping the separator row (|---|---|).
    const rows = tableBuf.filter((r) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(r));
    roots.push(codeBlock(rows.join("\n")));
    tableBuf = [];
  };

  for (const line of lines) {
    // Fenced code blocks.
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      if (inCode) {
        roots.push(codeBlock(codeBuf.join("\n")));
        codeBuf = [];
        inCode = false;
      } else {
        flushTable();
        resetLists();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // Tables (group consecutive pipe rows).
    if (/^\s*\|.*\|\s*$/.test(line)) {
      tableBuf.push(line);
      continue;
    } else if (tableBuf.length) {
      flushTable();
      resetLists();
    }

    if (line.trim() === "") continue; // blank line: separator, keep list stack

    // Headings.
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      roots.push(heading(h[1].length, h[2].trim()));
      resetLists();
      continue;
    }

    // Divider.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      roots.push(divider());
      resetLists();
      continue;
    }

    // Blockquote.
    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      roots.push(quote(q[1]));
      resetLists();
      continue;
    }

    // List items (compute nesting depth from indentation; 4 spaces / tab = 1).
    const indentMatch = line.match(/^(\s*)/);
    const indent = (indentMatch?.[1] ?? "").replace(/\t/g, "    ").length;
    const depth = Math.floor(indent / 4);
    const body = line.slice(indentMatch?.[0].length ?? 0);

    const todo = body.match(/^- \[([ xX])\]\s+(.*)$/);
    const bullet = body.match(/^[-*]\s+(.*)$/);
    const numbered = body.match(/^\d+\.\s+(.*)$/);

    if (todo || bullet || numbered) {
      let block: Block;
      if (todo) block = todoItem(todo[2], todo[1].toLowerCase() === "x");
      else if (numbered) block = listItem("numberedListItem", numbered[1]);
      else block = listItem("bulletListItem", bullet![1]);

      if (depth === 0 || parents.length === 0) {
        roots.push(block);
        parents = [block];
      } else {
        const d = Math.min(depth, parents.length);
        const parent = parents[d - 1];
        ((parent.children as Block[]) ??= []).push(block);
        parents = parents.slice(0, d);
        parents[d] = block;
      }
      continue;
    }

    // Fallback: paragraph.
    roots.push(paragraph(line.trim()));
    resetLists();
  }

  if (inCode && codeBuf.length) roots.push(codeBlock(codeBuf.join("\n")));
  flushTable();

  return { title, blocks: roots };
}

async function main() {
  // Idempotent: remove a previous "Imported Notes" tree.
  const existingParents = await prisma.page.findMany({
    where: { title: PARENT_TITLE, parentId: null },
    select: { id: true },
  });
  for (const p of existingParents) {
    await prisma.page.deleteMany({ where: { parentId: p.id } });
    await prisma.page.delete({ where: { id: p.id } });
  }

  const parent = await prisma.page.create({
    data: { title: PARENT_TITLE, icon: "📥", blocksContent: [], parentId: null },
  });

  const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const md = readFileSync(join(PAGES_DIR, file), "utf8");
    const { title, blocks } = markdownToBlocks(md);
    const cleanTitle = title || file.replace(/\.md$/, "");
    await prisma.page.create({
      data: {
        title: cleanTitle,
        icon: ICONS[cleanTitle] ?? "📄",
        blocksContent: json(blocks),
        parentId: parent.id,
      },
    });
    console.log(`  Imported "${cleanTitle}" (${blocks.length} top-level blocks)`);
  }

  console.log(`Done. Parent page "${PARENT_TITLE}" id: ${parent.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
