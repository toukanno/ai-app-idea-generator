const axios = require("axios");
const fs = require("fs");

const key = process.env.OPENROUTER_API_KEY;
const model = process.env.MODEL || "deepseek/deepseek-chat";

async function run() {
  if (!key) {
    console.error("ERROR: OPENROUTER_API_KEY is not set");
    console.error("GitHub Secrets に OPENROUTER_API_KEY を設定してください");
    process.exit(1);
  }

  console.log(`モデル: ${model}`);
  console.log("アプリ案を生成中...");

  let res;
  try {
    res = await axios.post(
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
        timeout: 60000,
      }
    );
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const body = err.response.data;
      console.error(`API Error (HTTP ${status}):`);
      console.error(JSON.stringify(body, null, 2));

      if (status === 401) {
        console.error("→ APIキーが無効です。OpenRouter で再発行してください。");
      } else if (status === 402) {
        console.error("→ クレジット不足です。https://openrouter.ai/settings/credits で追加するか、");
        console.error("  無料モデル (例: deepseek/deepseek-chat:free) に変更してください。");
        console.error("  workflow の env に MODEL=deepseek/deepseek-chat:free を追加すれば切替できます。");
      } else if (status === 429) {
        console.error("→ レート制限です。時間をおいて再実行してください。");
      }
    } else {
      console.error("リクエストエラー:", err.message);
    }
    process.exit(1);
  }

  const content = res.data?.choices?.[0]?.message?.content;
  if (!content) {
    console.error("レスポンスに content がありません:");
    console.error(JSON.stringify(res.data, null, 2));
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 10);
  fs.mkdirSync("ideas", { recursive: true });
  fs.writeFileSync(`ideas/${date}.md`, content);
  console.log(`保存完了: ideas/${date}.md`);
}

run();
