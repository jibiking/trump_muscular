# Card Trainer Workout Suite

トランプ筋トレのルーチンを CLI 版から Web 版へ拡張したリポジトリです。最新バージョンでは Web UI を追加し、Vercel などのホスティングに対応したフロントエンドを提供します。

## 構成

| パス | 役割 |
| --- | --- |
| `web/` | Web 版の静的アセット (HTML/CSS/JS) |
| `card_trainer.rb` | 旧 CLI 版の Ruby スクリプト (互換性維持用) |
| `test/test_deck.rb` | デッキ仕様を確認する Minitest |
| `SPEC.md` | 初期仕様書 |
| `version_up.md` | バージョンアップ施策メモ |

## Web 版の利用方法

### 1. ローカルプレビュー

静的ファイルなので任意のサーバーで配信できます。以下は代表例です。

#### Python の簡易サーバー
```bash
python3 -m http.server 5173 --directory web
```
ブラウザで `http://localhost:5173` を開きます。

#### npm の `serve` を使う場合
```bash
npx serve web
```

### 2. Vercel へのデプロイ

1. リポジトリを Vercel にインポートします。
2. 「Framework Preset」は `Other` を選び、**Root Directory** に `web` を指定します。
3. Build Settings はビルドコマンド・出力ディレクトリともに空欄で OK、静的配信のみの場合は設定不要です。
4. デプロイすると `/web/index.html` がそのまま公開されます。

> **補足:** `vercel dev` を使う場合は `cd web` してから `vercel dev --listen 3000` を実行するとホットリロード付きで確認できます。

## Web UI の主な機能

- 52 枚のカードをシャッフルして 1 枚ずつ引くワークアウト体験
- 種目名と回数を大きく表示し、動作ポイントを添えたカードパネル
- 累計回数、残りカード枚数、スート別残数を常時トラッキング
- ドローログと途中経過ダイアログで振り返りをサポート
- モバイルでは操作パネルとカードを固定表示し、その場で確認できるレイアウト

## 旧 CLI 版の利用方法 (互換目的)

```bash
ruby card_trainer.rb [--seed=SEED] [--no-color] [--no-bell]
```

## テスト

デッキ仕様 (枚数・ユニーク性・値マッピング) の確認は次のコマンドで行えます。

```bash
ruby test/test_deck.rb
```

## 今後のアイデア

- Web 版でのアニメーション強化やサウンド演出
- カードデザインのカスタムテーマ (昼夜切り替えなど)
- 記録エクスポート、共有用の URL 発行

Web 版の改善アイデアがあれば Issue や PR で気軽に提案してください。
