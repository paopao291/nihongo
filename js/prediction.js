// 予測ロジック（改善版）

// 真のDTW（Dynamic Time Warping）実装（ウィンドウ制限付きで高速化、改善版）
function dtwDistance(stroke1, stroke2, windowSize = 5) {
    const n = stroke1.length;
    const m = stroke2.length;

    if (n === 0 || m === 0) return Infinity;
    if (n === 1 && m === 1) {
        return dist(stroke1[0].x, stroke1[0].y, stroke2[0].x, stroke2[0].y);
    }

    // ウィンドウ制限を適用（計算量を削減）
    // より適応的なウィンドウサイズ
    const w = Math.max(windowSize, Math.ceil(Math.abs(n - m) * 1.5));

    // DPテーブル（必要な部分のみ保持）
    const dtw = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        const jStart = Math.max(1, i - w);
        const jEnd = Math.min(m, i + w);
        
        for (let j = jStart; j <= jEnd; j++) {
            const cost = dist(
                stroke1[i - 1].x, stroke1[i - 1].y,
                stroke2[j - 1].x, stroke2[j - 1].y
            );
            
            // 最小コストパスを選択（対角線を優先）
            dtw[i][j] = cost + Math.min(
                dtw[i - 1][j] * 1.1,      // 挿入（少しペナルティ）
                dtw[i][j - 1] * 1.1,      // 削除（少しペナルティ）
                dtw[i - 1][j - 1]         // 一致（優先）
            );
        }
    }

    // 正規化された距離を返す（より正確な正規化）
    // ストロークの長さも考慮
    let stroke1Length = 0;
    for (let i = 1; i < n; i++) {
        stroke1Length += dist(stroke1[i].x, stroke1[i].y, stroke1[i-1].x, stroke1[i-1].y);
    }
    let stroke2Length = 0;
    for (let i = 1; i < m; i++) {
        stroke2Length += dist(stroke2[i].x, stroke2[i].y, stroke2[i-1].x, stroke2[i-1].y);
    }
    const avgLength = (stroke1Length + stroke2Length) / 2;
    // 平均長さで正規化（長いストロークほど許容範囲が広い）
    // さらに、点数の違いも考慮
    const lengthNormalized = avgLength > 0 ? dtw[n][m] / avgLength : dtw[n][m] / (n + m);
    const pointNormalized = lengthNormalized / Math.max(n, m);
    return pointNormalized;
}

// ストローク間の距離を計算（DTW実装版）
function strokeDistance(userStroke, templateStroke) {
    const u = userStroke;
    const t = templateStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));

    if (u.length < 2 || t.length < 2) return Infinity;

    // 点数の差が大きい場合や、どちらかが長すぎる場合はリサンプリング
    // tomoeデータは点が少ない（2-9点程度）ので、ユーザーのストロークが多すぎる場合に備える
    const pointRatio = Math.max(u.length, t.length) / Math.min(u.length, t.length);
    const isComplexStroke = u.length > 20 || t.length > 20;
    const hasLargePointDifference = pointRatio > 2.0; // 点数の差が2倍以上
    
    if (isComplexStroke || hasLargePointDifference) {
        // リサンプリングしてからDTW（点数の違いを吸収）
        // 短いストロークでも適切な点数にリサンプリング
        const numPoints = Math.max(15, Math.min(25, Math.max(u.length, t.length)));
        const uResampled = resampleStroke(u, numPoints);
        const tResampled = resampleStroke(t, numPoints);
        return dtwDistance(uResampled, tResampled, 8);
    } else {
        // 点数の差が小さい場合はそのままDTW（高精度）
        return dtwDistance(u, t, 5);
    }
}

// ストロークの長さ比を評価
function strokeLengthRatio(userStroke, templateStroke) {
    const u = userStroke;
    const t = templateStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));

    if (u.length < 2 || t.length < 2) return 1;

    // ユーザーストロークの総距離
    let uLength = 0;
    for (let i = 1; i < u.length; i++) {
        uLength += dist(u[i].x, u[i].y, u[i-1].x, u[i-1].y);
    }

    // テンプレートストロークの総距離
    let tLength = 0;
    for (let i = 1; i < t.length; i++) {
        tLength += dist(t[i].x, t[i].y, t[i-1].x, t[i-1].y);
    }

    if (tLength === 0) return 1;

    // 長さ比の類似度（0-1）
    const ratio = uLength / tLength;
    // 1.0に近いほど高いスコア
    // 1ストローク目の場合はより厳密に評価（0.8倍〜1.2倍の範囲）
    const diff = Math.abs(ratio - 1.0);
    const threshold = u.length <= 3 ? 0.3 : 0.5; // 短いストローク（1ストローク目）は厳しく
    return Math.max(0, 1 - diff / threshold);
}

