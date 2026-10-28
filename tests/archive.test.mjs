import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  hitboxInitial,
  hitboxPick,
  tilesInitial,
  tilesMove,
  memoryInitial,
  reactionDelay,
} from "../src/engines.mjs";

test("frozen 2023 archive replays all 335 days across four game engines", async () => {
  const root = new URL("./archive/", import.meta.url);
  const index = JSON.parse(await readFile(new URL("index.json", root)));
  assert.equal(index.synthetic, true);
  assert.equal(index.count, 335);
  assert.equal(Object.keys(index.files).length, 335);
  for (const [filename, expected] of Object.entries(index.files)) {
    const content = await readFile(new URL(filename, root));
    assert.equal(createHash("sha256").update(content).digest("hex"), expected);
    const fixture = JSON.parse(content);
    assert.equal(fixture.synthetic, true);
    let letter = hitboxInitial(fixture.hitbox.seed);
    assert.deepEqual(letter, fixture.hitbox.initial);
    for (const pick of fixture.hitbox.picks) letter = hitboxPick(letter, pick);
    assert.deepEqual(letter, fixture.hitbox.expected);
    let tiles = tilesInitial(fixture.tiles.seed);
    for (const move of fixture.tiles.moves) tiles = tilesMove(tiles, move);
    assert.deepEqual(tiles, fixture.tiles.expected);
    assert.deepEqual(
      memoryInitial(fixture.memory.seed),
      fixture.memory.expected,
    );
    let seed = fixture.reaction.seed;
    for (const expectedDelay of fixture.reaction.delays) {
      const draw = reactionDelay(seed);
      seed = draw.seed;
      assert.equal(draw.milliseconds, expectedDelay);
    }
  }
});
