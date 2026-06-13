import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, Prisma } from "../app/generated/prisma/client";

// Cast helper for Json columns (see lib/json.ts — duplicated here to keep the
// seed runnable standalone via tsx without path-alias resolution).
const json = (v: unknown) => v as Prisma.InputJsonValue;

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// --- BlockNote partial-block helpers -------------------------------------

function text(value: string) {
  return [{ type: "text", text: value, styles: {} }];
}
function heading(value: string, level: 1 | 2 | 3 = 1) {
  return { type: "heading", props: { level }, content: text(value) };
}
function paragraph(value: string) {
  return { type: "paragraph", content: text(value) };
}
function todo(value: string, checked = false) {
  return { type: "checkListItem", props: { checked }, content: text(value) };
}

const sprintTaskBlocks = [
  heading("Description", 1),
  paragraph("Describe the task, its goal, and any relevant context here."),
  heading("Acceptance Criteria", 2),
  todo("Criterion one"),
  todo("Criterion two"),
  todo("Criterion three"),
  heading("Technical Notes", 2),
  paragraph("Implementation decisions and gotchas."),
  heading("References", 2),
  paragraph("Links to designs, docs, and related work."),
];

const contentBriefBlocks = [
  heading("Objective", 1),
  paragraph("What is this piece trying to achieve?"),
  heading("Key Messages", 2),
  paragraph("The main points the reader should take away."),
  heading("Draft Body", 2),
  paragraph("Write the content here."),
  heading("SEO Checklist", 2),
  todo("Meta description written"),
  todo("Internal links added"),
  todo("Keyword density checked"),
];

const onboardingBlocks = [
  heading("Kickoff", 2),
  todo("Send welcome email"),
  todo("Schedule kickoff call"),
  todo("Confirm stakeholder contacts"),
  heading("Configuration", 2),
  todo("Configure account settings"),
  todo("Import client data"),
  todo("Set up integrations"),
  heading("Training", 2),
  todo("Run training session"),
  heading("Go-Live", 2),
  todo("Final QA"),
  todo("Switch to production"),
  heading("Closed", 2),
  todo("Send recap & next steps"),
];

