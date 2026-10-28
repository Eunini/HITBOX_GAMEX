import { createHash } from "node:crypto";
import { mkdir, access, writeFile } from "node:fs/promises";
import {
  hitboxInitial,
  hitboxPick,
  tilesInitial,
  tilesMove,
  memoryInitial,
  reactionDelay,
  dailySeed,
} from "../src/engines.mjs";
const root = new URL("../tests/archive/", import.meta.url);
try {
  await access(new URL("index.json", root));
  throw new Error(
    "Archive already exists; refusing to overwrite frozen fixtures.",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(new URL("2023/", root), { recursive: true });
const hash = (value) => createHash("sha256").update(value).digest("hex");
const generated_at = new Date().toISOString();
const days = Array.from({ length: 365 }, (_, index) =>
  new Date(Date.UTC(2023, 0, index + 1)).toISOString().slice(0, 10),
)
  .sort((a, b) =>
    hash(`2023-portfolio:${a}`).localeCompare(hash(`2023-portfolio:${b}`)),
  )
  .slice(0, 335)
  .sort();
const files = {};
for (const day of days) {
  const letterSeed = dailySeed(day, "hitbox"),
    tilesSeed = dailySeed(day, "tiles"),
    memorySeed = dailySeed(day, "memory");
  const hitbox = hitboxInitial(letterSeed);
  const picks = [];
  let after = hitbox;
  for (let index = 0; index < 6; index += 1) {
    picks.push(after.target);
    after = hitboxPick(after, after.target);
  }
  const moves = ["left", "down", "right", "up", "left", "down", "left", "up"];
  let tiles = tilesInitial(tilesSeed);
  for (const direction of moves) tiles = tilesMove(tiles, direction);
  let seed = dailySeed(day, "reaction");
  const delays = [];
  for (let index = 0; index < 5; index += 1) {
    const draw = reactionDelay(seed);
    seed = draw.seed;
    delays.push(draw.milliseconds);
  }
  const fixture = {
    schema: 1,
    scenario_date: day,
    generated_at,
    synthetic: true,
    hitbox: { seed: letterSeed, initial: hitbox, picks, expected: after },
    tiles: { seed: tilesSeed, moves, expected: tiles },
    memory: { seed: memorySeed, expected: memoryInitial(memorySeed) },
    reaction: { seed: dailySeed(day, "reaction"), delays },
  };
  const content = JSON.stringify(fixture, null, 2) + "\n";
  const filename = `2023/${day}.json`;
  await writeFile(new URL(filename, root), content);
  files[filename] = hash(content);
}
await writeFile(
  new URL("index.json", root),
  JSON.stringify(
    { schema: 1, generated_at, synthetic: true, count: days.length, files },
    null,
    2,
  ) + "\n",
);
console.log(
  `Generated ${days.length} synthetic daily replay fixtures across four game engines.`,
);