// ストローク間の関係性を評価（相対位置）
function strokeRelationship(userStrokes, templateStrokes, strokeIndex) {
    if (strokeIndex === 0 || userStrokes.length < 2) return 1; // 最初のストロークは評価しない

    const currentUser = userStrokes[strokeIndex];
    const prevUser = userStrokes[strokeIndex - 1];
    const currentTemplate = templateStrokes[strokeIndex];
    const prevTemplate = templateStrokes[strokeIndex - 1];

    // 前のストロークの終点から現在のストロークの始点へのベクトル
    const uPrevEnd = prevUser[prevUser.length - 1];
    const uCurrStart = currentUser[0];
    const uVector = {
        x: uCurrStart.x - uPrevEnd.x,
        y: uCurrStart.y - uPrevEnd.y
    };

    const tPrevEnd = {
        x: (prevTemplate[prevTemplate.length - 1].x / 320) * canvasSize,
        y: (prevTemplate[prevTemplate.length - 1].y / 320) * canvasSize
    };
    const tCurrStart = {
        x: (currentTemplate[0].x / 320) * canvasSize,
        y: (currentTemplate[0].y / 320) * canvasSize
    };
    const tVector = {
        x: tCurrStart.x - tPrevEnd.x,
        y: tCurrStart.y - tPrevEnd.y
    };

    // ベクトルの距離と方向の類似度
    const uDist = Math.sqrt(uVector.x * uVector.x + uVector.y * uVector.y);
    const tDist = Math.sqrt(tVector.x * tVector.x + tVector.y * tVector.y);

    if (tDist === 0) return 1;

    // 距離の類似度
    const distRatio = uDist / tDist;
    const distScore = Math.max(0, 1 - Math.abs(distRatio - 1.0) / 0.5);

    // 方向の類似度
    const uDir = Math.atan2(uVector.y, uVector.x);
    const tDir = Math.atan2(tVector.y, tVector.x);
    const dirScore = (Math.cos(uDir - tDir) + 1) / 2;

    // 重み付け平均
    return (distScore * 0.6 + dirScore * 0.4);
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

    // 始点から10%地点までの方向
    const uEarlyIndex = Math.max(1, Math.floor(u.length * 0.1));
    const tEarlyIndex = Math.max(1, Math.floor(t.length * 0.1));
    const uStartDir = Math.atan2(u[uEarlyIndex].y - u[0].y, u[uEarlyIndex].x - u[0].x);
    const tStartDir = Math.atan2(t[tEarlyIndex].y - t[0].y, t[tEarlyIndex].x - t[0].x);
    const startDirDiff = Math.abs(uStartDir - tStartDir);
    const startDirSimilarity = Math.cos(startDirDiff);
    
    // 終点の最後10%から終点までの方向
    const uLateIndex = Math.max(0, Math.floor(u.length * 0.9));
    const tLateIndex = Math.max(0, Math.floor(t.length * 0.9));
    const uEndDir = Math.atan2(u[u.length-1].y - u[uLateIndex].y, u[u.length-1].x - u[uLateIndex].x);
    const tEndDir = Math.atan2(t[t.length-1].y - t[tLateIndex].y, t[t.length-1].x - t[tLateIndex].x);
    const endDirDiff = Math.abs(uEndDir - tEndDir);
    const endDirSimilarity = Math.cos(endDirDiff);
    
    // 始点方向と終点方向の重み付け平均（始点をやや重視）
    // 角度差が大きい場合はペナルティ
    const startPenalty = (startDirDiff > Math.PI / 6) ? 0.5 : 1.0;
    const endPenalty = (endDirDiff > Math.PI / 6) ? 0.5 : 1.0;
    
    return (startDirSimilarity * startPenalty * 0.6 + endDirSimilarity * endPenalty * 0.4);
}

// 複数セグメントでの方向類似度を計算（より精密な方向評価）
function multiSegmentDirectionSimilarity(userStroke, templateStroke) {
    const u = userStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));
    const t = templateStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));

    if (u.length < 3 || t.length < 3) {
        // 短いストロークは従来の方法にフォールバック
        return directionSimilarity(userStroke, templateStroke);
    }

    // ストロークを3-4セグメントに分割
    const numSegments = Math.min(4, Math.floor(u.length / 2));
    const segmentLength = u.length / numSegments;
    
    let totalSimilarity = 0;
    let validSegments = 0;

    for (let i = 0; i < numSegments; i++) {
        const uStartIdx = Math.floor(i * segmentLength);
        const uEndIdx = Math.floor((i + 1) * segmentLength);
        
        // テンプレートも同じ比率で分割
        const tStartIdx = Math.floor((uStartIdx / u.length) * t.length);
        const tEndIdx = Math.floor((uEndIdx / u.length) * t.length);

        if (uEndIdx > uStartIdx && tEndIdx > tStartIdx) {
            const uStart = u[uStartIdx];
            const uEnd = u[Math.min(uEndIdx - 1, u.length - 1)];
            const tStart = t[tStartIdx];
            const tEnd = t[Math.min(tEndIdx - 1, t.length - 1)];

            const uDir = Math.atan2(uEnd.y - uStart.y, uEnd.x - uStart.x);
            const tDir = Math.atan2(tEnd.y - tStart.y, tEnd.x - tStart.x);
            
            const segmentSimilarity = Math.cos(uDir - tDir);
            totalSimilarity += segmentSimilarity;
            validSegments++;
        }
    }

    return validSegments > 0 ? totalSimilarity / validSegments : 0;
}

