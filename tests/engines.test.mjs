import test from "node:test";
import assert from "node:assert/strict";
import {
  ALPHABET,
  hashSeed,
  random,
  shuffled,
  hitboxInitial,
  hitboxPick,
  remainingTime,
  slideLine,
  tilesInitial,
  tilesMove,
  memoryInitial,
  memoryFlip,
  memoryConceal,
  memoryScore,
  reactionDelay,
  median,
  dailySeed,
} from "../src/engines.mjs";

test("seeded letter boards are reproducible, complete and immutable", () => {
  const initial = hitboxInitial(42),
    original = structuredClone(initial);
  assert.deepEqual(initial, hitboxInitial(42));
  assert.deepEqual([...initial.letters].sort(), ALPHABET);
  assert.ok(initial.letters.includes(initial.target));
  const next = hitboxPick(initial, initial.target);
  assert.equal(next.score, 10);
  assert.equal(next.hits, 1);
  assert.deepEqual(initial, original);
  assert.notDeepEqual(next.letters, initial.letters);
});
test("misses floor at zero and reset the streak", () => {
  let state = hitboxInitial(1);
  state = hitboxPick(
    state,
    state.letters.find((value) => value !== state.target),
  );
  assert.equal(state.score, 0);
  assert.equal(state.misses, 1);
  state = hitboxPick(state, state.target);
  state = hitboxPick(
    state,
    state.letters.find((value) => value !== state.target),
  );
  assert.equal(state.score, 8);
  assert.equal(state.streak, 0);
});
test("every fifth consecutive hit adds a ten-point bonus", () => {
  let state = hitboxInitial(10);
  for (let index = 0; index < 10; index += 1)
    state = hitboxPick(state, state.target);
  assert.equal(state.score, 120);
  assert.equal(state.hits, 10);
  assert.equal(hitboxPick(state, "<invalid>"), state);
});
test("deadline arithmetic clamps expired time without counting timer ticks", () => {
  assert.equal(remainingTime(30000, 15370), 14630);
  assert.equal(remainingTime(30000, 31000), 0);
});
for (const [input, expected, score] of [
  [[2, 2, 2, 2], [4, 4, 0, 0], 8],
  [[4, 4, 8, 0], [8, 8, 0, 0], 8],
  [[0, 2, 0, 2], [4, 0, 0, 0], 4],
  [[2, 4, 8, 16], [2, 4, 8, 16], 0],
  [[0, 0, 0, 0], [0, 0, 0, 0], 0],
])
  test(`2048 line ${JSON.stringify(input)} merges once per move`, () => {
    const before = [...input];
    const actual = slideLine(input);
    assert.deepEqual(actual.values, expected);
    assert.equal(actual.score, score);
    assert.deepEqual(input, before);
  });
test("unchanged 2048 moves do not spawn or consume randomness", () => {
  const state = {
    ...tilesInitial(1),
    board: [2, 4, 8, 16, ...Array(12).fill(0)],
  };
  assert.equal(tilesMove(state, "left"), state);
  assert.equal(tilesMove(state, "invalid"), state);
});
for (const [direction, board, destination] of [
  ["left", [2, 2, ...Array(14).fill(0)], 0],
  ["right", [2, 2, ...Array(14).fill(0)], 3],
  ["up", [2, 0, 0, 0, 2, ...Array(11).fill(0)], 0],
  ["down", [2, 0, 0, 0, 2, ...Array(11).fill(0)], 12],
])
  test(`2048 ${direction} merges into the correct cell`, () => {
    const initial = { ...tilesInitial(6), board },
      before = structuredClone(initial);
    const next = tilesMove(initial, direction);
    assert.equal(next.board[destination], 4);
    assert.equal(next.score, 4);
    assert.equal(next.board.filter(Boolean).length, 2);
    assert.deepEqual(initial, before);
  });
test("reaching 2048 sets the win state", () => {
  const next = tilesMove(
    { ...tilesInitial(1), board: [1024, 1024, ...Array(14).fill(0)] },
    "left",
  );
  assert.equal(next.won, true);
  assert.equal(next.score, 2048);
});
test("2048 random move sequences preserve tile and spawn invariants", () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    let state = tilesInitial(seed);
    for (let index = 0; index < 80; index += 1) {
      const next = tilesMove(state, ["up", "left", "down", "right"][index % 4]);
      assert.ok(
        next.board.every(
          (value) => value === 0 || Number.isInteger(Math.log2(value)),
        ),
      );
      if (next !== state) {
        const extra =
          next.board.reduce((a, b) => a + b, 0) -
          state.board.reduce((a, b) => a + b, 0);
        assert.ok([2, 4].includes(extra));
        assert.equal(next.moves, state.moves + 1);
      }
      assert.ok(next.score >= state.score);
      state = next;
    }
  }
});
test("memory boards contain exactly two copies of each number", () => {
  const state = memoryInitial(32);
  assert.deepEqual(state, memoryInitial(32));
  for (let value = 0; value < 8; value += 1)
    assert.equal(state.cards.filter((card) => card === value).length, 2);
});
test("memory ignores invalid and duplicate flips", () => {
  const initial = memoryInitial(2);
  for (const index of [-1, 16, 1.5, NaN])
    assert.equal(memoryFlip(initial, index), initial);
  const first = memoryFlip(initial, 0);
  assert.equal(memoryFlip(first, 0), first);
});
test("memory mismatches lock until concealed", () => {
  const initial = memoryInitial(2),
    different = initial.cards.findIndex((card) => card !== initial.cards[0]);
  const state = memoryFlip(memoryFlip(initial, 0), different);
  assert.equal(state.locked, true);
  assert.equal(state.moves, 1);
  assert.equal(memoryFlip(state, 4), state);
  const concealed = memoryConceal(state);
  assert.equal(concealed.locked, false);
  assert.deepEqual(concealed.open, []);
});
test("eight distinct matches finish memory in eight moves", () => {
  let state = memoryInitial(12);
  for (let value = 0; value < 8; value += 1) {
    const pair = state.cards.flatMap((card, index) =>
      card === value ? [index] : [],
    );
    state = memoryFlip(memoryFlip(state, pair[0]), pair[1]);
    assert.equal(memoryFlip(state, pair[0]), state);
  }
  assert.equal(state.won, true);
  assert.equal(state.matched.length, 16);
  assert.equal(state.moves, 8);
  assert.equal(memoryScore(8, 10000), 1500);
  assert.equal(memoryScore(1000, 100000), 0);
});
test("reaction delays stay bounded and medians do not mutate inputs", () => {
  for (let seed = 0; seed < 1000; seed += 1) {
    const delay = reactionDelay(seed);
    assert.ok(delay.milliseconds >= 1200 && delay.milliseconds < 4000);
  }
  const samples = [300, 100, 200];
  assert.equal(median(samples), 200);
  assert.deepEqual(samples, [300, 100, 200]);
  assert.equal(median([10, 20]), 15);
  assert.equal(median([]), null);
});
test("seed operations are deterministic and never mutate the shuffled input", () => {
  const values = [...ALPHABET];
  shuffled(values, 5);
  assert.deepEqual(values, ALPHABET);
  assert.equal(dailySeed("2023-04-20"), dailySeed("2023-04-20"));
  assert.notEqual(dailySeed("2023-04-20"), dailySeed("2023-04-21"));
  assert.notEqual(dailySeed("2023-04-20"), dailySeed("2023-04-20", "memory"));
  assert.equal(hashSeed("Ẹ káàárọ̀"), hashSeed("Ẹ káàárọ̀"));
  assert.ok(random(0xffffffff).value >= 0 && random(0xffffffff).value < 1);
});
