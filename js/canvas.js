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
    drawHints();
    stroke(28, 25, 23); // --text-primary: #1c1917
    strokeWeight(2.5);
    noFill();
    userStrokes.forEach(s => { beginShape(); s.forEach(p => vertex(p.x, p.y)); endShape(); });
    if (currentStroke.length > 0) {
        beginShape();
        currentStroke.forEach(p => vertex(p.x, p.y));
        endShape();
    }
}

function drawHints() {
    if (!predictions.length) return;
    // 順位に応じたopacity（1位が最も濃い）
    const ALPHAS = [90, 60, 30, 10, 5];
    const MARKER_SIZES = [10, 8, 7, 6, 5];
    // すべての予測で同じ太さを使用（ユーザーのストロークより細く）
    const STROKE_WEIGHT = 10;

    predictions.slice(0, 5).forEach((pred, i) => {
        const idx = userStrokes.length;
        if (idx < pred.strokes.length) {
            const next = pred.strokes[idx];
            const col = COLORS[i];
            const alpha = ALPHAS[i];

            // ストローク全体を滑らかに描画
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
    });
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
        if (t.x >= 0 && t.x <= canvasSize && t.y >= 0 && t.y <= canvasSize) {
            isDrawing = true;
            currentStroke = [{ x: t.x, y: t.y }];
            return false;
        }
    }
}

function touchMoved() {
    if (isDrawing && touches.length > 0) {
        const t = touches[0];
        if (t.x >= 0 && t.x <= canvasSize && t.y >= 0 && t.y <= canvasSize) {
            currentStroke.push({ x: t.x, y: t.y });
        }
        return false;
    }
}

function touchEnded() {
    if (isDrawing && currentStroke.length > 1) {
        userStrokes.push([...currentStroke]);
        currentStroke = [];
        updatePredictions();
    }
    isDrawing = false;
    return false;
}