// 点での曲率を計算（3点から）
function curvatureAtPoint(p1, p2, p3) {
    // 3点が一直線上にある場合は曲率0
    const a = dist(p1.x, p1.y, p2.x, p2.y);
    const b = dist(p2.x, p2.y, p3.x, p3.y);
    const c = dist(p1.x, p1.y, p3.x, p3.y);

    if (a === 0 || b === 0) return 0;

    // 三角形の面積から曲率を近似
    const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;
    const s = (a + b + c) / 2;
    
    if (s === 0 || a * b === 0) return 0;
    
    // 曲率半径の逆数として曲率を計算（正規化）
    const curvature = (4 * area) / (a * b * c);
    return curvature;
}

// ストロークの曲率プロファイルを計算
function curvatureProfile(stroke) {
    if (stroke.length < 3) return [];

    const profile = [];
    
    // 始点は0（曲がり始め）
    profile.push(0);

    // 各中間点での曲率
    for (let i = 1; i < stroke.length - 1; i++) {
        const curvature = curvatureAtPoint(stroke[i - 1], stroke[i], stroke[i + 1]);
        profile.push(curvature);
    }

    // 終点は0（曲がり終わり）
    profile.push(0);

    return profile;
}

// 2つのストロークの曲率プロファイルの類似度を計算
function curvatureSimilarity(userStroke, templateStroke) {
    const u = userStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));
    const t = templateStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));

    if (u.length < 3 || t.length < 3) return 0.5; // 評価できない場合は中程度のスコア

    // 曲率プロファイルを計算
    const uProfile = curvatureProfile(u);
    const tProfile = curvatureProfile(t);

    // 同じ長さにリサンプリング（20点）
    const numPoints = 20;
    const uResampled = [];
    const tResampled = [];

    for (let i = 0; i < numPoints; i++) {
        const uIdx = Math.floor((i / (numPoints - 1)) * (uProfile.length - 1));
        const tIdx = Math.floor((i / (numPoints - 1)) * (tProfile.length - 1));
        uResampled.push(uProfile[uIdx]);
        tResampled.push(tProfile[tIdx]);
    }

    // 曲率プロファイルの類似度（相関係数のようなもの）
    let sumDiff = 0;
    let maxCurvature = 0;

    for (let i = 0; i < numPoints; i++) {
        const diff = Math.abs(uResampled[i] - tResampled[i]);
        sumDiff += diff;
        maxCurvature = Math.max(maxCurvature, uResampled[i], tResampled[i]);
    }

    if (maxCurvature === 0) return 1; // 両方とも直線

    // 正規化してスコアに変換（0-1）
    const avgDiff = sumDiff / numPoints;
    const normalizedDiff = avgDiff / (maxCurvature + 0.0001); // 0除算を防ぐ
    return Math.max(0, 1 - normalizedDiff * 2); // 差が小さいほど高いスコア
}

// ストロークの閉鎖度を計算（0-1、1に近いほど閉じている）
function strokeClosure(stroke) {
    if (stroke.length < 3) return 0; // 短いストロークは閉じていないと判定

    const start = stroke[0];
    const end = stroke[stroke.length - 1];
    const closureDist = dist(start.x, start.y, end.x, end.y);

    // ストロークの総距離を計算
    let totalLength = 0;
    for (let i = 1; i < stroke.length; i++) {
        totalLength += dist(stroke[i].x, stroke[i].y, stroke[i-1].x, stroke[i-1].y);
    }

    if (totalLength === 0) return 0;

    // 閉鎖度：始点と終点の距離が総距離に対して小さいほど閉じている
    // 総距離の20%以下なら閉じていると判定
    const closureRatio = closureDist / totalLength;
    return Math.max(0, 1 - closureRatio / 0.2); // 0.2以下なら1に近づく
}

// ストロークが輪を描いているかどうか（閉じた形状か）
function isLoopStroke(stroke) {
    if (stroke.length < 4) return false; // 少なくとも4点必要

    const closure = strokeClosure(stroke);
    const start = stroke[0];
    const end = stroke[stroke.length - 1];
    const closureDist = dist(start.x, start.y, end.x, end.y);

    // 閉鎖度が高く、かつ始点と終点が近い（キャンバスサイズの15%以内）
    return closure > 0.7 && closureDist < canvasSize * 0.15;
}

