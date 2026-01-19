// p5.js関連のキャンバス処理
function setup() {
    // Initial size calculation
    updateCanvasSize();

    const canvas = createCanvas(canvasSize, canvasSize);
    canvas.parent('canvas-container');
    strokeCap(ROUND);
    strokeJoin(ROUND);

    // Ensure size is correct after layout stabilizes
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    
    // モバイルでもアニメーションが動作するように、ループを確実に開始
    loop();
}

function handleResize() {
    updateCanvasSize();
    resizeCanvas(canvasSize, canvasSize);
}

function updateCanvasSize() {
    const wrapper = document.querySelector('.canvas-wrapper');
    if (!wrapper) return;

    // Get wrapper's computed size
    const rect = wrapper.getBoundingClientRect();
    canvasSize = Math.max(200, Math.min(rect.width, rect.height, 400));
}

function draw() {
    clear(); // 背景を透明にしてCSSのグリッド線を表示
    
    // アニメーションを更新
    updateAnimation();
    
    drawHints();
    stroke(28, 25, 23); // --text-primary: #1c1917
    strokeWeight(10);
    noFill();
    userStrokes.forEach(s => { beginShape(); s.forEach(p => vertex(p.x, p.y)); endShape(); });
    if (currentStroke.length > 0) {
        beginShape();
        currentStroke.forEach(p => vertex(p.x, p.y));
        endShape();
    }
    
    // アニメーション中は常に再描画を続ける（モバイル対応）
    if (animationTarget && animationTarget.stroke) {
        // アニメーションが進行中の場合、次のフレームも確実に描画されるようにする
        // p5.jsのloop()が動作している限り、draw()は継続的に呼ばれる
    }
}

function updateAnimation() {
    const idx = userStrokes.length;
    if (!predictions.length) {
        animationProgress = 0;
        animationTarget = null;
        shouldResetAnimation = false;
        return;
    }
    
    // 予測が更新された場合、アニメーションをリセット
    if (shouldResetAnimation) {
        animationProgress = 0;
        shouldResetAnimation = false;
    }
    
    // 完成していない候補（次のストロークが残っている候補）の中で1位のものを探す
    let animationCandidate = null;
    let animationCandidateIndex = -1;
    
    for (let i = 0; i < predictions.length; i++) {
        const pred = predictions[i];
        // ストローク数が一致していない（完成していない）かつ、次のストロークが存在する
        if (idx < pred.strokes.length && pred.strokes[idx]) {
            animationCandidate = pred;
            animationCandidateIndex = i;
            break;
        }
    }
    
    if (animationCandidate && animationCandidateIndex >= 0) {
        animationTarget = {
            stroke: animationCandidate.strokes[idx],
            index: animationCandidateIndex
        };
        
        // アニメーション進行
        if (animationTarget.stroke && animationTarget.stroke.length > 1) {
            animationProgress += animationSpeed;
            if (animationProgress > 1) {
                animationProgress = 0; // ループ
            }
        }
    } else {
        animationTarget = null;
        animationProgress = 0;
    }
}

function drawHints() {
    if (!predictions.length) return;
    // 順位に応じたopacity（1位が最も濃い）
    const ALPHAS = [70, 40, 20, 15, 10];
    const MARKER_SIZES = [20, 15, 10, 8, 6];
    const STROKE_WEIGHT = 20;

    predictions.slice(0, 5).forEach((pred, i) => {
        const idx = userStrokes.length;
        if (idx < pred.strokes.length) {
            const next = pred.strokes[idx];
            const col = COLORS[i];
            const alpha = ALPHAS[i];

            // アニメーション対象かチェック（完成していない候補の中で1位）
            const isAnimationTarget = animationTarget && 
                                      animationTarget.index === i && 
                                      animationTarget.stroke === next;

            if (isAnimationTarget) {
                // アニメーションでなぞる
                drawAnimatedStroke(next, col, alpha, STROKE_WEIGHT, MARKER_SIZES[i], animationProgress, i);
            } else {
                // その他の候補は通常通り全体を表示
                stroke(col[0], col[1], col[2], alpha);
                strokeWeight(STROKE_WEIGHT);
                noFill();
                beginShape();
                next.forEach((p, j) => {
                    const sc = scale320(p);
                    if (j === 0 || j === next.length - 1) vertex(sc.x, sc.y);
                    curveVertex(sc.x, sc.y);
                });
                endShape();
                
                // 始点マーカー
                const st = scale320(next[0]);
                fill(col[0], col[1], col[2], alpha);
                noStroke();
                ellipse(st.x, st.y, MARKER_SIZES[i], MARKER_SIZES[i]);
            }
        }
    });
}

