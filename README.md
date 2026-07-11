# 🗿 Lotion

**Notion, but it's local. And it's called Lotion. Because of course it is.**

You know how every productivity app these days wants your soul, your credit card,
and a permanent seat on your browser's tab bar? Lotion doesn't. Lotion lives on
your machine, stores everything in a SQLite file, and doesn't ask you to "upgrade
to Team Pro Plus Ultra for $47/month" just to let you indent a bullet point.

## What is this?

It's a Notion clone. But local-first. So it's **Lotion**. Get it? Notion → Lotion.
Smooth. Moisturizing. Good for your skin¹.

> ¹ Lotion is not actually good for your skin. It's software. Please do not apply
> topically.

## Why?

Because sometimes you want:
- A block editor that doesn't need Wi-Fi
- Databases that live on *your* hard drive, not someone's AWS bill
- To paste from Notion and have it *just work* (toggles, nesting, colors, and all)
- To draw flowcharts without opening a seventh browser tab
- LaTeX equations without crying
- Zero cloud sync, zero login walls, zero telemetry, zero nonsense

## What's in the bottle?

- 📝 Full block editor (headings, lists, toggles, quotes, code, colors)
- 🗄️ Inline databases (Table, Kanban, Calendar, List, Gallery, Timeline)
- 🎨 Drawing canvas with pencil, eraser, colors, and fullscreen
- 📐 LaTeX equations (inline, click-to-edit, KaTeX-powered)
- 📋 Notion clipboard import (toggleable headers, nesting, styles — all preserved)
- 🔗 Smart link labels (paste a Jira link, get "Jira: TICKET-123", not a wall of URL)
- 📄 Nested pages with drag-and-drop sidebar tree
- 🌗 Light/dark mode because it's 2026 and we have standards

## How do I apply it?

```bash
bash setup.sh
```

That's it. It installs, migrates, seeds, and starts. Open http://localhost:3000.

If you've already set it up and just want to run it:

```bash
cd app && yarn run dev
```

## Is it moisturizing?

No. It's software. But it *is* smooth.

---

For the full breakdown of features, architecture, and how everything is wired up,
check **[app/README.md](app/README.md)**.