// ストロークの膨らみ方・方向性を評価（特徴点の位置）
function strokeBulgeDirection(stroke) {
    if (stroke.length < 4) return null;

    const start = stroke[0];
    const end = stroke[stroke.length - 1];
    
    // 最大・最小のx, y座標を見つける
    let minX = start.x, maxX = start.x;
    let minY = start.y, maxY = start.y;
    let minXIdx = 0, maxXIdx = 0, minYIdx = 0, maxYIdx = 0;

    for (let i = 1; i < stroke.length; i++) {
        const p = stroke[i];
        if (p.x < minX) { minX = p.x; minXIdx = i; }
        if (p.x > maxX) { maxX = p.x; maxXIdx = i; }
        if (p.y < minY) { minY = p.y; minYIdx = i; }
        if (p.y > maxY) { maxY = p.y; maxYIdx = i; }
    }

    // 中間点（ストロークの中央付近）の位置
    const midIdx = Math.floor(stroke.length / 2);
    const midPoint = stroke[midIdx];
    
    // 3/4地点の位置（輪を描いた後の方向）
    const threeQuarterIdx = Math.floor(stroke.length * 0.75);
    const threeQuarterPoint = stroke[threeQuarterIdx];

    return {
        start: start,
        end: end,
        midPoint: midPoint,
        threeQuarterPoint: threeQuarterPoint,
        minX: minX, maxX: maxX, minY: minY, maxY: maxY,
        minXIdx: minXIdx, maxXIdx: maxXIdx,
        minYIdx: minYIdx, maxYIdx: maxYIdx,
        width: maxX - minX,
        height: maxY - minY,
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
    };
}

// 2つのストロークの膨らみ方の類似度を計算（0-1）
function bulgeSimilarity(userStroke, templateStroke) {
    const u = userStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));
    const t = templateStroke.map(p => ({
        x: (p.x / 320) * canvasSize,
        y: (p.y / 320) * canvasSize
    }));

    const uBulge = strokeBulgeDirection(u);
    const tBulge = strokeBulgeDirection(t);

    if (!uBulge || !tBulge) return 0.5; // 評価できない場合は中程度のスコア

    // 中間点の位置の類似度
    const midDist = dist(uBulge.midPoint.x, uBulge.midPoint.y, 
                         tBulge.midPoint.x, tBulge.midPoint.y);
    const midScore = Math.max(0, 1 - midDist / (canvasSize * 0.3));

    // 3/4地点の位置の類似度（輪を描いた後の方向が重要）
    const threeQuarterDist = dist(uBulge.threeQuarterPoint.x, uBulge.threeQuarterPoint.y,
                                  tBulge.threeQuarterPoint.x, tBulge.threeQuarterPoint.y);
    const threeQuarterScore = Math.max(0, 1 - threeQuarterDist / (canvasSize * 0.25));

    // 中心位置の類似度
    const centerDist = dist(uBulge.center.x, uBulge.center.y,
                           tBulge.center.x, tBulge.center.y);
    const centerScore = Math.max(0, 1 - centerDist / (canvasSize * 0.3));

    // 幅と高さの比率の類似度
    const uAspect = uBulge.width > 0 ? uBulge.height / uBulge.width : 1;
    const tAspect = tBulge.width > 0 ? tBulge.height / tBulge.width : 1;
    const aspectDiff = Math.abs(uAspect - tAspect);
    const aspectScore = Math.max(0, 1 - aspectDiff / 0.5); // アスペクト比の差が0.5以下なら高いスコア

    // 重み付け平均（3/4地点を重視）
    return (midScore * 0.25 + threeQuarterScore * 0.4 + centerScore * 0.2 + aspectScore * 0.15);
}

