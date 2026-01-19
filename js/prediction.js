// 予測ロジック（改善版）

// ストローク間の距離を計算（Dynamic Time Warping簡易版）
function strokeDistance(userStroke, templateStroke) {
    const u = userStroke;
    const t = templateStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));

    if (u.length < 2 || t.length < 2) return Infinity;

    // ストロークを同じ点数にリサンプリング
    const numPoints = 12;
    const uResampled = resampleStroke(u, numPoints);
    const tResampled = resampleStroke(t, numPoints);

    // 点ごとの距離の平均
    let totalDist = 0;
    for (let i = 0; i < numPoints; i++) {
        totalDist += dist(uResampled[i].x, uResampled[i].y, tResampled[i].x, tResampled[i].y);
    }

    return totalDist / numPoints;
}

// ストロークを指定した点数にリサンプリング
function resampleStroke(stroke, numPoints) {
    if (stroke.length < 2) return stroke;

    // 総距離を計算
    let totalLength = 0;
    for (let i = 1; i < stroke.length; i++) {
        totalLength += dist(stroke[i].x, stroke[i].y, stroke[i-1].x, stroke[i-1].y);
    }

    if (totalLength === 0) return Array(numPoints).fill(stroke[0]);

    const interval = totalLength / (numPoints - 1);
    const resampled = [{ ...stroke[0] }];
    let accDist = 0;
    let j = 1;

    for (let i = 1; i < numPoints - 1; i++) {
        const targetDist = i * interval;

        while (j < stroke.length) {
            const segDist = dist(stroke[j].x, stroke[j].y, stroke[j-1].x, stroke[j-1].y);

            if (accDist + segDist >= targetDist) {
                const ratio = (targetDist - accDist) / segDist;
                resampled.push({
                    x: stroke[j-1].x + ratio * (stroke[j].x - stroke[j-1].x),
                    y: stroke[j-1].y + ratio * (stroke[j].y - stroke[j-1].y)
                });
                break;
            }
            accDist += segDist;
            j++;
        }

        if (resampled.length <= i) {
            resampled.push({ ...stroke[stroke.length - 1] });
        }
    }

    resampled.push({ ...stroke[stroke.length - 1] });
    return resampled;
}

// 方向の類似度（-1 to 1）
function directionSimilarity(userStroke, templateStroke) {
    const u = userStroke;
    const t = templateStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));

    if (u.length < 2 || t.length < 2) return 0;

    const uDir = Math.atan2(u[u.length-1].y - u[0].y, u[u.length-1].x - u[0].x);
    const tDir = Math.atan2(t[t.length-1].y - t[0].y, t[t.length-1].x - t[0].x);

    // cos類似度
    return Math.cos(uDir - tDir);
}

// メインスコア計算
function calcScore(user, template) {
    const userLen = user.length;
    const templateLen = template.length;

    // ストロークがない場合
    if (userLen === 0) return 0;

    // ユーザーのストローク数がテンプレートより多い場合は0
    if (userLen > templateLen) return 0;

    let totalScore = 0;
    const maxDistForNormalization = canvasSize * 0.4; // 正規化用の最大距離

    // 各ストロークのマッチング
    for (let i = 0; i < userLen; i++) {
        const userStroke = user[i];
        const templateStroke = template[i];

        // ストロークの長さを判定（短いストロークかどうか）
        const uStart = userStroke[0];
        const uEnd = userStroke[userStroke.length - 1];
        const tStart = {
            x: (templateStroke[0].x / 320) * canvasSize,
            y: (templateStroke[0].y / 320) * canvasSize
        };
        const tEnd = {
            x: (templateStroke[templateStroke.length - 1].x / 320) * canvasSize,
            y: (templateStroke[templateStroke.length - 1].y / 320) * canvasSize
        };
        
        const userStrokeLength = dist(uStart.x, uStart.y, uEnd.x, uEnd.y);
        const templateStrokeLength = dist(tStart.x, tStart.y, tEnd.x, tEnd.y);
        const isShortStroke = userStroke.length <= 3 || userStrokeLength < canvasSize * 0.2;
        const isFirstStroke = i === 0;

        // 形状の距離（0に近いほど良い）
        const shapeDist = strokeDistance(userStroke, templateStroke);
        // 短いストロークの場合は正規化を緩和
        const normalizationDist = isShortStroke ? maxDistForNormalization * 1.5 : maxDistForNormalization;
        const shapeScore = Math.max(0, 1 - shapeDist / normalizationDist);

        // 方向の類似度（-1 to 1 → 0 to 1）
        const dirScore = (directionSimilarity(userStroke, templateStroke) + 1) / 2;

        // 始点の位置マッチング
        const startDist = dist(uStart.x, uStart.y, tStart.x, tStart.y);
        const startScore = Math.max(0, 1 - startDist / (canvasSize * 0.3));

        // 終点の位置マッチング（短いストロークや最初のストロークでは重要）
        const endDist = dist(uEnd.x, uEnd.y, tEnd.x, tEnd.y);
        const endScore = Math.max(0, 1 - endDist / (canvasSize * 0.3));

        // ストロークスコア（重み付け）
        // 短いストロークや最初のストロークでは位置マッチングを重視
        let strokeScore;
        if (isShortStroke || isFirstStroke) {
            strokeScore = (
                shapeScore * 30 +    // 形状: 30点（短いストロークでは形状より位置が重要）
                dirScore * 20 +      // 方向: 20点
                startScore * 30 +    // 始点: 30点（重要）
                endScore * 20        // 終点: 20点（重要）
            );
        } else {
            strokeScore = (
                shapeScore * 50 +    // 形状: 50点
                dirScore * 25 +      // 方向: 25点
                startScore * 15 +    // 始点: 15点
                endScore * 10        // 終点: 10点
            );
        }

        totalScore += strokeScore;
    }

    // 平均スコア
    let avgScore = totalScore / userLen;

    // ストローク数ボーナス/ペナルティ
    // 残りストローク数が少ないほどボーナス
    const remainingRatio = (templateLen - userLen) / templateLen;
    const strokeCountBonus = 1 + (1 - remainingRatio) * 0.1; // 最大10%ボーナス

    avgScore *= strokeCountBonus;

    return Math.max(0, Math.min(100, avgScore));
}

function updatePredictions() {
    document.getElementById('stroke-count').textContent = userStrokes.length;

    if (!userStrokes.length) {
        predictions = [];
        renderUI([]);
        return;
    }

    const cands = [];
    for (let [char, data] of Object.entries(hiraganaData)) {
        const score = calcScore(userStrokes, data.strokes);
        if (score > 0) {
            cands.push({ char, score, strokes: data.strokes });
        }
    }

    // スコアでソート
    cands.sort((a, b) => b.score - a.score);

    predictions = cands;
    renderUI(cands.slice(0, 10));
}
