# Recipe Box

A plain static site (no Jekyll, no build tooling needed at request time) that
reads recipes straight out of markdown files in `_posts/`, in the same
front-matter format your old Jekyll posts used:

```markdown
---
layout: post
title:  "Beef Birria"
date:   2023-02-24 21:03:59 +0000
categories: dinner
---
> ## Ingredients
>
> - 1kg beef mince
...
## Method
1. Heat 1 tablespoon of oil...
```

## Why there's a build script

Browsers can't list a folder's contents on a static host — there's no
directory listing to fetch. So `scripts/build-index.js` scans `_posts/*.md`,
reads each file's title/date/categories, and writes `_posts/index.json`.
The site's JS fetches that manifest, then fetches each markdown file
individually and renders it client-side (front matter parsed by hand,
markdown body rendered with [marked.js](https://marked.js.org/) from a CDN).

## Adding a recipe

1. Drop a new `.md` file into `_posts/`, following the format above.
   Filename doesn't matter for the site logic, but `YYYY-MM-DD-title.md`
   keeps it consistent with the old Jekyll convention.
2. Commit and push to `main`.

That's it — the included GitHub Actions workflow
(`.github/workflows/deploy.yml`) rebuilds `_posts/index.json` and deploys
to GitHub Pages automatically on every push, the same "just push and it
appears" behaviour you had with Jekyll.

### Running it locally

```bash
node scripts/build-index.js   # regenerate _posts/index.json
python3 -m http.server        # or any static file server — fetch() needs http(s), not file://
```

Then open `http://localhost:8000`.

## One-off GitHub Pages setup

In the repo: **Settings → Pages → Build and deployment → Source → GitHub
Actions**. Push to `main` and the workflow handles the rest.

## Structure

```
index.html              recipe grid, search + category filter
recipe.html             single recipe view (?post=filename.md)
assets/css/style.css    design system
assets/js/app.js        fetch/parse markdown, render both pages
_posts/*.md             your recipes
_posts/index.json       generated — don't hand-edit
scripts/build-index.js  generates index.json from _posts
.github/workflows/      auto-rebuild + deploy on push
```

## Notes

- Ingredients render as a tap-to-check list (state saved per-recipe in
  the browser via `localStorage`).
- `categories` supports multiple space-separated values, same as Jekyll —
  they become filter chips on the index page.
- No `layout:` handling — every post renders through the same template,
  so that field in the front matter is currently unused but left in place
  for compatibility with your existing files.