// シンプルな一致度計算（重み付けなし、基本的な指標のみ）
function calcScoreSimple(user, template) {
    const userLen = user.length;
    const templateLen = template.length;

    if (userLen === 0) return 0;
    if (userLen > templateLen) return 0;

    let totalScore = 0;

    for (let i = 0; i < userLen; i++) {
        const userStroke = user[i];
        const templateStroke = template[i];
        
        // スケール調整
        const u = userStroke;
        const t = templateStroke.map(p => ({
            x: (p.x / 320) * canvasSize,
            y: (p.y / 320) * canvasSize
        }));

        if (u.length < 2 || t.length < 2) continue;

        // 1. 形状距離（DTW）
        const shapeDist = strokeDistance(userStroke, templateStroke);
        const shapeScore = Math.max(0, 1 - shapeDist / (canvasSize * 0.3));

        // 2. 始点位置
        const uStart = u[0];
        const tStart = t[0];
        const startDist = dist(uStart.x, uStart.y, tStart.x, tStart.y);
        const startScore = Math.max(0, 1 - startDist / (canvasSize * 0.3));

        // 3. 終点位置
        const uEnd = u[u.length - 1];
        const tEnd = t[t.length - 1];
        const endDist = dist(uEnd.x, uEnd.y, tEnd.x, tEnd.y);
        const endScore = Math.max(0, 1 - endDist / (canvasSize * 0.3));

        // 4. 方向（書き始めと書き終わりの方向を評価）
        // 始点から10%地点までの方向
        const uEarlyIndex = Math.max(1, Math.floor(u.length * 0.1));
        const tEarlyIndex = Math.max(1, Math.floor(t.length * 0.1));
        const uStartDir = Math.atan2(u[uEarlyIndex].y - uStart.y, u[uEarlyIndex].x - uStart.x);
        const tStartDir = Math.atan2(t[tEarlyIndex].y - tStart.y, t[tEarlyIndex].x - tStart.x);
        const startDirScore = (Math.cos(uStartDir - tStartDir) + 1) / 2;
        
        // 終点の最後10%から終点までの方向
        const uLateIndex = Math.max(0, Math.floor(u.length * 0.9));
        const tLateIndex = Math.max(0, Math.floor(t.length * 0.9));
        const uEndDir = Math.atan2(uEnd.y - u[uLateIndex].y, uEnd.x - u[uLateIndex].x);
        const tEndDir = Math.atan2(tEnd.y - t[tLateIndex].y, tEnd.x - t[tLateIndex].x);
        const endDirScore = (Math.cos(uEndDir - tEndDir) + 1) / 2;
        
        // 始点方向と終点方向の重み付け平均（始点をやや重視）
        const dirScore = (startDirScore * 0.6 + endDirScore * 0.4);

        // 5. 長さ比
        let uLength = 0;
        for (let j = 1; j < u.length; j++) {
            uLength += dist(u[j].x, u[j].y, u[j-1].x, u[j-1].y);
        }
        let tLength = 0;
        for (let j = 1; j < t.length; j++) {
            tLength += dist(t[j].x, t[j].y, t[j-1].x, t[j-1].y);
        }
        const lengthRatio = tLength > 0 ? uLength / tLength : 1;
        const lengthScore = Math.max(0, 1 - Math.abs(lengthRatio - 1) / 0.5);

        // 重み付き評価（形状を重視、始点・終点の影響を軽減）
        const strokeScore = (
            shapeScore * 0.40 +    // 形状（DTW）: 40% - 膨らみ・結びを反映
            startScore * 0.12 +   // 始点: 12%
            endScore * 0.12 +     // 終点: 12%
            dirScore * 0.20 +     // 方向: 20%
            lengthScore * 0.16    // 長さ比: 16%
        );
        totalScore += strokeScore;
    }

    // 平均スコア
    let avgScore = (totalScore / userLen) * 100;

    // ストローク数が一致している場合はボーナス
    if (userLen === templateLen && userLen >= 2) {
        avgScore *= 1.15;
    }

    return Math.max(0, Math.min(100, avgScore));
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
        const isComplexStroke = templateStroke.length >= 6; // 複雑なストローク（多くの点を含む）

        // 結び（閉鎖度）のマッチング（輪の判定に必要なので先に計算）
        const userClosure = strokeClosure(userStroke);
        const templateClosure = strokeClosure(templateStroke);
        const closureDiff = Math.abs(userClosure - templateClosure);
        const closureScore = 1 - closureDiff; // 閉鎖度が一致しているほど高い

        // 輪を描いているかの一致（方向・曲率評価で使用するので先に計算）
        const userIsLoop = isLoopStroke(userStroke);
        const templateIsLoop = isLoopStroke(templateStroke);
        const loopMatch = (userIsLoop === templateIsLoop) ? 1 : 0.3; // 一致していれば1、不一致なら0.3

        // 形状の距離（0に近いほど良い）
        const shapeDist = strokeDistance(userStroke, templateStroke);
        // 短いストロークの場合は正規化を緩和、複雑なストロークの場合は厳しく
        // 1ストローク目はより緩和（情報が少ないので）
        let normalizationDist;
        if (isFirstStroke && userLen === 1) {
            normalizationDist = maxDistForNormalization * 2.5; // 1ストローク目は大幅に緩和
        } else if (isShortStroke) {
            normalizationDist = maxDistForNormalization * 1.8;
        } else if (isComplexStroke) {
            normalizationDist = maxDistForNormalization * 0.6; // 複雑なストロークはより厳しく
        } else {
            normalizationDist = maxDistForNormalization;
        }
        // 形状スコアの計算を改善（より滑らかな減衰）
        const normalizedDist = shapeDist / normalizationDist;
        const shapeScore = Math.max(0, 1 / (1 + normalizedDist * 2)); // より滑らかな減衰曲線

        // 方向の類似度（-1 to 1 → 0 to 1）
        // 複雑なストロークや輪を描くストロークでは複数セグメント評価を使用
        const baseDirSimilarity = (isComplexStroke || userIsLoop || templateIsLoop)
            ? multiSegmentDirectionSimilarity(userStroke, templateStroke)
            : directionSimilarity(userStroke, templateStroke);
        const dirScore = (baseDirSimilarity + 1) / 2;

        // 曲率プロファイルの類似度（複雑なストロークでは重要）
        const curvatureScore = (isComplexStroke || userIsLoop || templateIsLoop)
            ? curvatureSimilarity(userStroke, templateStroke)
            : 0.5; // 単純なストロークでは評価しない（0.5で影響なし）

        // 始点の位置マッチング
        const startDist = dist(uStart.x, uStart.y, tStart.x, tStart.y);
        // 1ストローク目では位置をより厳密に評価（許容範囲を広げるが、評価は重要）
        const startDistThreshold = (isFirstStroke && userLen === 1) 
            ? (canvasSize * 0.4)  // 1ストローク目は許容範囲を広げる
            : (canvasSize * 0.3);
        const startScore = Math.max(0, 1 - startDist / startDistThreshold);

        // 終点の位置マッチング（短いストロークや最初のストロークでは重要）
        const endDist = dist(uEnd.x, uEnd.y, tEnd.x, tEnd.y);
        // 最後のストロークの場合はより厳密に評価
        const isLastStroke = (i === userLen - 1) && (userLen === templateLen);
        // 3ストローク目（最後のストローク）は「む」と「お」の識別に重要（位置が違う）
        // 1ストローク目では位置をより厳密に評価（許容範囲を広げるが、評価は重要）
        let endDistThreshold;
        if (isLastStroke) {
            // 最後のストロークはより厳密に評価（「む」と「お」の識別のため）
            endDistThreshold = canvasSize * 0.2;
        } else if (isFirstStroke && userLen === 1) {
            endDistThreshold = canvasSize * 0.4; // 1ストローク目は許容範囲を広げる
        } else {
            endDistThreshold = canvasSize * 0.3;
        }
        const endScore = Math.max(0, 1 - endDist / endDistThreshold);

        // 膨らみ方・方向性の類似度（複雑なストロークや輪を描くストロークでは重要）
        const bulgeScore = (isComplexStroke || userIsLoop || templateIsLoop) 
            ? bulgeSimilarity(userStroke, templateStroke) 
            : 0.5; // 単純なストロークでは評価しない（0.5で影響なし）

        // ストロークの長さ比の類似度
        const lengthRatioScore = strokeLengthRatio(userStroke, templateStroke);

        // ストローク間の関係性（相対位置）
        const relationshipScore = strokeRelationship(user, template, i);

        // ストロークスコア（重み付け）
        // 複雑なストロークでは形状マッチングをより重視
        let strokeScore;
        if (isComplexStroke && !isFirstStroke) {
            // 複雑なストローク（2ストローク目以降）は形状を重視
            // 特に輪を描くストロークでは膨らみ方と曲率も重視
            const bulgeWeight = (userIsLoop || templateIsLoop) ? 10 : 5;
            const curvatureWeight = (userIsLoop || templateIsLoop) ? 10 : 5;
            strokeScore = (
                shapeScore * 40 +          // 形状: 40点（最重要）
                dirScore * 8 +             // 方向: 8点（複数セグメント評価）
                curvatureScore * curvatureWeight +  // 曲率: 5-10点（輪を描く場合は重要）
                startScore * 10 +          // 始点: 10点（位置を重視）
                endScore * 8 +             // 終点: 8点（位置を重視）
                closureScore * 4 +         // 結び: 4点
                loopMatch * 2 +            // 輪の一致: 2点
                bulgeScore * bulgeWeight + // 膨らみ方: 5-10点（輪を描く場合は重要）
                lengthRatioScore * 3 +     // 長さ比: 3点
                relationshipScore * 3      // ストローク間関係: 3点
            );
        } else if (isShortStroke || isFirstStroke) {
            // 短いストロークや最初のストローク
            if (isFirstStroke && userLen === 1) {
                // 1ストローク目のみ（最初のストローク）: 位置・長さ・方向を重視
                strokeScore = (
                    shapeScore * 15 +        // 形状: 15点
                    dirScore * 25 +          // 方向: 25点（重要：水平か下向きか）
                    startScore * 20 +        // 始点: 20点（位置を重視）
                    endScore * 18 +          // 終点: 18点（位置を重視）
                    closureScore * 1 +       // 結び: 1点
                    loopMatch * 1 +          // 輪の一致: 1点
                    lengthRatioScore * 18 + // 長さ比: 18点
                    relationshipScore * 0     // ストローク間関係: 0点（最初なのでなし）
                );
            } else {
                // 最後のストロークの場合は位置をさらに重視
                const endWeight = isLastStroke ? 23 : 16;
                const startWeight = isLastStroke ? 18 : 26;
                const shapeWeight = isLastStroke ? 23 : 26;
                // 短いストロークでは長さ比も重視
                const lengthWeight = isFirstStroke ? 8 : 3;
                strokeScore = (
                    shapeScore * shapeWeight +    // 形状
                    dirScore * 16 +              // 方向: 16点
                    startScore * startWeight +    // 始点
                    endScore * endWeight +        // 終点（最後のストロークでは重要）
                    closureScore * 5 +           // 結び: 5点
                    loopMatch * 2 +              // 輪の一致: 2点
                    lengthRatioScore * lengthWeight +  // 長さ比: 3-8点
                    relationshipScore * (isFirstStroke ? 0 : 3)  // ストローク間関係: 3点（最初以外）
                );
            }
        } else {
            // 通常のストロークでも曲率を評価（重みは低め）
            const curvatureWeight = 4;
            strokeScore = (
                shapeScore * 30 +          // 形状: 30点
                dirScore * 15 +            // 方向: 15点
                curvatureScore * curvatureWeight +  // 曲率: 4点
                startScore * 15 +          // 始点: 15点（位置を重視）
                endScore * 12 +            // 終点: 12点（位置を重視）
                closureScore * 8 +         // 結び: 8点
                loopMatch * 2 +            // 輪の一致: 2点
                lengthRatioScore * 5 +     // 長さ比: 5点
                relationshipScore * 3      // ストローク間関係: 3点
            );
        }

        totalScore += strokeScore;
    }

    // 平均スコア
    let avgScore = totalScore / userLen;

    // ストローク数ボーナス/ペナルティ
    // 残りストローク数が少ないほどボーナス
    // ただし、1ストローク目では逆に多くのストロークがある文字にボーナス（より多くの情報が期待できる）
    const remainingRatio = (templateLen - userLen) / templateLen;
    let strokeCountBonus;
    if (userLen === 1) {
        // 1ストローク目：多くのストロークがある文字にボーナス（情報が少ないので可能性を広げる）
        strokeCountBonus = 1 + (templateLen - 1) * 0.02; // 最大約10%ボーナス（3ストロークで4%、4ストロークで6%）
    } else {
        // 2ストローク目以降：残りストローク数が少ないほどボーナス
        strokeCountBonus = 1 + (1 - remainingRatio) * 0.1; // 最大10%ボーナス
    }

    avgScore *= strokeCountBonus;

    // 完全一致ボーナス: ストローク数が完全に一致する場合は追加ボーナス
    if (userLen === templateLen && userLen >= 2) {
        // 全ストロークが完了した場合は、より大きなボーナス
        avgScore *= 1.2; // 20%の追加ボーナス
        
        // さらに、全ストロークの終点位置の一致度を評価
        let endpointConsistency = 0;
        for (let i = 0; i < userLen; i++) {
            const uEnd = user[i][user[i].length - 1];
            const tEnd = {
                x: (template[i][template[i].length - 1].x / 320) * canvasSize,
                y: (template[i][template[i].length - 1].y / 320) * canvasSize
            };
            const endpointDist = dist(uEnd.x, uEnd.y, tEnd.x, tEnd.y);
            const endpointScore = Math.max(0, 1 - endpointDist / (canvasSize * 0.25));
            endpointConsistency += endpointScore;
        }
        endpointConsistency /= userLen;
        // 全ストロークの終点が一致している場合、追加ボーナス（最大10%）
        avgScore *= (1 + endpointConsistency * 0.1);
    }

    return Math.max(0, Math.min(100, avgScore));
}

