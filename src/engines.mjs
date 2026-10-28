export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export function hashSeed(value) {
  let hash = 2166136261;
  for (const character of String(value))
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
}
export function random(seed) {
  const next = ((seed >>> 0) + 0x6d2b79f5) >>> 0;
  let value = Math.imul(next ^ (next >>> 15), 1 | next);
  value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
  return { seed: next, value: ((value ^ (value >>> 14)) >>> 0) / 4294967296 };
}
export function shuffled(values, seed) {
  const items = [...values];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const draw = random(seed);
    seed = draw.seed;
    const other = Math.floor(draw.value * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return { items, seed };
}
function letterBoard(seed) {
  const board = shuffled(ALPHABET, seed);
  const draw = random(board.seed);
  return {
    letters: board.items,
    target: ALPHABET[Math.floor(draw.value * ALPHABET.length)],
    seed: draw.seed,
  };
}
export function hitboxInitial(seed = 1) {
  return { ...letterBoard(seed), score: 0, hits: 0, misses: 0, streak: 0 };
}
export function hitboxPick(state, letter) {
  if (!ALPHABET.includes(letter)) return state;
  if (letter !== state.target)
    return {
      ...state,
      misses: state.misses + 1,
      streak: 0,
      score: Math.max(0, state.score - 2),
    };
  const streak = state.streak + 1;
  return {
    ...state,
    ...letterBoard(state.seed),
    hits: state.hits + 1,
    streak,
    score: state.score + 10 + (streak % 5 === 0 ? 10 : 0),
  };
}
export function remainingTime(deadline, now) {
  return Math.max(0, deadline - now);
}

export function slideLine(input) {
  const values = input.filter(Boolean);
  const merged = [];
  let score = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === values[index + 1]) {
      merged.push(values[index] * 2);
      score += values[index] * 2;
      index += 1;
    } else merged.push(values[index]);
  }
  return {
    values: [...merged, ...Array(input.length - merged.length).fill(0)],
    score,
  };
}
function addTile(state) {
  const empty = state.board.flatMap((value, index) =>
    value === 0 ? [index] : [],
  );
  if (!empty.length) return state;
  const position = random(state.seed);
  const tile = random(position.seed);
  const board = [...state.board];
  board[empty[Math.floor(position.value * empty.length)]] =
    tile.value < 0.9 ? 2 : 4;
  return { ...state, board, seed: tile.seed };
}
export function tilesInitial(seed = 1) {
  return addTile(
    addTile({
      board: Array(16).fill(0),
      seed,
      score: 0,
      moves: 0,
      over: false,
      won: false,
    }),
  );
}
export function tilesMove(state, direction) {
  if (!["left", "right", "up", "down"].includes(direction) || state.over)
    return state;
  const board = [...state.board];
  let score = 0;
  for (let line = 0; line < 4; line += 1) {
    let positions = Array.from({ length: 4 }, (_, index) =>
      ["left", "right"].includes(direction)
        ? line * 4 + index
        : index * 4 + line,
    );
    if (["right", "down"].includes(direction)) positions.reverse();
    const next = slideLine(positions.map((index) => board[index]));
    score += next.score;
    positions.forEach((position, index) => {
      board[position] = next.values[index];
    });
  }
  if (board.every((value, index) => value === state.board[index])) return state;
  const next = addTile({
    ...state,
    board,
    score: state.score + score,
    moves: state.moves + 1,
  });
  next.won = state.won || next.board.some((value) => value >= 2048);
  next.over =
    !next.board.includes(0) &&
    next.board.every(
      (value, index) =>
        (index % 4 === 3 || value !== next.board[index + 1]) &&
        (index >= 12 || value !== next.board[index + 4]),
    );
  return next;
}
export function memoryInitial(seed = 1) {
  return {
    cards: shuffled([...Array(8).keys(), ...Array(8).keys()], seed).items,
    open: [],
    matched: [],
    moves: 0,
    locked: false,
    won: false,
  };
}
export function memoryFlip(state, index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 16 ||
    state.locked ||
    state.won ||
    state.open.includes(index) ||
    state.matched.includes(index)
  )
    return state;
  const open = [...state.open, index];
  if (open.length === 1) return { ...state, open };
  const matched =
    state.cards[open[0]] === state.cards[open[1]]
      ? [...state.matched, ...open]
      : state.matched;
  return {
    ...state,
    open: matched.length > state.matched.length ? [] : open,
    matched,
    moves: state.moves + 1,
    locked: matched === state.matched,
    won: matched.length === 16,
  };
}
export function memoryConceal(state) {
  return state.locked ? { ...state, open: [], locked: false } : state;
}
export function memoryScore(moves, elapsedMs) {
  return Math.max(0, 1600 - moves * 10 - Math.floor(elapsedMs / 1000) * 2);
}
export function reactionDelay(seed) {
  const draw = random(seed);
  return {
    seed: draw.seed,
    milliseconds: 1200 + Math.floor(draw.value * 2800),
  };
}
export function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}
export function dailySeed(day, game = "hitbox") {
  return hashSeed(`${day}:${game}`);
}
