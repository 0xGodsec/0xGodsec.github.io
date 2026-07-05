# Godsec — Cybersecurity Blog & Portfolio

A fast, SEO-friendly, fully static cybersecurity blog + portfolio built with **Jekyll**
and designed for **GitHub Pages**. Terminal/hacker aesthetic, dark & light mode, client-side
search, tags & categories, syntax-highlighted code, reading progress, and social sharing.

Write a post = drop a Markdown file in `_posts/`. That's it.

---

## 1. Quick start (deploy in ~5 minutes)

You do **not** need to run anything locally to publish. GitHub Pages builds it for you.

1. **Create the repo.** For a personal site the repo **must** be named
   `YOUR-USERNAME.github.io` (e.g. `godsec.github.io`).
2. **Upload these files** to the repo (drag-and-drop in the GitHub web UI, or `git push`).
3. **Edit `_config.yml`** — change `url:` to `https://YOUR-USERNAME.github.io` and update
   the `social_links` and `author` blocks (search for the word `CHANGE`).
4. **Enable Pages:** repo **Settings → Pages → Build and deployment → Source →
   "Deploy from a branch" → `main` / `(root)`**. Save.
5. Wait ~1 minute. Your site is live at `https://YOUR-USERNAME.github.io`.

> There's also an optional GitHub Actions workflow at `.github/workflows/pages.yml`.
> If you prefer branch-based deploy (step 4 above), you can safely **delete that file**.

---

## 2. Personalize it

Everything you'll want to change lives in a few obvious places:

| What | Where |
|---|---|
| Site title, URL, description, socials | `_config.yml` |
| Nav bar links | `_data/navigation.yml` |
| Bio / about page text | `about.md` |
| Skills | `_data/skills.yml` |
| Certifications | `_data/certifications.yml` |
| Work experience | `_data/experience.yml` |
| Projects | `_data/projects.yml` |
| Colors & fonts | `_sass/_theme.scss` (CSS variables at the top) |
| Code highlighting colors | `_sass/_syntax.scss` |

All placeholder content is marked `(PLACEHOLDER)` — search for it to find what to replace.

---

## 3. Writing a new post

Copy `_posts/_TEMPLATE.md.txt`, rename it to `_posts/YYYY-MM-DD-your-slug.md`, and fill in
the front matter:

```yaml
---
title: "Attacking SAML: Signature Wrapping in the Real World"
description: "One-line summary for listings, search, and social cards."
date: 2026-07-15 09:00:00 +0000
categories: [Web App Pentesting]   # ONE primary category
tags: [web, saml, sso, auth]       # many tags, lowercase-hyphenated
difficulty: Hard                    # Easy | Medium | Hard | Insane (optional)
---
```

Then write in Markdown. Fenced code blocks are auto-highlighted:

    ```bash
    nmap -sCV target.example
    ```

Filename **date and slug matter** — the date sets publish order and the slug becomes the URL
(`/blog/your-slug/`). Push the file and the site rebuilds automatically. Search, tags,
categories, and the sitemap all update on their own.

---

## 4. Features included

- **Search** — client-side, zero backend. Press `/` or `Ctrl/Cmd-K`. Indexed from
  `search.json`, generated at build time.
- **Dark / light mode** — remembers the visitor's choice; no flash on load.
- **Tags & categories** — auto-generated archive pages at `/tags/` and `/categories/`.
- **Reading progress bar + auto table of contents** on posts.
- **Syntax highlighting** (Rouge) themed to match dark/light.
- **Copy buttons** on every code block, plus a copy-permalink button.
- **Social sharing** — X, LinkedIn, Reddit, Hacker News.
- **SEO** — `jekyll-seo-tag` (meta + Open Graph + Twitter cards + JSON-LD),
  `jekyll-sitemap`, and `robots.txt`.
- **Responsive**, accessible (skip link, ARIA, keyboard nav), and fast (system fonts +
  one small JS file, no framework).

---

## 5. Running locally (optional)

Only needed if you want to preview before pushing.

```bash
# One-time: install Ruby (3.x) + Bundler, then:
bundle install
bundle exec jekyll serve --livereload
# open http://localhost:4000
```

If you're on Windows, install Ruby+Devkit from rubyinstaller.org first.

---

## 6. Custom domain (optional)

1. Add a file named `CNAME` at the repo root containing your domain, e.g. `blog.godsec.dev`.
2. Point a `CNAME` DNS record at `YOUR-USERNAME.github.io`.
3. In **Settings → Pages**, set the custom domain and enable **Enforce HTTPS**.
4. Update `url:` in `_config.yml` to the new domain.

---

Built with Jekyll · MIT — do whatever you like with it.
