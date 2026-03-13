const axios = require("axios");
const fs = require("fs");

const key = process.env.OPENROUTER_API_KEY;

async function run() {
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "user",
          content: "日本語で新しいAIアプリのアイデアを1つ提案してください。タイトルと概要と機能をMarkdown形式で出力してください。"
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      }
    }
  );

  const idea = res.data.choices[0].message.content;
  const date = new Date().toISOString().slice(0, 10);

  fs.mkdirSync("ideas", { recursive: true });
  fs.writeFileSync(`ideas/${date}.md`, idea);
}

run();
