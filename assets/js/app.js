// Recipe Box — shared client-side logic.
// Reads _posts/index.json for the list of recipes, then fetches and
// parses the individual markdown files on demand (front matter + body).

const POSTS_DIR = '_posts';

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, content: raw };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const lineMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!lineMatch) continue;
    const key = lineMatch[1].trim();
    let value = lineMatch[2].trim().replace(/^["']|["']$/g, '');
    data[key] = value;
  }

  return { data, content: raw.slice(match[0].length) };
}

async function fetchIndex() {
  const res = await fetch(`${POSTS_DIR}/index.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load ${POSTS_DIR}/index.json (${res.status})`);
  return res.json();
}

async function fetchPost(filename) {
  const res = await fetch(`${POSTS_DIR}/${filename}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load ${POSTS_DIR}/${filename} (${res.status})`);
  const raw = await res.text();
  return parseFrontMatter(raw);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---------------- Index page ---------------- */

async function initIndexPage() {
  const grid = document.getElementById('card-grid');
  const search = document.getElementById('search-input');
  const chipsEl = document.getElementById('category-chips');

  let posts;
  try {
    posts = await fetchIndex();
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Couldn't load recipes — ${escapeHtml(err.message)}.<br>Run <code>node scripts/build-index.js</code> after adding files to _posts.</p>`;
    return;
  }

  const categories = [...new Set(posts.flatMap((p) => p.categories))].sort();
  let activeCategory = 'all';
  let query = '';

  function render() {
    const filtered = posts.filter((p) => {
      const matchesCategory = activeCategory === 'all' || p.categories.includes(activeCategory);
      const matchesQuery = !query || p.title.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="empty-state">No recipes match yet. Try another filter, or add one to _posts.</p>`;
      return;
    }

    grid.innerHTML = filtered.map((p) => `
      <a class="recipe-card" href="recipe.html?post=${encodeURIComponent(p.filename)}">
        <span class="card-date">${escapeHtml(formatDate(p.date))}</span>
        <h2>${escapeHtml(p.title)}</h2>
        ${p.excerpt ? `<p class="card-excerpt">${escapeHtml(p.excerpt)}…</p>` : ''}
        <div class="card-cats">
          ${p.categories.map((c) => `<span class="cat-tag">${escapeHtml(c)}</span>`).join('')}
        </div>
      </a>
    `).join('');
  }

  chipsEl.innerHTML = ['all', ...categories].map((c) =>
    `<button class="chip${c === 'all' ? ' active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');

  chipsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    activeCategory = btn.dataset.category;
    chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === btn));
    render();
  });

  search.addEventListener('input', (e) => {
    query = e.target.value;
    render();
  });

  render();
}

/* ---------------- Recipe detail page ---------------- */

async function initRecipePage() {
  const params = new URLSearchParams(window.location.search);
  const filename = params.get('post');
  const container = document.getElementById('recipe-container');

  if (!filename) {
    container.innerHTML = `<p class="recipe-not-found">No recipe specified. <a href="index.html">Back to Recipe Box</a>.</p>`;
    return;
  }

  let data, content;
  try {
    ({ data, content } = await fetchPost(filename));
  } catch (err) {
    container.innerHTML = `<p class="recipe-not-found">Couldn't load that recipe — ${escapeHtml(err.message)}.<br><a href="index.html">Back to Recipe Box</a>.</p>`;
    return;
  }

  document.title = `${data.title || 'Recipe'} · Recipe Box`;

  const bodyHtml = window.marked ? marked.parse(content) : `<pre>${escapeHtml(content)}</pre>`;
  const categories = (data.categories || '').split(/\s+/).filter(Boolean);

  container.innerHTML = `
    <a class="back-link" href="index.html">&larr; Recipe Box</a>
    <p class="meta">${escapeHtml(formatDate(data.date))} · ${categories.map(escapeHtml).join(', ')}</p>
    <h1>${escapeHtml(data.title || filename)}</h1>
    <div class="recipe-body">${bodyHtml}</div>
  `;

  setupIngredientChecklist(filename);
}

// Ingredients render as <li> items inside the first blockquote's <ul>.
// Clicking one toggles it as "done", persisted per-recipe in localStorage.
function setupIngredientChecklist(filename) {
  const items = document.querySelectorAll('.recipe-body blockquote li');
  if (!items.length) return;

  const storageKey = `recipe-box:${filename}`;
  let checked = [];
  try {
    checked = JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch { checked = []; }

  items.forEach((li, i) => {
    if (checked.includes(i)) li.classList.add('checked');
    li.addEventListener('click', () => {
      li.classList.toggle('checked');
      const nowChecked = [...items]
        .map((el, idx) => (el.classList.contains('checked') ? idx : null))
        .filter((idx) => idx !== null);
      localStorage.setItem(storageKey, JSON.stringify(nowChecked));
    });
  });
}
