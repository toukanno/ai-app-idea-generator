# AI App Ideas - AIアプリ起業アイデアブログ

OpenRouter の無料モデルを使い、毎日1件のアプリアイデアを自動生成して **GitHub Pages で公開** するシステムです。

**サイト URL**: https://toukanno.github.io/ai-app-idea-generator/

デフォルトモデル: `meta-llama/llama-3.3-70b-instruct:free`（完全無料）

## 仕組み

```
GitHub Actions (毎日 UTC 0:00 / JST 9:00)
  ↓
OpenRouter API でアプリ案を生成
  ↓
ideas/YYYY-MM-DD.md に Markdown 保存
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
npm install
```

### 2. GitHub Secrets を設定

1. GitHub リポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
2. **New repository secret** をクリック
3. 以下を入力して **Add secret**:
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: OpenRouter の API キー（`sk-or-v1-...` 形式）

> API キーは https://openrouter.ai/keys で無料で発行できます。

### 3. GitHub Pages を有効化

1. リポジトリの **Settings** → **Pages** を開く
2. **Source** で **Deploy from a branch** を選択
3. **Branch** で `main`、フォルダで `/docs` を選択
4. **Save** をクリック
5. 数分後に https://toukanno.github.io/ai-app-idea-generator/ でサイトが公開される

### 4. 動作確認（手動実行）

1. リポジトリの **Actions** タブを開く
2. **Daily AI App Idea Generator** を選択
3. **Run workflow** → **Run workflow** をクリック
4. 完了後、`ideas/YYYY-MM-DD.md` と `docs/ideas/YYYY-MM-DD.html` が生成されれば成功

### 5. 自動実行

設定不要です。毎日 UTC 0:00（JST 9:00）に自動実行されます。

## ローカル実行

```bash
# アイデア生成
OPENROUTER_API_KEY="sk-or-v1-xxxxxxxx" node scripts/generate_idea.js

# サイトビルド（ideas/ → docs/）
node scripts/build_site.js
```

Windows PowerShell の場合:

```powershell
$env:OPENROUTER_API_KEY="sk-or-v1-xxxxxxxx"
node scripts/generate_idea.js
node scripts/build_site.js
```

## ファイル構成

```
├── .github/workflows/ai-app-generator.yml  # GitHub Actions ワークフロー
├── scripts/
│   ├── generate_idea.js                     # アプリ案生成（axios + OpenRouter）
│   └── build_site.js                        # Markdown → HTML + index.html 生成
├── docs/                                    # GitHub Pages 公開ディレクトリ
│   ├── index.html                           # アイデア一覧（最新30件）
│   └── ideas/YYYY-MM-DD.html               # 各アイデアの記事ページ
├── ideas/                                   # 生成されたアプリ案（Markdown）
│   └── YYYY-MM-DD.md
├── package.json
└── README.md
```

## トラブルシューティング

### Actions が失敗する場合

| 症状 | 原因 | 対処 |
|---|---|---|
| `OPENROUTER_API_KEY is not set` | Secret 未設定 | Settings → Secrets で `OPENROUTER_API_KEY` を設定 |
| `API Error (HTTP 401)` | API キーが無効 | OpenRouter でキーを再発行して Secret を更新 |
| `API Error (HTTP 402)` | クレジット不足 | 下記「402 の対処法」を参照 |
| `API Error (HTTP 429)` | レート制限 | 自動リトライ（10秒×3回）で回復。それでも失敗なら時間をおいて再実行 |
| `API Error (HTTP 503)` | モデル一時停止 | 時間をおいて再実行 |

### HTTP 402（クレジット不足）の対処法

**対処法A: 無料モデルを使う（推奨・デフォルト）**

workflow の `MODEL` 環境変数に `:free` 付きモデルを指定します（現在のデフォルト設定）:

```yaml
env:
  MODEL: "meta-llama/llama-3.3-70b-instruct:free,google/gemma-3-27b-it:free,qwen/qwen3-4b:free"
```

カンマ区切りで複数モデルを指定すると、失敗時に次のモデルへ自動フォールバックします。

| モデル ID | 特徴 |
|---|---|
| `meta-llama/llama-3.3-70b-instruct:free` | 高品質、日本語対応良好（デフォルト） |
| `google/gemma-3-27b-it:free` | Google 製、バランス型 |
| `qwen/qwen3-4b:free` | 軽量・高速 |

**対処法B: クレジットを購入して有料モデルを使う**

1. https://openrouter.ai/settings/credits でクレジットを追加
2. workflow の `MODEL` を `deepseek/deepseek-chat` 等に変更（月 $0.03 以下）

### Actions ログの確認手順

1. **Actions タブ** → 失敗したワークフローを開く
2. **generate** ジョブ → 失敗ステップを展開
3. エラーメッセージを確認して上の表と照合

## 今後の拡張

- **モデル変更**: workflow の `MODEL` 環境変数を書き換えるだけ
- **プロンプト改良**: `generate_idea.js` の `content` を編集してジャンル指定や制約を追加
- **通知連携**: workflow に Slack / Discord 通知ステップを追加
- **カテゴリ分類**: 生成時にタグを付与し、カテゴリ別ページを生成
- **RSS フィード**: `build_site.js` に RSS 生成を追加
