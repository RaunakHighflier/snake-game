// --- Core game constants ---
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");

const GRID_SIZE = 20; // each cell is 20x20 pixels
const TILE_COUNT = canvas.width / GRID_SIZE; // board size / cell size = columns and rows

const BASE_TICK_MS = 120; // starting speed (lower = faster snake)
const MIN_TICK_MS = 60; // fastest the snake is allowed to get
const SPEED_STEP_MS = 4; // how much faster (ms) per food eaten

const BOMB_LIFETIME_MS = 4000; // how long a bomb stays on the board
const BOMB_SPAWN_INTERVAL_MS = 3000; // how often we roll to spawn a bomb
const BOMB_SPAWN_CHANCE = 0.6; // odds of actually spawning on each roll
const MAX_BOMBS = 2; // don't let the board get too cluttered

// Direction vectors: dx/dy are how many cells we move per tick
const DIRECTIONS = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};

let snake;
let food;
let bombs;
let direction;
let nextDirection;
let score;
let tickMs;
let timerId;
let bombTimerId;
let isGameOver;

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  direction = { dx: 1, dy: 0 };
  nextDirection = { ...direction };
  score = 0;
  tickMs = BASE_TICK_MS;
  bombs = [];
  isGameOver = false;
  scoreEl.textContent = score;
  statusEl.textContent = "";
  placeFood();
}

// Shared check so food and bombs never spawn on top of the snake or each other
function isCellOccupied(x, y, { ignoreFood = false } = {}) {
  const onSnake = snake.some((segment) => segment.x === x && segment.y === y);
  const onFood = !ignoreFood && food && food.x === x && food.y === y;
  const onBomb = bombs.some((bomb) => bomb.x === x && bomb.y === y);
  return onSnake || onFood || onBomb;
}

function placeFood() {
  // Use local coords first — assigning to `food` before the check would
  // always mark the cell as occupied and spin forever.
  let x, y;
  let attempts = 0;
  do {
    x = Math.floor(Math.random() * TILE_COUNT);
    y = Math.floor(Math.random() * TILE_COUNT);
    attempts += 1;
  } while (isCellOccupied(x, y, { ignoreFood: true }) && attempts < 100);

  food = { x, y };
}

function spawnBomb() {
  if (isGameOver || bombs.length >= MAX_BOMBS) return;
  if (Math.random() > BOMB_SPAWN_CHANCE) return;

  let x, y;
  let attempts = 0;
  do {
    x = Math.floor(Math.random() * TILE_COUNT);
    y = Math.floor(Math.random() * TILE_COUNT);
    attempts += 1;
  } while (isCellOccupied(x, y) && attempts < 50);

  if (attempts >= 50) return; // board too full right now, skip this round

  bombs.push({ x, y, spawnedAt: Date.now() });
  draw();
}

function pruneExpiredBombs() {
  const now = Date.now();
  bombs = bombs.filter((bomb) => now - bomb.spawnedAt < BOMB_LIFETIME_MS);
}

function startLoop() {
  clearInterval(timerId);
  timerId = setInterval(tick, tickMs);
}

function startBombTimer() {
  clearInterval(bombTimerId);
  bombTimerId = setInterval(spawnBomb, BOMB_SPAWN_INTERVAL_MS);
}

// Recompute speed after eating; only restart the loop if it actually changed
function speedUp() {
  const newTickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - score * SPEED_STEP_MS);
  if (newTickMs !== tickMs) {
    tickMs = newTickMs;
    startLoop();
  }
}

function tick() {
  if (isGameOver) return;

  pruneExpiredBombs();

  // Apply the latest queued direction once per tick
  direction = nextDirection;

  const head = snake[0];
  const newHead = {
    x: head.x + direction.dx,
    y: head.y + direction.dy,
  };

  // Wall collision
  if (
    newHead.x < 0 ||
    newHead.x >= TILE_COUNT ||
    newHead.y < 0 ||
    newHead.y >= TILE_COUNT
  ) {
    endGame();
    return;
  }

  // Self collision
  if (snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
    endGame();
    return;
  }

  // Bomb collision — these are the "sudden bombs" you must dodge
  if (bombs.some((bomb) => bomb.x === newHead.x && bomb.y === newHead.y)) {
    endGame("Boom! You hit a bomb.");
    return;
  }

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    score += 1;
    scoreEl.textContent = score;
    placeFood();
    speedUp();
  } else {
    // No food eaten: remove tail so length stays the same
    snake.pop();
  }

  draw();
}

function endGame(message = "Game over!") {
  isGameOver = true;
  statusEl.textContent = message;
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
}

function drawBomb(bomb) {
  const age = Date.now() - bomb.spawnedAt;
  // Flash yellow/purple in the last ~1.2s as a warning it's about to vanish
  const aboutToExpire = BOMB_LIFETIME_MS - age < 1200;
  const flashOn = Math.floor(age / 200) % 2 === 0;
  const color = aboutToExpire && flashOn ? "#fbbf24" : "#a855f7";
  drawCell(bomb.x, bomb.y, color);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawCell(food.x, food.y, "#ef4444");
  bombs.forEach(drawBomb);

  snake.forEach((segment, index) => {
    const color = index === 0 ? "#22c55e" : "#16a34a";
    drawCell(segment.x, segment.y, color);
  });
}

function isOppositeDirection(current, next) {
  return current.dx + next.dx === 0 && current.dy + next.dy === 0;
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    resetGame();
    draw();
    startLoop();
    startBombTimer();
    return;
  }

  const pressed = DIRECTIONS[event.key];
  if (!pressed || isGameOver) return;

  // Prevent instant 180° turns (snake can't reverse into itself)
  if (!isOppositeDirection(direction, pressed)) {
    nextDirection = pressed;
  }
});

resetGame();
draw();
startLoop();
startBombTimer();
