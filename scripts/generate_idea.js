const axios = require("axios");
const fs = require("fs");

const key = process.env.OPENROUTER_API_KEY;
const models = (process.env.MODEL || "meta-llama/llama-3.3-70b-instruct:free")
  .split(",")
  .map((s) => s.trim());

const SITE_URL = "https://toukanno.github.io/ai-app-idea-generator";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000;

const IDEA_PROMPT = `日本語で新しいAIアプリのアイデアを1つ提案してください。タイトルと概要と機能をMarkdown形式で出力してください。`;

const NOTE_PROMPT = `あなたはブログライターです。以下のAIアプリ案をもとに、noteに投稿するブログ記事を書いてください。

条件:
- 読者に語りかける自然な日本語で書く
- 「こんにちは」から始める導入文を入れる
- 以下のセクションをMarkdownで含める:
  # （アプリ名）
  導入文（2〜3文）
  ## 概要
  ## 主な機能（箇条書き）
  ## 想定ユーザー
  ## 収益化のアイデア
  ## まとめ（読者への呼びかけ）
- 硬すぎず、読みやすい文体にする
- 最後に「---」で区切り線を入れる

以下がアプリ案です:

`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callApi(model, prompt) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: model,
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      timeout: 120000,
    }
  );
  return res.data?.choices?.[0]?.message?.content;
}

async function generateWithRetry(prompt, label) {
  let content = null;
  let lastError = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[${label}] モデル: ${model} 試行 ${attempt}/${MAX_RETRIES}`);
      try {
        content = await callApi(model, prompt);
        if (content) return content;
        console.error(`[${label}] content が空。リトライ...`);
      } catch (err) {
        lastError = err;
        if (err.response) {
          const status = err.response.status;
          console.error(`[${label}] API Error (HTTP ${status}): ${JSON.stringify(err.response.data)}`);
          if (status === 401) {
            console.error("→ APIキーが無効です。");
            process.exit(1);
          } else if (status === 402) {
            console.error("→ クレジット不足。次のモデルへ...");
            break;
          } else if (status === 429) {
            console.error(`→ レート制限。${RETRY_DELAY_MS / 1000}秒待機...`);
            await sleep(RETRY_DELAY_MS);
            continue;
          }
        } else {
          console.error(`[${label}] リクエストエラー:`, err.message);
        }
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
      }
    }
    if (content) break;
    console.error(`[${label}] ${model} で失敗。次のモデルへ...\n`);
  }

  if (!content) {
    console.error(`[${label}] すべてのモデルで生成失敗。`);
    if (lastError?.response) {
      console.error("最後のエラー:", JSON.stringify(lastError.response.data));
    }
  }
  return content;
}

function extractTitle(md) {
  const match = md.match(/^#{1,4}\s+(.+)/m);
  if (match) return match[1].replace(/[#*`]/g, "").trim();
  return "AIアプリ案";
}

function updateNoteIndex(date, title) {
  const indexPath = "note/index.md";
  let content = "";
  if (fs.existsSync(indexPath)) {
    content = fs.readFileSync(indexPath, "utf-8");
  } else {
    content = "# note 記事一覧\n\n| 日付 | タイトル | ファイル |\n|---|---|---|\n";
  }
  const row = `| ${date} | ${title} | [note/${date}.md](${date}.md) |`;
  if (!content.includes(date)) {
    content = content.trimEnd() + "\n" + row + "\n";
  }
  fs.writeFileSync(indexPath, content);
}

async function run() {
  if (!key) {
    console.error("ERROR: OPENROUTER_API_KEY is not set");
    console.error("GitHub Secrets に OPENROUTER_API_KEY を設定してください");
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 10);
  const pageUrl = `${SITE_URL}/ideas/${date}.html`;

  // 1. ideas 用の記事生成
  console.log("=== ideas 用記事を生成 ===");
  const ideaContent = await generateWithRetry(IDEA_PROMPT, "ideas");
  if (!ideaContent) process.exit(1);

  fs.mkdirSync("ideas", { recursive: true });
  fs.writeFileSync(`ideas/${date}.md`, ideaContent);
  console.log(`保存完了: ideas/${date}.md`);

  // 2. note 用の記事生成（レート制限回避のため少し待つ）
  console.log("\n15秒待機（レート制限回避）...");
  await sleep(15000);
  console.log("=== note 用記事を生成 ===");
  const notePrompt = NOTE_PROMPT + ideaContent;
  const noteContent = await generateWithRetry(notePrompt, "note");

  if (noteContent) {
    const footer = `\n\n---\n\n詳細版はこちら:\n${pageUrl}\n`;
    fs.mkdirSync("note", { recursive: true });
    fs.writeFileSync(`note/${date}.md`, noteContent.trim() + footer);
    console.log(`保存完了: note/${date}.md`);

    const title = extractTitle(noteContent);
    updateNoteIndex(date, title);
    console.log(`一覧更新: note/index.md`);
  } else {
    console.error("note 用記事の生成に失敗しました（ideas 用は保存済み）");
  }
}

run();
