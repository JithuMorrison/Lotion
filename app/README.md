# Lotion

A local-first website: nested pages with a block editor, plus databases
rendered through Kanban, Calendar, Table, List, Gallery, and Timeline views.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **BlockNote** block editor (`@blocknote/react`)
- **Prisma 7** + **SQLite** (via the `better-sqlite3` driver adapter)
- **@dnd-kit** for Kanban drag-and-drop, **react-big-calendar** for the calendar
- **TanStack Query** (server cache + optimistic updates) and **Zustand**
  (user store, editor save state)
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
- `prisma/schema.prisma` — `User`, `Page`, `Database`, `Property`, `Entry`,
  `View`. Block content, entry values, and view config are stored as JSON.

## Key behaviors

- **Pages as rows**: every database entry is a full page with the block editor.
- **Debounced save**: edits persist 1000ms after the last keystroke and flush on
  tab close; a "Saving…/Saved" indicator shows in the page header.
- **Optimistic DnD**: Kanban status moves and calendar reschedules apply
  instantly and roll back on server error.
- **Select validation**: invalid Select/Status values are rejected (422), except
  a Kanban drag to a new column, which atomically appends the option.
- **Templates**: any entry can be saved as a template; new entries can deep-copy
  a template's page.

Re-run `npm run seed` at any time to reset to the sample workspace.