// デバッグ用: 詳細なスコア情報を返す
function calcScoreDetailed(user, template) {
    const userLen = user.length;
    const templateLen = template.length;

    if (userLen === 0 || userLen > templateLen) {
        return { totalScore: 0, details: [] };
    }

    const details = [];
    let totalScore = 0;
    const maxDistForNormalization = canvasSize * 0.4;

    for (let i = 0; i < userLen; i++) {
        const userStroke = user[i];
        const templateStroke = template[i];

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
        const isShortStroke = userStroke.length <= 3 || userStrokeLength < canvasSize * 0.2;
        const isFirstStroke = i === 0;
        const isComplexStroke = templateStroke.length >= 6;
        const isLastStroke = (i === userLen - 1) && (userLen === templateLen);

        const shapeDist = strokeDistance(userStroke, templateStroke);
        const normalizationDist = isShortStroke ? maxDistForNormalization * 1.5 :
                                 isComplexStroke ? maxDistForNormalization * 0.7 :
                                 maxDistForNormalization;
        const shapeScore = Math.max(0, 1 - shapeDist / normalizationDist);

        const userIsLoop = isLoopStroke(userStroke);
        const templateIsLoop = isLoopStroke(templateStroke);

        const baseDirSimilarity = (isComplexStroke || userIsLoop || templateIsLoop)
            ? multiSegmentDirectionSimilarity(userStroke, templateStroke)
            : directionSimilarity(userStroke, templateStroke);
        const dirScore = (baseDirSimilarity + 1) / 2;

        const curvatureScore = (isComplexStroke || userIsLoop || templateIsLoop)
            ? curvatureSimilarity(userStroke, templateStroke)
            : 0.5;

        const startDist = dist(uStart.x, uStart.y, tStart.x, tStart.y);
        const startScore = Math.max(0, 1 - startDist / (canvasSize * 0.3));

        const endDist = dist(uEnd.x, uEnd.y, tEnd.x, tEnd.y);
        const endDistThreshold = isLastStroke ? (canvasSize * 0.2) : (canvasSize * 0.3);
        const endScore = Math.max(0, 1 - endDist / endDistThreshold);

        const userClosure = strokeClosure(userStroke);
        const templateClosure = strokeClosure(templateStroke);
        const closureDiff = Math.abs(userClosure - templateClosure);
        const closureScore = 1 - closureDiff;

        const loopMatch = (userIsLoop === templateIsLoop) ? 1 : 0.3;

        const bulgeScore = (isComplexStroke || userIsLoop || templateIsLoop)
            ? bulgeSimilarity(userStroke, templateStroke)
            : 0.5;

        // スコア計算（簡略版、詳細計算はcalcScoreと同じロジック）
        let strokeScore;
        if (isComplexStroke && !isFirstStroke) {
            const bulgeWeight = (userIsLoop || templateIsLoop) ? 10 : 6;
            const curvatureWeight = (userIsLoop || templateIsLoop) ? 10 : 6;
            strokeScore = (
                shapeScore * 45 + dirScore * 12 + curvatureScore * curvatureWeight +
                startScore * 7 + endScore * 5 + closureScore * 6 +
                loopMatch * 2 + bulgeScore * bulgeWeight
            );
        } else if (isShortStroke || isFirstStroke) {
            const endWeight = isLastStroke ? 25 : 18;
            const startWeight = isLastStroke ? 20 : 28;
            const shapeWeight = isLastStroke ? 25 : 28;
            strokeScore = (
                shapeScore * shapeWeight + dirScore * 18 +
                startScore * startWeight + endScore * endWeight +
                closureScore * 6 + loopMatch * 2
            );
        } else {
            strokeScore = (
                shapeScore * 40 + dirScore * 20 + curvatureScore * 5 +
                startScore * 12 + endScore * 7 + closureScore * 9 + loopMatch * 2
            );
        }

        details.push({
            strokeIndex: i,
            shapeScore: shapeScore.toFixed(3),
            dirScore: dirScore.toFixed(3),
            curvatureScore: curvatureScore.toFixed(3),
            startScore: startScore.toFixed(3),
            endScore: endScore.toFixed(3),
            closureScore: closureScore.toFixed(3),
            loopMatch: loopMatch.toFixed(3),
            bulgeScore: bulgeScore.toFixed(3),
            strokeScore: strokeScore.toFixed(2),
            isComplex: isComplexStroke,
            isLoop: userIsLoop || templateIsLoop
        });

        totalScore += strokeScore;
    }

    const avgScore = totalScore / userLen;
    const remainingRatio = (templateLen - userLen) / templateLen;
    const strokeCountBonus = 1 + (1 - remainingRatio) * 0.1;
    let finalScore = avgScore * strokeCountBonus;

    if (userLen === templateLen && userLen >= 2) {
        finalScore *= 1.2;
        let endpointConsistency = 0;
        for (let i = 0; i < userLen; i++) {
            const uEnd = user[i][user[i].length - 1];
            const tEnd = {
                x: (template[i][template[i].length - 1].x / 320) * canvasSize,
                y: (template[i][template[i].length - 1].y / 320) * canvasSize
            };
            const endpointDist = dist(uEnd.x, uEnd.y, tEnd.x, tEnd.y);
            const endpointScore = Math.max(0, 1 - endpointDist / (canvasSize * 0.25));
            endpointConsistency += endpointScore;
        }
        endpointConsistency /= userLen;
        finalScore *= (1 + endpointConsistency * 0.1);
    }

    return {
        totalScore: Math.max(0, Math.min(100, finalScore)),
        details: details,
        strokeCountBonus: strokeCountBonus.toFixed(3),
        avgScore: avgScore.toFixed(2)
    };
}

