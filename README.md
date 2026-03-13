# AI App Idea Generator

OpenRouter（deepseek/deepseek-chat）を使って、毎日1件のアプリアイデアを自動生成するシステムです。

## セットアップ手順

### 1. リポジトリを用意

```bash
git clone https://github.com/toukanno/ai-app-idea-generator.git
cd ai-app-idea-generator
```

### 2. GitHub Secrets を設定

1. GitHub リポジトリページを開く
2. **Settings** → **Secrets and variables** → **Actions** に移動
3. **New repository secret** をクリック
4. 以下を入力して **Add secret**:
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: OpenRouter の API キー（`sk-or-v1-...` 形式）

> API キーは https://openrouter.ai/keys で発行できます。

### 3. GitHub Actions を手動実行して確認

1. リポジトリの **Actions** タブを開く
2. 左メニューから **Daily AI App Idea Generator** を選択
3. **Run workflow** → **Run workflow** をクリック
4. 実行完了後、`ideas/YYYY-MM-DD.md` が生成されていれば成功

### 4. 自動実行

設定不要です。毎日 UTC 0:00（JST 9:00）に自動実行されます。

## ローカル実行

```bash
# bash / WSL
OPENROUTER_API_KEY="sk-or-v1-xxxxxxxx" node scripts/generate_idea.js

# Windows PowerShell
$env:OPENROUTER_API_KEY="sk-or-v1-xxxxxxxx"
node scripts/generate_idea.js
```

`ideas/YYYY-MM-DD.md` が生成されます。同じ日に再実行するとファイルが上書きされます。

## Setup

1. GitHub リポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
2. **New repository secret** で `OPENROUTER_API_KEY` を登録する

## ファイル構成

```
├── .github/workflows/ai-app-generator.yml  # GitHub Actions ワークフロー
├── scripts/generate_idea.js                 # アプリ案生成スクリプト（axios 使用）
├── package.json                             # 依存パッケージ定義
├── ideas/                                   # 生成されたアプリ案の保存先
│   └── YYYY-MM-DD.md
└── README.md
```

## トラブルシューティング

### Actions が失敗する場合

| 症状 | 原因 | 対処 |
|---|---|---|
| `OPENROUTER_API_KEY が設定されていません` | Secret 未設定 | Settings → Secrets で `OPENROUTER_API_KEY` を設定 |
| `API Error (HTTP 401)` | API キーが無効 | OpenRouter でキーを再発行して Secret を更新 |
| `API Error (HTTP 402)` | クレジット不足 | OpenRouter でクレジットを追加、または無料モデルに変更 |
| `API Error (HTTP 429)` | レート制限 | 時間をおいて再実行 |
| `API Error (HTTP 503)` | モデル一時停止 | 時間をおいて再実行、または別モデルに変更 |
| `JSONパースエラー` | API からの不正レスポンス | Actions のログで生レスポンスを確認 |
| `レスポンスにcontentがありません` | モデルが空応答を返した | 再実行、またはプロンプトを調整 |

### ローカル動作確認結果

API キー未設定で実行した場合の動作を確認済みです:

```
$ node scripts/generate_idea.js
ERROR: OPENROUTER_API_KEY が設定されていません
(exit code 1)
```

API キーを設定すれば `ideas/YYYY-MM-DD.md` が正常に生成されます。

### Actions ログの確認手順

1. **Actions タブ** → 失敗したワークフローを開く
2. **generate** ジョブ → **Generate app idea** ステップを展開
3. エラーメッセージを確認して上の表と照合

### 無料枠で運用するコツ

- `deepseek/deepseek-chat` は低コストモデルです
- 1日1回の実行なら無料枠・最小クレジットで十分動きます
- 完全無料にしたい場合はモデルを `:free` 付きのものに変更してください

## 今後の拡張

- **モデル変更**: `scripts/generate_idea.js` の `model` を書き換えるだけ
- **プロンプト改良**: `prompt` 変数を編集してジャンル指定や制約を追加
- **通知連携**: ワークフローに Slack / Discord 通知ステップを追加
- **一覧生成**: `ideas/` を走査して INDEX.md を自動生成するスクリプトを追加
