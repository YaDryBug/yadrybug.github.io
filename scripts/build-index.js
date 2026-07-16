#!/usr/bin/env node
/**
 * build-index.js
 *
 * Static sites can't list a folder's contents from the browser, so this
 * script scans _posts/*.md, reads each file's front matter, and writes
 * _posts/index.json — a manifest the site's JS fetches at load time.
 *
 * Run manually:   node scripts/build-index.js
 * Or let the GitHub Action in .github/workflows/deploy.yml run it on push.
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', '_posts');

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, content: raw };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const lineMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!lineMatch) continue;
    const key = lineMatch[1].trim();
    let value = lineMatch[2].trim();
    value = value.replace(/^["']|["']$/g, ''); // strip surrounding quotes
    data[key] = value;
  }

  return { data, content: raw.slice(match[0].length) };
}

function buildIndex() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`No _posts folder found at ${POSTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  const posts = files.map((filename) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
    const { data, content } = parseFrontMatter(raw);

    // First non-empty line of the method/body, used as a card excerpt
    const excerptMatch = content
      .split(/\r?\n/)
      .find((l) => l.trim() && !l.trim().startsWith('>') && !l.trim().startsWith('#'));

    return {
      filename,
      title: data.title || filename,
      date: data.date || '',
      categories: (data.categories || '').split(/\s+/).filter(Boolean),
      excerpt: excerptMatch ? excerptMatch.replace(/^\d+\.\s*/, '').slice(0, 140) : '',
    };
  });

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(
    path.join(POSTS_DIR, 'index.json'),
    JSON.stringify(posts, null, 2) + '\n'
  );

  console.log(`Wrote _posts/index.json with ${posts.length} recipe(s).`);
}

buildIndex();