function updatePredictions() {
    document.getElementById('stroke-count').textContent = userStrokes.length;

    if (!userStrokes.length) {
        predictions = [];
        renderUI([]);
        return;
    }

    const cands = [];
    const DEBUG = false; // デバッグモード（コンソールに詳細を表示）
    
    // シンプルモードと通常モードを切り替え可能
    const USE_SIMPLE_MODE = true; // true にするとシンプルな一致度測定を使用

    // 1ストローク目では閾値を下げてより多くの候補を表示
    const scoreThreshold = userStrokes.length === 1 ? 20 : 30;

    // 同じ文字の複数バリアントを統合するためのマップ
    const charScoreMap = {}; // key: 表示用文字, value: { score, strokes }
    
    for (let [key, data] of Object.entries(hiraganaData)) {
        const displayChar = data.char || key; // 表示用の文字（バリアントID除去）
        const score = USE_SIMPLE_MODE 
            ? calcScoreSimple(userStrokes, data.strokes)
            : calcScore(userStrokes, data.strokes);
        
        // 同じ文字の複数バリアントがある場合、最高スコアのものだけを保持
        if (!charScoreMap[displayChar] || score > charScoreMap[displayChar].score) {
            charScoreMap[displayChar] = {
                char: displayChar,
                score: score,
                strokes: data.strokes
            };
        }
    }
    
    // マップから候補リストを作成
    for (const { char, score, strokes } of Object.values(charScoreMap)) {
        if (score > scoreThreshold) {
            cands.push({ char, score, strokes });
        }
    }

    // スコアでソート
    cands.sort((a, b) => b.score - a.score);

    // デバッグモード: 上位3文字の詳細スコアを表示
    if (DEBUG && cands.length > 0) {
        console.log('=== 予測結果詳細 ===');
        for (let i = 0; i < Math.min(3, cands.length); i++) {
            const cand = cands[i];
            const detailed = calcScoreDetailed(userStrokes, cand.strokes);
            console.log(`${i + 1}位: ${cand.char} (${cand.score.toFixed(1)}%)`);
            console.log('  詳細:', detailed);
        }
    }

    predictions = cands;
    renderUI(cands.slice(0, 10));
    
    // アニメーションをリセット
    shouldResetAnimation = true;
    
    // モバイルでもアニメーションが動作するように、明示的に再描画をトリガー
    if (typeof redraw === 'function') {
        redraw();
    }
    // ループが停止している場合は再開
    if (typeof loop === 'function' && typeof isLooping === 'function' && !isLooping()) {
        loop();
    }
}
