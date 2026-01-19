# ひらがな予測補完

手書き入力されたひらがなのストロークをリアルタイムで解析し、次のストロークを予測して補完表示するWebアプリケーションです。

## 特徴

- **リアルタイム予測**: キャンバスに文字を書くと、次のストロークを自動的に予測します
- **視覚的なガイド**: 上位5位の予測結果を色分けして表示し、次のストロークをガイドします
- **レスポンシブデザイン**: デスクトップとモバイルデバイスの両方で快適に使用できます
- **タッチ対応**: マウスとタッチデバイスの両方に対応しています

## 使い方

1. キャンバス上でマウスまたは指を使って文字を書きます
2. 各ストロークを描画すると、次のストロークの予測が表示されます
3. 予測は上位10位まで表示され、上位5位はキャンバス上に色分けしてガイドが表示されます
4. 「戻す」ボタンで最後のストロークを削除、「クリア」ボタンで全てをクリアできます

## 技術スタック

- **HTML5**: 構造
- **CSS3**: スタイリング（モダンなUI/UX）
- **Vanilla JavaScript**: コアロジック
- **p5.js**: キャンバス描画とイベント処理

## ファイル構成

```
hiragana/
├── index.html          # メインHTMLファイル
├── css/
│   └── styles.css      # スタイルシート
├── js/
│   ├── app.js          # グローバル変数と設定
│   ├── data.js         # ひらがなストロークデータ（tomoe_dataのhiragana.tdicを使用）
│   ├── prediction.js   # 予測ロジック
│   ├── ui.js           # UI更新処理
│   └── canvas.js       # p5.jsキャンバス処理
└── README.md           # このファイル
```

## 予測アルゴリズム

予測は以下の要素を組み合わせたスコアリングシステムを使用しています：

- ストロークの始点・終点の位置
- ストロークの方向
- ストロークの長さ
- 既存のストロークとの一致度

## データソース

このプロジェクトでは、ひらがなのストロークデータとして [tomoe_data](https://github.com/hiroyuki-komatsu/tomoe_data) の `hiragana.tdic` ファイルを使用しています。

- **データソース**: [hiroyuki-komatsu/tomoe_data](https://github.com/hiroyuki-komatsu/tomoe_data)
- **使用ファイル**: [hiragana.tdic](https://raw.githubusercontent.com/hiroyuki-komatsu/tomoe_data/main/hiragana.tdic)

このデータは、ひらがな文字の各ストロークの座標情報を含んでおり、手書き入力の予測に使用されています。

## GitHub Pagesでの公開方法

1. このリポジトリをGitHubにプッシュします
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/[あなたのユーザー名]/hiragana.git
   git push -u origin main
   ```

2. GitHubリポジトリのページで「Settings」→「Pages」に移動します

3. 「Source」で「Deploy from a branch」を選択し、ブランチを「main」、フォルダを「/ (root)」に設定します

4. 「Save」をクリックすると、数分後にサイトが公開されます

5. 公開されたURLは `https://[あなたのユーザー名].github.io/hiragana/` となります

## デモ

[GitHub Pagesで公開中](https://[あなたのユーザー名].github.io/hiragana/)

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
