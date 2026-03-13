const https = require("https");
const fs = require("fs");
const path = require("path");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY が設定されていません");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const outDir = path.join(__dirname, "..", "ideas");
const outFile = path.join(outDir, `${today}.md`);

const prompt = `あなたは創造的なアプリ企画者です。
ユニークで実用的なアプリのアイデアを1つ提案してください。

以下の形式で日本語のMarkdownを出力してください:

# アプリ名: （アプリ名）

## 概要
（1〜2文でアプリの概要）

## 解決する課題
（どんな問題を解決するか）

## 主な機能
- 機能1
- 機能2
- 機能3

## 技術スタック（想定）
- フロントエンド:
- バックエンド:
- その他:

## ターゲットユーザー
（誰向けか）

## マネタイズ案
（収益化の方法）

## 差別化ポイント
（既存サービスとの違い）`;

const body = JSON.stringify({
  model: "deepseek/deepseek-chat",
  messages: [{ role: "user", content: prompt }],
  max_tokens: 1500,
  temperature: 0.9,
});

const options = {
  hostname: "openrouter.ai",
  path: "/api/v1/chat/completions",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://github.com/ai-app-idea-generator",
  },
};

console.log(`[${today}] アプリ案を生成中...`);

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    if (res.statusCode !== 200) {
      console.error(`API Error (HTTP ${res.statusCode}):`);
      console.error(data);
      process.exit(1);
    }

    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      console.error("JSONパースエラー:", e.message);
      console.error("Response:", data);
      process.exit(1);
    }

    if (parsed.error) {
      console.error("API Error:", JSON.stringify(parsed.error, null, 2));
      process.exit(1);
    }

    const content = parsed.choices?.[0]?.message?.content;
    if (!content) {
      console.error("レスポンスにcontentがありません:", JSON.stringify(parsed, null, 2));
      process.exit(1);
    }

    fs.mkdirSync(outDir, { recursive: true });

    const header = `<!-- generated: ${today} by deepseek/deepseek-chat via OpenRouter -->\n\n`;
    fs.writeFileSync(outFile, header + content.trim() + "\n");
    console.log(`保存完了: ${outFile}`);
  });
});

req.on("error", (e) => {
  console.error("リクエストエラー:", e.message);
  process.exit(1);
});

req.write(body);
req.end();
