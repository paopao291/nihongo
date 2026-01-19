// 予測ロジック
function calcScore(user, template) {
    if (user.length > template.length) return 0;
    let score = 0;
    for (let i = 0; i < user.length; i++) {
        const us = user[i], ts = template[i].map(p => ({ x: (p.x / 320) * canvasSize, y: (p.y / 320) * canvasSize }));
        if (us.length < 2 || ts.length < 2) continue;
        let ss = 0;
        const maxD = Math.sqrt(canvasSize * canvasSize * 2);
        ss += Math.max(0, 1 - dist(us[0].x, us[0].y, ts[0].x, ts[0].y) / (maxD * 0.5)) * 25;
        ss += Math.max(0, 1 - dist(us[us.length - 1].x, us[us.length - 1].y, ts[ts.length - 1].x, ts[ts.length - 1].y) / (maxD * 0.5)) * 20;
        const uDir = Math.atan2(us[us.length - 1].y - us[0].y, us[us.length - 1].x - us[0].x) * 180 / Math.PI;
        const tDir = Math.atan2(ts[ts.length - 1].y - ts[0].y, ts[ts.length - 1].x - ts[0].x) * 180 / Math.PI;
        let aD = Math.abs(uDir - tDir); if (aD > 180) aD = 360 - aD;
        ss += (1 - aD / 180) * 15;
        let uL = 0, tL = 0;
        for (let j = 1; j < us.length; j++) uL += dist(us[j].x, us[j].y, us[j - 1].x, us[j - 1].y);
        for (let j = 1; j < ts.length; j++) tL += dist(ts[j].x, ts[j].y, ts[j - 1].x, ts[j - 1].y);
        if (uL && tL) ss += (Math.min(uL, tL) / Math.max(uL, tL)) * 10;
        score += ss;
    }
    return Math.max(0, Math.min(100, user.length ? score / user.length : 0));
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
        cands.push({ char, score, strokes: data.strokes });
    }
    cands.sort((a, b) => b.score - a.score);
    predictions = cands;
    renderUI(cands.filter(c => c.score > 0).slice(0, 10));
}