function drawAnimatedStroke(strokePoints, color, alpha, weight, markerSize, progress, rankIndex) {
    if (!strokePoints || strokePoints.length < 2) return;
    
    // アニメーション進行度に応じて描画する点の数を計算
    const totalLength = strokePoints.length;
    const drawToIndex = Math.floor(progress * totalLength);
    
    // 始点マーカー（常に表示）
    const st = scale320(strokePoints[0]);
    fill(color[0], color[1], color[2], alpha);
    noStroke();
    ellipse(st.x, st.y, markerSize, markerSize);
    
    // アニメーション中のストローク部分
    if (drawToIndex > 0) {
        stroke(color[0], color[1], color[2], alpha);
        strokeWeight(weight);
        noFill();
        
        beginShape();
        for (let j = 0; j <= drawToIndex; j++) {
            const sc = scale320(strokePoints[j]);
            if (j === 0 || j === drawToIndex) {
                vertex(sc.x, sc.y);
            }
            if (j > 0 && j < drawToIndex) {
                curveVertex(sc.x, sc.y);
            }
        }
        endShape();
        
        // 現在描画中の位置にマーカー（アニメーションカーソル）
        if (drawToIndex < totalLength) {
            const current = scale320(strokePoints[drawToIndex]);
            fill(color[0], color[1], color[2], Math.min(alpha + 50, 255));
            noStroke();
            ellipse(current.x, current.y, markerSize * 1.2, markerSize * 1.2);
        }
    }
    
    // 未描画部分を薄く表示（ガイドライン）
    if (drawToIndex < totalLength - 1) {
        stroke(color[0], color[1], color[2], alpha * 0.3);
        strokeWeight(weight * 0.5);
        noFill();
        beginShape();
        for (let j = drawToIndex; j < totalLength; j++) {
            const sc = scale320(strokePoints[j]);
            if (j === drawToIndex || j === totalLength - 1) {
                vertex(sc.x, sc.y);
            }
            if (j > drawToIndex && j < totalLength - 1) {
                curveVertex(sc.x, sc.y);
            }
        }
        endShape();
    }
}

function scale320(p) {
    return { x: (p.x / 320) * canvasSize, y: (p.y / 320) * canvasSize };
}

function getCanvasCoords() {
    const canvas = document.getElementById('defaultCanvas0');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize / rect.width;
    const scaleY = canvasSize / rect.height;
    return { rect, scaleX, scaleY };
}

function mousePressed(e) {
    const coords = getCanvasCoords();
    if (!coords) return;
    const x = (mouseX / coords.rect.width) * canvasSize;
    const y = (mouseY / coords.rect.height) * canvasSize;
    if (x >= 0 && x <= canvasSize && y >= 0 && y <= canvasSize) {
        isDrawing = true;
        currentStroke = [{ x, y }];
    }
}

function mouseDragged() {
    if (!isDrawing) return;
    const coords = getCanvasCoords();
    if (!coords) return;
    const x = (mouseX / coords.rect.width) * canvasSize;
    const y = (mouseY / coords.rect.height) * canvasSize;
    if (x >= 0 && x <= canvasSize && y >= 0 && y <= canvasSize) {
        currentStroke.push({ x, y });
    }
    return false; // Prevent default drag behavior
}

function mouseReleased() {
    if (isDrawing && currentStroke.length > 1) {
        userStrokes.push([...currentStroke]);
        currentStroke = [];
        updatePredictions();
    }
    isDrawing = false;
}

function touchStarted() {
    if (touches.length > 0) {
        const t = touches[0];
        // キャンバス内のタッチのみ処理
        if (t.x >= 0 && t.x <= canvasSize && t.y >= 0 && t.y <= canvasSize) {
            isDrawing = true;
            currentStroke = [{ x: t.x, y: t.y }];
            return false; // キャンバス内のみデフォルト動作を防止
        }
    }
    // キャンバス外はデフォルト動作を許可（ボタンクリック等）
    return true;
}

function touchMoved() {
    if (isDrawing && touches.length > 0) {
        const t = touches[0];
        if (t.x >= 0 && t.x <= canvasSize && t.y >= 0 && t.y <= canvasSize) {
            currentStroke.push({ x: t.x, y: t.y });
        }
        return false; // 描画中はスクロール防止
    }
    // 描画中でなければデフォルト動作を許可（スクロール等）
    return true;
}

function touchEnded() {
    if (isDrawing && currentStroke.length > 1) {
        userStrokes.push([...currentStroke]);
        currentStroke = [];
        updatePredictions();
    }
    const wasDrawing = isDrawing;
    isDrawing = false;
    // 描画していた場合のみデフォルト動作を防止
    return !wasDrawing;
}
