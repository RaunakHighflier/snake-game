// --- Core game constants ---
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");

const GRID_SIZE = 20; // each cell is 20x20 pixels
const TILE_COUNT = canvas.width / GRID_SIZE; // 20 columns and rows
const TICK_MS = 120; // lower = faster snake

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
let direction;
let nextDirection;
let score;
let timerId;
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
  isGameOver = false;
  scoreEl.textContent = score;
  statusEl.textContent = "";
  placeFood();
}

function placeFood() {
  // Keep placing food until it lands on an empty cell
  do {
    food = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT),
    };
  } while (snake.some((segment) => segment.x === food.x && segment.y === food.y));
}

function startLoop() {
  clearInterval(timerId);
  timerId = setInterval(tick, TICK_MS);
}

function tick() {
  if (isGameOver) return;

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

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    score += 1;
    scoreEl.textContent = score;
    placeFood();
  } else {
    // No food eaten: remove tail so length stays the same
    snake.pop();
  }

  draw();
}

function endGame() {
  isGameOver = true;
  statusEl.textContent = "Game over!";
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawCell(food.x, food.y, "#ef4444");

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
