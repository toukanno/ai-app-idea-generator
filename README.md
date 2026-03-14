# AI App Ideas - AIアプリ起業アイデアブログ

OpenRouter の無料モデルを使い、毎日1件のアプリアイデアを自動生成して GitHub Pages で公開するシステムです。

**サイト URL**: https://toukanno.github.io/ai-app-idea-generator/

デフォルトモデル: `meta-llama/llama-3.3-70b-instruct:free`（完全無料）

## 仕組み

```
GitHub Actions (毎日 UTC 0:00)
  ↓
OpenRouter API でアプリ案を生成
  ↓
ideas/YYYY-MM-DD.md に保存
  ↓
build_site.js で HTML 化 → docs/
  ↓
自動 commit & push
  ↓
GitHub Pages で公開
```

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
├── scripts/
│   ├── generate_idea.js                     # アプリ案生成スクリプト（axios 使用）
│   └── build_site.js                        # Markdown → HTML 変換 + index 生成
├── docs/                                    # GitHub Pages 公開ディレクトリ
│   ├── index.html                           # アイデア一覧ページ
│   └── ideas/YYYY-MM-DD.html               # 各アイデアの記事ページ
├── ideas/                                   # 生成されたアプリ案（Markdown）
│   └── YYYY-MM-DD.md
├── package.json                             # 依存パッケージ定義
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

### HTTP 402（クレジット不足）が発生した場合

402 は OpenRouter アカウントにクレジットがない状態で有料モデルを呼んだ場合に発生します。

**対処法A: 無料モデルを使う（推奨・デフォルト）**

workflow の `MODEL` 環境変数に `:free` 付きモデルを指定します（現在のデフォルト設定）:

```yaml
env:
  MODEL: "meta-llama/llama-3.3-70b-instruct:free,google/gemma-3-27b-it:free,qwen/qwen3-4b:free"
```

カンマ区切りで複数モデルを指定すると、最初のモデルが失敗した場合に次のモデルへ自動フォールバックします。
各モデルにつき最大3回リトライ（429 レート制限時は10秒間隔）。

利用可能な無料モデル例:

| モデル ID | 特徴 |
|---|---|
| `meta-llama/llama-3.3-70b-instruct:free` | 高品質、日本語対応良好（デフォルト） |
| `google/gemma-3-27b-it:free` | Google 製、バランス型 |
| `qwen/qwen3-coder:free` | 技術系プロンプト向き |
| `mistralai/mistral-small-3.1-24b-instruct:free` | 軽量・高速 |

**対処法B: クレジットを購入して有料モデルを使う**

1. https://openrouter.ai/settings/credits でクレジットを追加
2. workflow の `MODEL` を `deepseek/deepseek-chat` 等に変更

`deepseek/deepseek-chat` の場合、1回の生成で約 $0.001 未満（1日1回なら月 $0.03 以下）。

## 今後の拡張

- **モデル変更**: `scripts/generate_idea.js` の `model` を書き換えるだけ
- **プロンプト改良**: `prompt` 変数を編集してジャンル指定や制約を追加
- **通知連携**: ワークフローに Slack / Discord 通知ステップを追加
- **一覧生成**: `ideas/` を走査して INDEX.md を自動生成するスクリプトを追加
