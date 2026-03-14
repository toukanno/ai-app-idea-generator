const fs = require("fs");
const path = require("path");

const IDEAS_DIR = path.join(__dirname, "..", "ideas");
const DOCS_DIR = path.join(__dirname, "..", "docs");
const DOCS_IDEAS_DIR = path.join(DOCS_DIR, "ideas");
const SITE_TITLE = "AI App Ideas - AIアプリ起業アイデアブログ";
const SITE_URL = "https://toukanno.github.io/ai-app-idea-generator";
const MAX_INDEX_ITEMS = 30;

// --- Minimal Markdown to HTML ---
function mdToHtml(md) {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // inline code
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // list items
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);

  // paragraphs: wrap non-tag lines
  html = html
    .split("\n\n")
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (/^<[hul]/.test(block)) return block;
      return `<p>${block}</p>`;
    })
    .join("\n");

  // line breaks inside paragraphs
  html = html.replace(/(<p>.*?)<br\/?>(?=.*<\/p>)/g, "$1<br>");

  return html;
}

// --- Extract title from markdown ---
function extractTitle(md) {
  const match = md.match(/^#\s+(.+)/m);
  if (match) return match[1].replace(/[#*`]/g, "").trim();
  const first = md.split("\n").find((l) => l.trim());
  return first ? first.slice(0, 60).trim() : "無題";
}

// --- CSS ---
const CSS = `
:root {
  --bg: #0f172a;
  --surface: #1e293b;
  --border: #334155;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --accent: #38bdf8;
  --accent-hover: #7dd3fc;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.8;
  min-height: 100vh;
}
.container { max-width: 780px; margin: 0 auto; padding: 2rem 1.5rem; }
header { text-align: center; padding: 3rem 0 2rem; border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
header h1 { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.02em; }
header p { color: var(--muted); margin-top: 0.5rem; font-size: 0.95rem; }
.idea-list { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
.idea-list a {
  display: flex; align-items: baseline; gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  transition: border-color 0.2s, transform 0.15s;
}
.idea-list a:hover { border-color: var(--accent); transform: translateY(-1px); }
.idea-date { color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.idea-title { font-weight: 600; }
article { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 2rem; }
article h1 { font-size: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
article h2 { font-size: 1.15rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--accent); }
article h3 { font-size: 1rem; margin-top: 1.2rem; margin-bottom: 0.4rem; }
article ul { padding-left: 1.5rem; margin: 0.5rem 0; }
article li { margin-bottom: 0.3rem; }
article p { margin: 0.75rem 0; }
article code { background: var(--bg); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
article strong { color: var(--accent); font-weight: 600; }
.back { display: inline-block; margin-bottom: 1.5rem; color: var(--accent); text-decoration: none; font-size: 0.9rem; }
.back:hover { color: var(--accent-hover); }
footer { text-align: center; color: var(--muted); font-size: 0.8rem; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
@media (max-width: 600px) {
  .container { padding: 1rem; }
  header h1 { font-size: 1.4rem; }
  .idea-list a { flex-direction: column; gap: 0.25rem; }
}
`;

// --- HTML shell ---
function htmlPage({ title, description, path: pagePath, body }) {
  const canonical = pagePath ? `${SITE_URL}/${pagePath}` : SITE_URL;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary">
  <link rel="canonical" href="${canonical}">
  <style>${CSS}</style>
</head>
<body>
  <div class="container">
    ${body}
    <footer>AI App Ideas &mdash; AIが毎日生成するアプリ起業アイデア集<br>Powered by OpenRouter</footer>
  </div>
</body>
</html>`;
}

// --- Main ---
function build() {
  fs.mkdirSync(DOCS_IDEAS_DIR, { recursive: true });

  // Read all idea files
  const files = fs
    .readdirSync(IDEAS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse();

  console.log(`${files.length} 件のアイデアファイルを検出`);

  const entries = [];

  for (const file of files) {
    const date = file.replace(".md", "");
    const md = fs.readFileSync(path.join(IDEAS_DIR, file), "utf-8");
    const title = extractTitle(md);
    const htmlContent = mdToHtml(md);

    entries.push({ date, title, file });

    // Build individual page
    const page = htmlPage({
      title: `${title} - ${date} | AI App Ideas`,
      description: `${date} のAIアプリアイデア: ${title}`,
      path: `ideas/${date}.html`,
      body: `
    <a href="../" class="back">&larr; アイデア一覧に戻る</a>
    <article>
      <time datetime="${date}">${date}</time>
      ${htmlContent}
    </article>`,
    });

    fs.writeFileSync(path.join(DOCS_IDEAS_DIR, `${date}.html`), page);
    console.log(`  生成: docs/ideas/${date}.html`);
  }

  // Build index
  const listItems = entries
    .slice(0, MAX_INDEX_ITEMS)
    .map(
      (e) =>
        `<a href="ideas/${e.date}.html"><span class="idea-date">${e.date}</span><span class="idea-title">${e.title}</span></a>`
    )
    .join("\n      ");

  const indexBody = `
    <header>
      <h1>AI App Ideas</h1>
      <p>AIが毎日自動生成するアプリ起業アイデア集</p>
    </header>
    <ul class="idea-list">
      ${listItems}
    </ul>`;

  const index = htmlPage({
    title: SITE_TITLE,
    description:
      "AIが毎日自動生成するユニークなアプリ起業アイデアを掲載。GitHub Actions + OpenRouter で完全自動運用。",
    path: "",
    body: indexBody,
  });

  fs.writeFileSync(path.join(DOCS_DIR, "index.html"), index);
  console.log(`  生成: docs/index.html (${Math.min(entries.length, MAX_INDEX_ITEMS)} 件表示)`);
  console.log("サイトビルド完了");
}

build();
