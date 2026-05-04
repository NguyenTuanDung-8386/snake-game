/**
 * NEON SNAKE - Core Game Engine
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const finalScoreElement = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

// Game Configuration
const GRID_SIZE = 20;
let TILE_COUNT;
let TILE_SIZE;

// Game State
let snake = [];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let score = 0;
let level = 1;
let gameSpeed = 150; // Initial interval in ms
let lastRenderTime = 0;
let isPaused = true;
let isGameOver = false;

// Audio Context for SFX
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(freq, duration, type = 'sine') {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
    eat: () => playSound(523.25, 0.1, 'square'), // C5
    move: () => playSound(150, 0.05, 'sine'),
    gameOver: () => {
        playSound(300, 0.2, 'sawtooth');
        setTimeout(() => playSound(200, 0.4, 'sawtooth'), 200);
    },
    levelUp: () => playSound(880, 0.2, 'sine') // A5
};

// Canvas Resizing
function resize() {
    const size = Math.min(window.innerWidth - 40, 500);
    canvas.width = size;
    canvas.height = size;
    TILE_SIZE = size / GRID_SIZE;
    TILE_COUNT = GRID_SIZE;
}

window.addEventListener('resize', resize);
resize();

// Initial Game Setup
function resetGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0;
    dy = -1;
    nextDx = 0;
    nextDy = -1;
    score = 0;
    level = 1;
    gameSpeed = 150;
    isGameOver = false;
    scoreElement.textContent = '000';
    levelElement.textContent = '1';
    spawnFood();
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    
    // Don't spawn food on snake body
    const onSnake = snake.some(segment => segment.x === food.x && segment.y === food.y);
    if (onSnake) spawnFood();
}

// Input Handling
let directionChangedThisTick = false;

window.addEventListener('keydown', e => {
    if (directionChangedThisTick) return;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (dy === 0) { nextDx = 0; nextDy = -1; directionChangedThisTick = true; }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (dy === 0) { nextDx = 0; nextDy = 1; directionChangedThisTick = true; }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (dx === 0) { nextDx = -1; nextDy = 0; directionChangedThisTick = true; }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (dx === 0) { nextDx = 1; nextDy = 0; directionChangedThisTick = true; }
            break;
        case 'Escape':
            togglePause();
            break;
    }
});

// Game Loop
function main(currentTime) {
    if (isGameOver) {
        showGameOver();
        return;
    }

    window.requestAnimationFrame(main);

    const secondsSinceLastRender = (currentTime - lastRenderTime);
    if (secondsSinceLastRender < gameSpeed) return;
    
    lastRenderTime = currentTime;

    update();
    draw();
}

function update() {
    if (isPaused) return;

    // Update direction from buffer to prevent self-collision on rapid key presses
    dx = nextDx;
    dy = nextDy;
    directionChangedThisTick = false;

    // Move head
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        endGame();
        return;
    }

    // Self Collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endGame();
        return;
    }

    snake.unshift(head);

    // Food Collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score.toString().padStart(3, '0');
        sounds.eat();
        spawnFood();
        
        // Speed up and Level Up
        if (score % 50 === 0) {
            level++;
            levelElement.textContent = level;
            gameSpeed = Math.max(50, gameSpeed - 15);
            sounds.levelUp();
        }
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear Canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(canvas.width, i * TILE_SIZE);
        ctx.stroke();
    }

    // Draw Food
    const foodPadding = TILE_SIZE * 0.2;
    ctx.fillStyle = '#ff007a';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff007a';
    ctx.beginPath();
    ctx.arc(
        food.x * TILE_SIZE + TILE_SIZE / 2,
        food.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 2 - foodPadding,
        0, Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        const padding = TILE_SIZE * 0.05;
        
        // Gradient color from head to tail
        const hue = 180 + (index * 2);
        ctx.fillStyle = isHead ? '#00f2ff' : `hsl(${hue}, 100%, 50%)`;
        
        if (isHead) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00f2ff';
        }

        // Draw rounded rectangle for segments
        const r = 4; // Corner radius
        const x = segment.x * TILE_SIZE + padding;
        const y = segment.y * TILE_SIZE + padding;
        const w = TILE_SIZE - padding * 2;
        const h = TILE_SIZE - padding * 2;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    });
}

function endGame() {
    isGameOver = true;
    sounds.gameOver();
}

function showGameOver() {
    finalScoreElement.textContent = score;
    gameOverScreen.classList.add('active');
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.classList.add('active');
    } else {
        pauseScreen.classList.remove('active');
    }
}

// UI Controls
startButton.addEventListener('click', () => {
    initAudio();
    startScreen.classList.remove('active');
    isPaused = false;
    resetGame();
    window.requestAnimationFrame(main);
});

restartButton.addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    resetGame();
    isPaused = false;
    window.requestAnimationFrame(main);
});

// Polyfill for roundRect (some browsers might need it)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    }
}
