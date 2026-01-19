# 外部ライブラリ導入ガイド

## 最優先: fast-dtw の導入

### ステップ1: HTMLにライブラリを追加

`index.html`の`<head>`セクションに追加：

```html
<!-- fast-dtw ライブラリ -->
<script src="https://cdn.jsdelivr.net/npm/fast-dtw@1.0.1/dist/fastdtw.min.js"></script>
```

### ステップ2: prediction.jsを更新

既存の`strokeDistance`関数を以下のように置き換え：

```javascript
// 高精度なDTW距離計算（fast-dtw使用）
function strokeDistanceDTW(userStroke, templateStroke) {
    const u = userStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));
    const t = templateStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));

    if (u.length < 2 || t.length < 2) return Infinity;

    // fast-dtwを使用
    // 点の配列を[[x,y], [x,y], ...]形式に変換
    const uPoints = u.map(p => [p.x, p.y]);
    const tPoints = t.map(p => [p.x, p.y]);

    // DTW距離を計算
    const result = fastdtw(uPoints, tPoints);
    return result.distance;
}

// 既存のstrokeDistance関数を条件分岐で切り替え可能に
function strokeDistance(userStroke, templateStroke) {
    // fast-dtwが利用可能な場合は使用
    if (typeof fastdtw !== 'undefined') {
        return strokeDistanceDTW(userStroke, templateStroke);
    }
    // フォールバック：既存の実装
    // ... 既存のコード ...
}
```

### ステップ3: 実装をテスト

ブラウザで動作確認し、精度向上を確認

---

## 代替案: シンプルなDTW実装（ライブラリ不要）

外部ライブラリを使いたくない場合、より精度の高いDTWを自前で実装：

```javascript
// 簡易DTW実装（改善版）
function simpleDTW(stroke1, stroke2) {
    const n = stroke1.length;
    const m = stroke2.length;
    
    // コストマトリックス
    const dtw = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;
    
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = dist(
                stroke1[i-1].x, stroke1[i-1].y,
                stroke2[j-1].x, stroke2[j-1].y
            );
            dtw[i][j] = cost + Math.min(
                dtw[i-1][j],      // 挿入
                dtw[i][j-1],      // 削除
                dtw[i-1][j-1]     // 一致
            );
        }
    }
    
    return dtw[n][m] / (n + m); // 正規化
}
```

---

## 推奨アプローチ

1. **まずは自前のDTW実装を改善**（軽量・依存なし）
2. **効果が不十分ならfast-dtwを導入**（約5KB追加）
3. **さらなる精度が必要ならml-distanceを検討**

---

## パフォーマンス考慮

DTWは計算コストが高いため：

```javascript
// 事前にフィルタリング（スコアが低い候補は除外）
const candidates = [];
for (let [char, data] of Object.entries(hiraganaData)) {
    // 簡単なチェック（ストローク数、始点の位置など）でフィルタ
    if (quickFilter(userStrokes, data.strokes)) {
        const score = calcScore(userStrokes, data.strokes);
        if (score > threshold) {
            candidates.push({ char, score, strokes: data.strokes });
        }
    }
}
```
