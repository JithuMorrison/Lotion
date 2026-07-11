# Lotion

A local-first Notion-style workspace: nested pages with a full block editor,
inline databases with six view types, drawing canvas, LaTeX equations, and rich
Notion clipboard import.

## Features

### Block Editor

- **Rich text editing** — headings (H1–H3, with toggleable headings), paragraphs,
  bullet/numbered/check lists, quotes, dividers, code blocks, and alerts.
- **Inline styles** — bold, italic, underline, strikethrough, code, text colors,
  background colors, and text alignment.
- **Toggleable blocks** — any heading or text block can be a toggle that nests
  child blocks; Tab/Shift-Tab nests and unnests selected blocks.
- **Multi-column layouts** — `/2col` through `/5col` slash commands create
  side-by-side column blocks.
- **Slash menu** — type `/` to insert any block type, including custom blocks
  (Database, Page, Canvas, Equation, columns).
- **Drag-and-drop** — reorder blocks by dragging; nest/unnest with toolbar
  buttons or Tab/Shift-Tab.
- **Debounced save** — edits persist 1000ms after the last keystroke and flush
  on tab close; a "Saving…/Saved" indicator shows in the page header.

### Custom Blocks

- **`/database`** — embeds an inline database (Kanban, Calendar, Table, List,
  Gallery, Timeline views) directly in the page.
- **`/page`** — creates a subpage and embeds a link card; navigating opens the
  subpage with its own full editor.
- **`/canvas`** — a drawing canvas with pencil, eraser, 8 colors, 4 stroke sizes,
  clear, PNG download, and fullscreen mode. Drawings persist as data URLs in the
  block and render inline when not fullscreen.
- **`/equation`** — inline LaTeX equations rendered with KaTeX; click to edit,
  Enter to confirm, Escape to cancel.

### Notion Clipboard Import

Paste content directly from Notion and the editor preserves:

- **Block nesting** — toggleable headers and their child blocks are nested
  correctly, using Notion's `text/_notion-multi-text-production` and
  `text/_notion-blocks-v3-production` clipboard formats.
- **Toggleable headings** — Notion blocks with `format.toggleable` become
  BlockNote headings with `isToggleable: true` (H1/H2/H3 toggleable respectively),
  not flat toggle list items.
- **Text styles** — bold, italic, underline, strikethrough, code, and Notion
  text/background colors (gray, brown, orange, yellow, green, blue, purple, pink,
  red) are mapped to BlockNote's style schema.
- **Links** — Notion page mentions and external links are converted to BlockNote
  link elements with smart labels (see below).
- **Tree structure fallback** — when Notion's clipboard provides only an ID-only
  tree (no block data), the HTML-parsed blocks are merged with the tree to
  reconstruct nesting; toggle detection comes from Notion's `<details>` HTML.

### Smart Link Labels

Pasting a bare URL or a Notion link automatically generates a readable label:

| URL | Label |
|-----|-------|
| `tekion.atlassian.net/wiki/.../Title` | `Confluence: Title` |
| `tekion.atlassian.net/browse/TICKET-123` | `Jira: TICKET-123` |
| `notion.so/page-name` | `Notion: page name` |
| `chatgpt.com` | `ChatGPT` |
| `observeinc.com/...` | `Observe` |
| `github.com/owner/repo/pull/62` | `Pull Request #62` |
| `github.com/owner/repo/issues/5` | `Issue #5` |
| `github.com/owner/repo/commit/...` | `Commit` |
| `github.com/owner/repo` | `GitHub: owner/repo` |
| Other URLs | `domain/first-path-segment` |

Link icons are rendered via CSS `::before` for GitHub, Notion, Jira, Confluence,
YouTube, GitLab, StackOverflow, and Observe.

### Databases

- **Six view types** — Table, Kanban (drag-and-drop status), Calendar
  (drag-to-reschedule), List, Gallery (card grid), and Timeline.
- **Pages as rows** — every database entry is a full page with the block editor.
- **Properties** — Text, Number, Select, Multi-select, Status, Date, Person,
  Checkbox, URL, Email, and relation types.
- **Optimistic DnD** — Kanban status moves and calendar reschedules apply
  instantly and roll back on server error.
- **Select validation** — invalid Select/Status values are rejected (422),
  except a Kanban drag to a new column, which atomically appends the option.
- **Templates** — any entry can be saved as a template; new entries can deep-copy
  a template's page.
- **View settings** — filters, sorts, and visible property toggles per view.

### Pages

- **Nested page tree** — sidebar shows a collapsible tree of all pages; create,
  rename, delete, and drag to reorder.
- **Breadcrumbs** — navigate up the page hierarchy.
- **Page header** — title, icon, and cover image; editable inline.
- **Cover images** — set via URL from the page header menu.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **BlockNote** block editor (`@blocknote/react`, `@blocknote/core`)
- **Prisma 7** + **SQLite** (via the `better-sqlite3` driver adapter)
- **@dnd-kit** for Kanban drag-and-drop, **react-big-calendar** for the calendar
- **TanStack Query** (server cache + optimistic updates) and **Zustand**
  (user store, editor save state)
- **KaTeX** for LaTeX equation rendering
- **Tailwind CSS v4** + small shadcn/base-ui primitives

## Setup

Run this once to install dependencies, set up the database, and seed sample data:

```bash
bash setup.sh
```

## Running

After setup, start the dev server normally:

```bash
npm run dev
```

Open http://localhost:3000 (Next picks the next free port if it's taken).

## How it's structured

- `app/api/**` — REST route handlers for pages, databases, properties, entries,
  templates, and views.
- `lib/` — Prisma client (`prisma.ts`), shared types, TanStack Query hooks
  (`queries.ts`), Zustand stores, and filter/sort helpers.
- `components/` — app shell + sidebar tree, breadcrumb, the block editor and
  page header, and the `database/` view components (Kanban, Calendar, Table,
  List, Gallery, Timeline) plus the property panel, view settings, and template
  picker.
- `components/editor/` — block editor (`block-editor.tsx`), custom block specs
  (`database-block`, `page-block`, `canvas-block`, `equation-inline`), error
  boundary, and page header.
- `prisma/schema.prisma` — `User`, `Page`, `Database`, `Property`, `Entry`,
  `View`. Block content, entry values, and view config are stored as JSON.

Re-run `npm run seed` at any time to reset to the sample workspace.
