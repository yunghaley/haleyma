# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is Haley Ma's personal portfolio site.

Goal: sexy creative + technology, with a highly polished modern TUI feel. Keep the site minimal, exact, and free of bloat.

## Rules

- Make the smallest possible change.
- Prefer plain HTML, CSS, and JS; avoid new dependencies unless approved.
- Never invent copy; ask Haley for any new text.
- Never replace images or change crops without approval.
- Preserve homepage, nav, type, image treatment, and case-study order unless explicitly approved.
- Subtle motion polish is okay; bigger motion changes need approval.
- If you see a refactor or broader improvement, explain it first and wait for approval.
- Ask one focused question when unsure.

## Development

No build step, no framework, no bundler. Open `index.html` in a browser or use any static file server (`npx serve .` or `python3 -m http.server`). No test suite or linter.

Tailwind CSS v4 is pre-compiled into `tailwind.css`. Edit `style.css` for custom styles; regenerate `tailwind.css` if Tailwind utility classes change.

## Deployment

cPanel via Git push. `cpanel.yml` copies the repo to the web root and strips `.git`. All paths in HTML are relative to repo root.

## Architecture

Single-page static site — one HTML file with vanilla JS navigation:

- `index.html` — all markup: header nav, info/projects sections, content panels, footer
- `script.js` — nav toggle (`data-target` ↔ `data-section`), accordion expand/collapse, project panel switching (`data-project` ↔ `#project-{id}`), video play/pause, timed stills slideshow
- `style.css` — Tailwind v4 `@import "tailwindcss"`, custom `@font-face` (InterVariable, XanhMono), accordion/slideshow animations
- `tailwind.css` — pre-compiled Tailwind output (checked in)

Image lazy loading: stills portfolio uses lazysizes — low-res in `src`, full-res in `data-src`, `lazyload` class.

## Adding a New Project

1. Add an `.accordion-item` in the projects section with a unique `data-project` slug and sequential `aria-controls`/`id`
2. Add a matching `#project-{slug}` div with class `project-panel hidden` in the content area
3. Place assets in `assets/projects/{slug}/`
