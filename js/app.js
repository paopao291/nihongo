// グローバル変数
let userStrokes = [];
let currentStroke = [];
let predictions = [];
let isDrawing = false;
let canvasSize = 320;

// アニメーション関連
let animationProgress = 0; // 0-1の進行度
let animationSpeed = 0.015; // アニメーション速度
let animationTarget = null; // 現在アニメーション中のストロークデータ
let shouldResetAnimation = false; // アニメーションリセットフラグ

// CSS変数と一致した予測カラー
const COLORS = [
    [99, 102, 241],   // --pred-1: #6366f1 (indigo)
    [34, 197, 94],    // --pred-2: #22c55e (green)
    [234, 179, 8],    // --pred-3: #eab308 (yellow)
    [244, 63, 94],    // --pred-4: #f43f5e (rose)
    [139, 92, 246]    // --pred-5: #8b5cf6 (violet)
];
