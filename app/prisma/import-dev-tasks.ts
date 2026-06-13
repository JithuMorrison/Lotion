import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, Prisma } from "../app/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });
const json = (v: unknown) => v as Prisma.InputJsonValue;

const CSV_PATH =
  "/Users/zafontana/Desktop/Notion/data/_extract/inner/Private & Shared/Dev Tasks 3196ecaaba0480f4ac7edbd73c1b3976.csv";

// --- Minimal RFC-4180 CSV parser (handles quotes, escaped quotes, newlines) ---
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

type Opt = { label: string; color: string };

// Preferred colors/order for known option values; unknowns get cycled colors.
const PALETTE = ["gray", "blue", "orange", "green", "red", "purple", "pink", "yellow"];
const KNOWN: Record<string, Record<string, string>> = {
  Status: {
    "Not started": "gray",
    "In progress": "blue",
    "In Testing": "orange",
    Done: "green",
    Cancelled: "red",
    Archived: "gray",
  },
  Priority: { High: "red", Medium: "yellow", Low: "gray" },
  "Task type": {
    Business: "blue",
    "🐞 Bug": "red",
    "💬 Feature request": "purple",
    "💅 Polish": "pink",
    Testing: "orange",
  },
  Phase: { MVP: "gray", V1: "blue", V2: "purple" },
  Assignee: { "Luiza Fontana": "green", "Thalita Cardoso": "orange" },
};

function buildOptions(
  propName: string,
  values: string[]
): Opt[] {
  const known = KNOWN[propName] ?? {};
  const seen = new Map<string, Opt>();
  // Seed in the preferred order first.
  for (const [label, color] of Object.entries(known)) {
    seen.set(label, { label, color });
  }
  let pi = Object.keys(known).length;
  for (const v of values) {
    if (!v) continue;
    if (!seen.has(v)) {
      seen.set(v, { label: v, color: PALETTE[pi % PALETTE.length] });
      pi++;
    }
  }
  return [...seen.values()];
}

function parseDate(raw: string): { start: string; end: null } | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso, end: null };
}

async function main() {
  const raw = readFileSync(CSV_PATH, "utf8").replace(/^﻿/, "");
  const rows = parseCSV(raw);
  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));

  const col = (name: string) => header.indexOf(name);
  const idx = {
    name: col("Task name"),
    status: col("Status"),
    priority: col("Priority"),
    type: col("Task type"),
    phase: col("Phase"),
    assignee: col("Assignee"),
    due: col("Due date"),
    updated: col("Updated at"),
  };

  // Collect distinct values for option-bearing columns.
  const collect = (i: number, split = false): string[] => {
    const out: string[] = [];
    for (const r of dataRows) {
      const cell = (r[i] ?? "").trim();
      if (!cell) continue;
      if (split) cell.split(",").forEach((p) => out.push(p.trim()));
      else out.push(cell);
    }
    return out;
  };

  // Idempotent: drop a previously imported "Dev Tasks" database (+ its pages).
  const existing = await prisma.page.findMany({
    where: { title: "Dev Tasks", parentId: null },
    select: { id: true },
  });
  for (const p of existing) {
    const db = await prisma.database.findUnique({ where: { pageId: p.id } });
    if (db) {
      await prisma.entry.deleteMany({ where: { databaseId: db.id } });
      await prisma.view.deleteMany({ where: { databaseId: db.id } });
      await prisma.property.deleteMany({ where: { databaseId: db.id } });
      await prisma.database.delete({ where: { id: db.id } });
    }
    await prisma.page.deleteMany({ where: { parentId: p.id } });
    await prisma.page.delete({ where: { id: p.id } });
  }

  // Create the database page (top-level) + database.
  const dbPage = await prisma.page.create({
    data: { title: "Dev Tasks", icon: "🛠️", blocksContent: [], parentId: null },
  });
  const database = await prisma.database.create({ data: { pageId: dbPage.id } });

  // Create properties.
  const statusProp = await prisma.property.create({
    data: {
      name: "Status",
      type: "status",
      databaseId: database.id,
      options: json(buildOptions("Status", collect(idx.status))),
    },
  });
  const priorityProp = await prisma.property.create({
    data: {
      name: "Priority",
      type: "select",
      databaseId: database.id,
      options: json(buildOptions("Priority", collect(idx.priority))),
    },
  });
  const typeProp = await prisma.property.create({
    data: {
      name: "Task type",
      type: "select",
      databaseId: database.id,
      options: json(buildOptions("Task type", collect(idx.type))),
    },
  });
  const phaseProp = await prisma.property.create({
    data: {
      name: "Phase",
      type: "multi_select",
      databaseId: database.id,
      options: json(buildOptions("Phase", collect(idx.phase, true))),
    },
  });
  // Assignee is multi-valued in the source, so we model it as multi-select to
  // preserve every assignee (the app's Person type is single-value only).
  const assigneeProp = await prisma.property.create({
    data: {
      name: "Assignee",
      type: "multi_select",
      databaseId: database.id,
      options: json(buildOptions("Assignee", collect(idx.assignee, true))),
    },
  });
  const updatedProp = await prisma.property.create({
    data: { name: "Updated at", type: "date", databaseId: database.id, options: json(null) },
  });

  // Views: Board (by Status), Table.
  await prisma.view.create({
    data: {
      name: "Board",
      type: "kanban",
      databaseId: database.id,
      config: {
        groupingPropertyId: statusProp.id,
        visibleProperties: [priorityProp.id, typeProp.id, phaseProp.id],
        filters: [],
        sorts: [],
      },
    },
  });
  await prisma.view.create({
    data: {
      name: "All Tasks",
      type: "table",
      databaseId: database.id,
      config: { filters: [], sorts: [] },
    },
  });

  // Create one Page + Entry per row.
  const splitVals = (s: string) =>
    (s ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

  let count = 0;
  for (const r of dataRows) {
    const title = (r[idx.name] ?? "").trim() || "Untitled";
    const values: Record<string, unknown> = {};
    const status = (r[idx.status] ?? "").trim();
    const priority = (r[idx.priority] ?? "").trim();
    const type = (r[idx.type] ?? "").trim();
    const phase = splitVals(r[idx.phase] ?? "");
    const assignees = splitVals(r[idx.assignee] ?? "");
    const updated = parseDate((r[idx.updated] ?? "").trim());

    if (status) values[statusProp.id] = status;
    if (priority) values[priorityProp.id] = priority;
    if (type) values[typeProp.id] = type;
    if (phase.length) values[phaseProp.id] = phase;
    if (assignees.length) values[assigneeProp.id] = assignees;
    if (updated) values[updatedProp.id] = updated;

    const page = await prisma.page.create({
      data: { title, parentId: dbPage.id, blocksContent: [] },
    });
    await prisma.entry.create({
      data: { pageId: page.id, databaseId: database.id, values: json(values) },
    });
    count++;
  }

  console.log(`Imported "Dev Tasks": ${count} entries`);
  console.log(`  Database page id: ${dbPage.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
