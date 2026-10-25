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

No build step, no framework, no bundler. Open `index.html` in a browser or use any static file server (`npx serve .` or `python3 -m http.server`). Routing is hash-based, so any static server works. No test suite or linter.

All CSS is plain hand-written CSS in `site.css` (no Tailwind). Fonts: Inter Variable for text (SIL OFL, license in `assets/fonts/Inter-LICENSE.txt`), Xanh Mono for UI text. ABC Areal Variable is in `assets/fonts/` but unused and uncommitted: its license forbids public repos and public servers unless covered by a web license, so don't commit it.

## Deployment

Cloudflare (`wrangler.jsonc`, static assets) and a cPanel `.cpanel.yml` both exist in the repo. Cloudflare static assets cap files at 25 MiB, so large videos belong on R2. All paths in HTML are relative to repo root.

## Architecture

Single-page static site, three files:

- `index.html` all markup. A persistent left rail (`#rail`: nav, project list `#list`, project info `#info`, shortcut hint and Toronto clock) and a media stage (`#stage`) holding one `.view` per route (`#view-home`, `#view-about`, `#view-<slug>`).
- `app.js` hash router (`#/`, `#/about`, `#/<slug>`, `#/tag/<tag>`), the rail (cursor, info, tag chips and filter), Home hover preview and mobile feed, keyboard (arrows, Enter, Esc), video controls and viewport autoplay, the stills galleries, and the Lapse case study (snap sections, before/after, image wall).
- `site.css` mobile-first styles; the desktop layout is one `@media (min-width: 1024px) and (min-height: 520px)` block at the bottom. It is mirrored by `DESKTOP` in `app.js`; change both together.

Other files: `lapse-images.js` (wall image list) and `lapse-wall-thumbs.js` (blurred 18x24 thumbnails for the wall) load on demand; `dither.js` is the dither engine, currently unused.

Videos load from `data-src` (nothing downloads until a view opens). `data-alt` holds an H.264 fallback used where HEVC cannot play. Video files should have their index at the front (`ffmpeg -c copy -movflags +faststart`).

## Adding a New Project

Everything lives in `index.html`. Each project is two pieces: a row in the project list (`#list`) and a page in the stage (`#stage`). No JS or CSS changes are needed for a video project or a photo gallery. The project's order in the list is the order on the site. Roles in the `.meta` block become the tag chips and the tag filter automatically.

### A video project

1. **Prepare the video** (`ffmpeg`). H.264, capped at 1080 tall, with the index up front so it starts fast. A capped bitrate keeps it to roughly 4 to 6 Mbps:
   `ffmpeg -i in.mov -vf "scale=-2:'min(1080,ih)'" -c:v libx264 -crf 23 -maxrate 6M -bufsize 12M -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart out.mp4`
   Note the real pixel size (`ffprobe`), you need it in step 3.
   Keep each file under 25 MiB if it deploys through Cloudflare static assets. Put it in `assets/projects/{slug}/`.
2. **Add a row** to `<nav id="list">`, anywhere in the order you want:
   `<a href="#/{slug}" data-slug="{slug}" data-kind="video" data-src="assets/projects/{slug}/{file}.mp4"><span>Project title</span><span>Client</span></a>`
   `data-src` is also the hover preview on Home and the card on the mobile feed.
3. **Add a page** inside `<main id="stage">`, next to the other video pages (copy one):
   ```
   <section class="view" id="view-{slug}" data-tpl="video" hidden>
     <div class="meta" hidden>
       <p class="desc">One or two sentences.</p>
       <ul class="roles"><li>art direction</li><li>video edit</li></ul>
     </div>
     <div class="vwrap"><video data-src="assets/projects/{slug}/{file}.mp4" loop muted playsinline preload="none" width="1920" height="1080"></video></div>
   </section>
   ```
   Set `width` and `height` to the video's real pixel size, otherwise the page jumps when it loads. The slug in the row, the `id` and the folder must match, and the slug can't be `home`, `about` or `tag` (the router uses them). If the file is HEVC, also add `data-alt="...-avc.mp4"` (an H.264 copy) to the `<video>` and to the list row.

### A photo gallery

1. **Prepare the images.** Full size in `assets/{folder}/`, named `{Prefix}-{n}.jpg`. A small version of each (about 20 KB) in `assets/{folder}/lazyload/`, named `{Prefix}-LowRes-{n}.jpg`. The small one shows blurred while the full one loads.
2. **Add a row** to the list: same as a video, but `data-kind="image"` and `data-src` pointing at one full image (the Home hover preview).
3. **Add a page**: copy the Stills Portfolio `<section>` and change the `id`, the `.meta` text and these attributes:
   `data-folder="assets/{folder}" data-prefix="{Prefix}" data-stills="0,1,2,3"` (the file numbers, in display order).
   Leave the `<div class="sp"></div>` and `<div class="pager" aria-hidden="true"></div>` inside it as they are.

Gallery alt text is generated as "Still N". If you want real descriptions, that needs a small code change, so ask for it.

### A case study (like Lapse)

These are built by hand, and `initCase` in `app.js` is written for the Lapse page only. A second case study means copying the Lapse section and generalizing `initCase`, so ask for that as its own piece of work.

### Check before you ship

- `git add` the new files by name. Untracked files are not deployed, and `git commit -a` skips them.
- If you changed `site.css` or `app.js`, bump the `?v=` on their `<script>` and `<link>` tags in `index.html`, so visitors do not keep the old copy.

- Open `#/{slug}` directly, then click through from the list and the Home hover.
- Narrow the window below 1024px and check the mobile feed.
- Names must not wrap: keep titles under about 25 characters.
- Do not commit fonts you are not licensed to host publicly (see Development).
