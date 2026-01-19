// UI関連
function renderUI(cands) {
    const floatEl = document.getElementById('predictions-float');
    const hintEl = document.getElementById('canvas-hint');

    if (!cands.length) {
        floatEl.innerHTML = '';
        hintEl.style.display = userStrokes.length > 0 ? 'none' : 'block';
        return;
    }

    hintEl.style.display = 'none';
    floatEl.innerHTML = cands.slice(0, 5).map((c, i) => `
        <div class="pred-item">
            <div class="pred-rank" data-r="${i + 1}">${i + 1}</div>
            <span class="pred-char">${c.char}</span>
            <span class="pred-score">${Math.round(c.score)}%</span>
        </div>
    `).join('');
}

function clearCanvas() {
    isDrawing = false;
    userStrokes = [];
    currentStroke = [];
    predictions = [];
    document.getElementById('stroke-count').textContent = '0';
    renderUI([]);
}

function undoStroke() {
    // 描画中の場合はキャンセル
    if (isDrawing) {
        isDrawing = false;
        currentStroke = [];
        return;
    }
    // 直前のストロークを削除
    if (userStrokes.length > 0) {
        userStrokes.pop();
        updatePredictions();
    }
}