async function main() {
  // Wipe existing data for a clean, idempotent seed.
  await prisma.entry.deleteMany();
  await prisma.view.deleteMany();
  await prisma.property.deleteMany();
  await prisma.database.deleteMany();
  await prisma.page.deleteMany();
  await prisma.user.deleteMany();

  // --- Users (Alice is the default; Bob exists to test Person rendering) ---
  const alice = await prisma.user.create({
    data: {
      name: "Alice Chen",
      email: "alice@example.com",
      avatarUrl: null,
    },
  });
  const bob = await prisma.user.create({
    data: { name: "Bob Martins", email: "bob@example.com", avatarUrl: null },
  });

  // --- Root page ---
  const home = await prisma.page.create({
    data: {
      title: "Home",
      icon: "🏠",
      blocksContent: [
        heading("Welcome to your workspace", 1),
        paragraph(
          "This is a Notion-style workspace. Use the sidebar to explore the sample databases below."
        ),
        paragraph("Try the Sprint Backlog (Kanban) and Content Pipeline (Calendar)."),
      ],
    },
  });

  // ============================================================
  // Database 1: Sprint Backlog (Kanban by Status)
  // ============================================================
  const sprintPage = await prisma.page.create({
    data: { title: "Sprint Backlog", icon: "🏃", parentId: home.id, blocksContent: [] },
  });
  const sprintDb = await prisma.database.create({
    data: { pageId: sprintPage.id },
  });

  const sprintStatus = await prisma.property.create({
    data: {
      name: "Status",
      type: "status",
      databaseId: sprintDb.id,
      options: [
        { label: "To Do", color: "gray" },
        { label: "In Progress", color: "blue" },
        { label: "In Review", color: "orange" },
        { label: "Done", color: "green" },
      ],
    },
  });
  const sprintAssignee = await prisma.property.create({
    data: { name: "Assignee", type: "person", databaseId: sprintDb.id, options: json(null) },
  });
  const sprintPriority = await prisma.property.create({
    data: {
      name: "Priority",
      type: "select",
      databaseId: sprintDb.id,
      options: [
        { label: "Critical", color: "red" },
        { label: "High", color: "orange" },
        { label: "Medium", color: "yellow" },
        { label: "Low", color: "gray" },
      ],
    },
  });
  const sprintPoints = await prisma.property.create({
    data: { name: "Story Points", type: "number", databaseId: sprintDb.id, options: json(null) },
  });
  const sprintNumber = await prisma.property.create({
    data: { name: "Sprint Number", type: "number", databaseId: sprintDb.id, options: json(null) },
  });

  await prisma.view.create({
    data: {
      name: "Board",
      type: "kanban",
      databaseId: sprintDb.id,
      config: {
        groupingPropertyId: sprintStatus.id,
        visibleProperties: [sprintAssignee.id, sprintPriority.id],
        filters: [],
        sorts: [],
      },
    },
  });
  await prisma.view.create({
    data: {
      name: "Table",
      type: "table",
      databaseId: sprintDb.id,
      config: { filters: [], sorts: [] },
    },
  });

  // Sprint task template
  const sprintTemplatePage = await prisma.page.create({
    data: {
      title: "Sprint Task Template",
      icon: "📋",
      parentId: sprintPage.id,
      blocksContent: sprintTaskBlocks,
    },
  });
  await prisma.entry.create({
    data: {
      pageId: sprintTemplatePage.id,
      databaseId: sprintDb.id,
      isTemplate: true,
      values: {
        [sprintStatus.id]: "To Do",
        [sprintPriority.id]: "Medium",
        [sprintNumber.id]: 4,
      },
    },
  });

  const sprintSeedData: {
    title: string;
    status: string;
    assignee: string;
    priority: string;
    points: number;
  }[] = [
    { title: "Build login page", status: "To Do", assignee: alice.id, priority: "High", points: 5 },
    { title: "Set up CI pipeline", status: "To Do", assignee: bob.id, priority: "Medium", points: 3 },
    { title: "Build Auth Service", status: "In Progress", assignee: alice.id, priority: "Critical", points: 8 },
    { title: "Design dashboard", status: "In Progress", assignee: bob.id, priority: "Medium", points: 5 },
    { title: "Write API docs", status: "Done", assignee: alice.id, priority: "Low", points: 2 },
  ];
  for (const s of sprintSeedData) {
    const p = await prisma.page.create({
      data: {
        title: s.title,
        parentId: sprintPage.id,
        blocksContent: sprintTaskBlocks,
      },
    });
    await prisma.entry.create({
      data: {
        pageId: p.id,
        databaseId: sprintDb.id,
        values: {
          [sprintStatus.id]: s.status,
          [sprintAssignee.id]: s.assignee,
          [sprintPriority.id]: s.priority,
          [sprintPoints.id]: s.points,
          [sprintNumber.id]: 4,
        },
      },
    });
  }

  // ============================================================
  // Database 2: Content Pipeline (Calendar by Publish Date)
  // ============================================================
  const contentPage = await prisma.page.create({
    data: { title: "Content Pipeline", icon: "📅", parentId: home.id, blocksContent: [] },
  });
  const contentDb = await prisma.database.create({
    data: { pageId: contentPage.id },
  });

  const publishDate = await prisma.property.create({
    data: { name: "Publish Date", type: "date", databaseId: contentDb.id, options: json(null) },
  });
  const contentStatus = await prisma.property.create({
    data: {
      name: "Status",
      type: "status",
      databaseId: contentDb.id,
      options: [
        { label: "Idea", color: "gray" },
        { label: "Drafting", color: "blue" },
        { label: "Editing", color: "orange" },
        { label: "Scheduled", color: "purple" },
        { label: "Published", color: "green" },
      ],
    },
  });
  const contentType = await prisma.property.create({
    data: {
      name: "Content Type",
      type: "select",
      databaseId: contentDb.id,
      options: [
        { label: "Blog", color: "blue" },
        { label: "Social", color: "pink" },
        { label: "Newsletter", color: "green" },
        { label: "Video", color: "red" },
      ],
    },
  });
  const contentAuthor = await prisma.property.create({
    data: { name: "Author", type: "person", databaseId: contentDb.id, options: json(null) },
  });

  await prisma.view.create({
    data: {
      name: "Calendar",
      type: "calendar",
      databaseId: contentDb.id,
      config: { datePropertyId: publishDate.id, filters: [], sorts: [] },
    },
  });
  await prisma.view.create({
    data: {
      name: "Board",
      type: "kanban",
      databaseId: contentDb.id,
      config: {
        groupingPropertyId: contentStatus.id,
        visibleProperties: [contentType.id, contentAuthor.id],
        filters: [],
        sorts: [],
      },
    },
  });

  const contentTemplatePage = await prisma.page.create({
    data: {
      title: "Content Brief Template",
      icon: "📝",
      parentId: contentPage.id,
      blocksContent: contentBriefBlocks,
    },
  });
  await prisma.entry.create({
    data: {
      pageId: contentTemplatePage.id,
      databaseId: contentDb.id,
      isTemplate: true,
      values: { [contentStatus.id]: "Idea", [contentType.id]: "Blog" },
    },
  });

  const contentSeed: {
    title: string;
    date: string;
    status: string;
    type: string;
    author: string;
  }[] = [
    { title: "Blog: AI trends", date: "2026-07-01", status: "Drafting", type: "Blog", author: alice.id },
    { title: "Social: launch teaser", date: "2026-07-01", status: "Scheduled", type: "Social", author: bob.id },
    { title: "Blog: AI in 2027", date: "2026-07-15", status: "Idea", type: "Blog", author: alice.id },
    { title: "Newsletter: July recap", date: "2026-07-28", status: "Editing", type: "Newsletter", author: bob.id },
  ];
  for (const c of contentSeed) {
    const p = await prisma.page.create({
      data: { title: c.title, parentId: contentPage.id, blocksContent: contentBriefBlocks },
    });
    await prisma.entry.create({
      data: {
        pageId: p.id,
        databaseId: contentDb.id,
        values: {
          [publishDate.id]: { start: c.date, end: null },
          [contentStatus.id]: c.status,
          [contentType.id]: c.type,
          [contentAuthor.id]: c.author,
        },
      },
    });
  }

  // ============================================================
  // Database 3: Client Onboarding (Kanban by Phase + Calendar by Target Date)
  // ============================================================
  const onboardPage = await prisma.page.create({
    data: { title: "Client Onboarding", icon: "🤝", parentId: home.id, blocksContent: [] },
  });
  const onboardDb = await prisma.database.create({
    data: { pageId: onboardPage.id },
  });

  const phase = await prisma.property.create({
    data: {
      name: "Phase",
      type: "status",
      databaseId: onboardDb.id,
      options: [
        { label: "Kickoff", color: "gray" },
        { label: "Configuration", color: "blue" },
        { label: "Training", color: "orange" },
        { label: "Go-Live", color: "purple" },
        { label: "Closed", color: "green" },
      ],
    },
  });
  const health = await prisma.property.create({
    data: {
      name: "Health",
      type: "select",
      databaseId: onboardDb.id,
      options: [
        { label: "On Track", color: "green" },
        { label: "At Risk", color: "yellow" },
        { label: "Blocked", color: "red" },
      ],
    },
  });
  const csm = await prisma.property.create({
    data: { name: "Assigned CSM", type: "person", databaseId: onboardDb.id, options: json(null) },
  });
  const targetDate = await prisma.property.create({
    data: { name: "Target Completion Date", type: "date", databaseId: onboardDb.id, options: json(null) },
  });

  await prisma.view.create({
    data: {
      name: "Pipeline",
      type: "kanban",
      databaseId: onboardDb.id,
      config: {
        groupingPropertyId: phase.id,
        visibleProperties: [csm.id, health.id],
        filters: [],
        sorts: [],
      },
    },
  });
  await prisma.view.create({
    data: {
      name: "Deadlines",
      type: "calendar",
      databaseId: onboardDb.id,
      config: { datePropertyId: targetDate.id, filters: [], sorts: [] },
    },
  });

  const onboardTemplatePage = await prisma.page.create({
    data: {
      title: "Onboarding Template",
      icon: "📋",
      parentId: onboardPage.id,
      blocksContent: onboardingBlocks,
    },
  });
  await prisma.entry.create({
    data: {
      pageId: onboardTemplatePage.id,
      databaseId: onboardDb.id,
      isTemplate: true,
      values: { [phase.id]: "Kickoff", [health.id]: "On Track" },
    },
  });

  const onboardSeed: {
    title: string;
    phase: string;
    health: string;
    csm: string;
    target: string;
  }[] = [
    { title: "Acme Corp", phase: "Kickoff", health: "On Track", csm: alice.id, target: "2026-08-01" },
    { title: "Globex Inc", phase: "Configuration", health: "At Risk", csm: bob.id, target: "2026-08-03" },
    { title: "Initech", phase: "Training", health: "On Track", csm: alice.id, target: "2026-08-04" },
  ];
  for (const o of onboardSeed) {
    const p = await prisma.page.create({
      data: { title: o.title, parentId: onboardPage.id, blocksContent: onboardingBlocks },
    });
    await prisma.entry.create({
      data: {
        pageId: p.id,
        databaseId: onboardDb.id,
        values: {
          [phase.id]: o.phase,
          [health.id]: o.health,
          [csm.id]: o.csm,
          [targetDate.id]: { start: o.target, end: null },
        },
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Users: ${alice.name}, ${bob.name}`);
  console.log(`  Root page: ${home.title}`);
  console.log("  Databases: Sprint Backlog, Content Pipeline, Client Onboarding");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
