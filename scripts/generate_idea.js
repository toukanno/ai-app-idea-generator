const axios = require("axios");
const fs = require("fs");

const key = process.env.OPENROUTER_API_KEY;
const models = (process.env.MODEL || "meta-llama/llama-3.3-70b-instruct:free")
  .split(",")
  .map((s) => s.trim());

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generate(model) {
  console.log(`モデル: ${model}`);
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: model,
      messages: [
        {
          role: "user",
          content:
            "日本語で新しいAIアプリのアイデアを1つ提案してください。タイトルと概要と機能をMarkdown形式で出力してください。",
        },
      ],
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

async function run() {
  if (!key) {
    console.error("ERROR: OPENROUTER_API_KEY is not set");
    console.error("GitHub Secrets に OPENROUTER_API_KEY を設定してください");
    process.exit(1);
  }

  let content = null;
  let lastError = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`試行 ${attempt}/${MAX_RETRIES}...`);
      try {
        content = await generate(model);
        if (content) break;
        console.error("レスポンスに content がありません。リトライします...");
      } catch (err) {
        lastError = err;
        if (err.response) {
          const status = err.response.status;
          console.error(`API Error (HTTP ${status}): ${JSON.stringify(err.response.data)}`);

          if (status === 401) {
            console.error("→ APIキーが無効です。OpenRouter で再発行してください。");
            process.exit(1);
          } else if (status === 402) {
            console.error("→ クレジット不足です。無料モデルに切り替えてください。");
            break; // このモデルをスキップして次へ
          } else if (status === 429) {
            console.error(`→ レート制限。${RETRY_DELAY_MS / 1000}秒後にリトライ...`);
            await sleep(RETRY_DELAY_MS);
            continue;
          }
        } else {
          console.error("リクエストエラー:", err.message);
        }
        if (attempt < MAX_RETRIES) {
          console.error(`${RETRY_DELAY_MS / 1000}秒後にリトライ...`);
          await sleep(RETRY_DELAY_MS);
        }
      }
    }
    if (content) break;
    console.error(`${model} で生成失敗。次のモデルを試します...\n`);
  }

  if (!content) {
    console.error("すべてのモデルで生成に失敗しました。");
    if (lastError?.response) {
      console.error("最後のエラー:", JSON.stringify(lastError.response.data));
    }
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 10);
  fs.mkdirSync("ideas", { recursive: true });
  fs.writeFileSync(`ideas/${date}.md`, content);
  console.log(`保存完了: ideas/${date}.md`);
}

run();
