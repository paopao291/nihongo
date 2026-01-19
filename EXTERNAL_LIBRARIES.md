# 外部ライブラリの活用提案

## 現状のプロジェクト構成
- Vanilla JavaScript
- p5.js（キャンバス描画）
- CDN経由での読み込み

## 推奨ライブラリ（優先順位順）

### 1. **ml-distance** / **fast-dtw** (軽量・実装容易)

#### 特徴
- Dynamic Time Warping (DTW) の実装
- 小さいファイルサイズ（数KB）
- npmまたはCDN経由で利用可能

#### メリット
- 現在の簡易DTW実装を高精度なものに置き換え可能
- 形状マッチングの精度が向上
- 既存コードへの統合が容易

#### 実装例
```javascript
// CDN経由で読み込み
<script src="https://cdn.jsdelivr.net/npm/fast-dtw@1.0.0/dist/index.min.js"></script>

// 使用例
const dtw = new FastDTW();
const distance = dtw.compute(userStroke, templateStroke);
```

#### ファイルサイズ
- 約 5-10KB（minified）

---

### 2. **ml-distance** (数学的距離計算)

#### 特徴
- Fréchet距離、Hausdorff距離など複数の距離計算
- 軽量（必要な関数のみインポート可能）

#### メリット
- より正確な形状マッチング
- 曲線間の距離を正確に計算

#### 実装例
```javascript
import { frechetDistance } from 'ml-distance';

const dist = frechetDistance(userPoints, templatePoints);
```

#### ファイルサイズ
- 約 15-20KB（必要な部分のみ）

---

### 3. **TensorFlow.js** (機械学習ベース)

#### 特徴
- ブラウザ上で機械学習モデルを実行
- 学習済みモデルを使用可能
- カスタムモデルの訓練も可能

#### メリット
- 高精度な文字認識が可能
- データから自動的に特徴を学習

#### デメリット
- ファイルサイズが大きい（200KB+）
- 学習データが必要
- 実装が複雑

#### 適用例
- ひらがなの分類モデルを訓練
- ストロークから特徴量を抽出して分類

---

### 4. **Handwriting Recognition API** (ブラウザネイティブ)

#### 特徴
- ブラウザ標準API（Chrome/Edge対応）
- 外部ライブラリ不要

#### メリット
- 追加の依存関係なし
- 時間情報・筆順情報が取得可能

#### デメリット
- ブラウザ対応が限定的
- 日本語の精度は不明

#### 実装例
```javascript
if ('HandwritingRecognizer' in navigator) {
    const recognizer = await navigator.createHandwritingRecognizer({
        languages: ['ja']
    });
    // ストロークデータを認識
}
```

---

### 5. **MyScript iinkJS** / **ML Kit** (商用API)

#### 特徴
- 高精度な手書き認識
- 商用ライセンスが必要な場合あり

#### メリット
- 非常に高精度
- 日本語対応

#### デメリット
- コストがかかる可能性
- 外部API依存

---

## 推奨実装戦略

### Phase 1: 軽量ライブラリの導入（即効性）

**fast-dtw** または類似のDTWライブラリを導入

```javascript
// index.htmlに追加
<script src="https://cdn.jsdelivr.net/npm/fast-dtw@1.0.0/dist/index.min.js"></script>

// prediction.jsで使用
function improvedStrokeDistance(userStroke, templateStroke) {
    // 既存のリサンプリング関数を使用
    const uResampled = resampleStroke(userStroke, 30);
    const tResampled = resampleStroke(templateStroke, 30);
    
    // DTWで最適な対応付けを計算
    const dtw = new FastDTW();
    return dtw.compute(
        uResampled.map(p => [p.x, p.y]),
        tResampled.map(p => [p.x, p.y])
    );
}
```

**期待される効果**
- 形状マッチングの精度向上（10-20%）
- 「お」と「む」の区別精度向上

### Phase 2: 距離計算ライブラリの追加（中期的）

**ml-distance** からFréchet距離を導入

**期待される効果**
- より正確な曲線間の距離計算
- 複雑なストロークの評価精度向上

### Phase 3: 機械学習の検討（長期的）

必要に応じてTensorFlow.jsを検討

---

## 各ライブラリの比較

| ライブラリ | ファイルサイズ | 実装の容易さ | 精度向上 | 推奨度 |
|----------|------------|------------|---------|--------|
| fast-dtw | ★★★★★ 小 | ★★★★★ 容易 | ★★★ 中 | ⭐⭐⭐⭐⭐ |
| ml-distance | ★★★★ 小-中 | ★★★★ やや容易 | ★★★★ 高 | ⭐⭐⭐⭐ |
| TensorFlow.js | ★★ 大 | ★★ 複雑 | ★★★★★ 最高 | ⭐⭐ |
| Handwriting API | ★★★★★ なし | ★★★★ やや容易 | ★★★ 中 | ⭐⭐⭐ |
| MyScript/ML Kit | ★★★★★ API | ★★★★ 容易 | ★★★★★ 最高 | ⭐⭐⭐ |

---

## 実装の優先順位

1. **fast-dtw**（即座に導入可能、効果大）
2. **ml-distance**（Fréchet距離で精度向上）
3. **Handwriting API**（ブラウザ対応の場合）
4. **TensorFlow.js**（長期計画）

---

## 注意点

### ライセンス
- fast-dtw: MIT License ✅
- ml-distance: MIT License ✅
- TensorFlow.js: Apache 2.0 ✅
- MyScript: 商用ライセンス要確認

### パフォーマンス
- DTWは計算コストが高い場合がある
- 大量の文字（46文字）との比較では最適化が必要
- 必要に応じてWeb Workerで処理を分離

### ブラウザ対応
- fast-dtw, ml-distance: すべてのモダンブラウザ
- TensorFlow.js: すべてのモダンブラウザ
- Handwriting API: Chrome/Edgeのみ

---

## 次のステップ

1. fast-dtwを導入してDTW精度を向上
2. 効果を測定
3. 必要に応じてml-distanceを追加
4. 長期的には機械学習モデルの検討
