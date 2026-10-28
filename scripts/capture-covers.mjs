import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { memoryInitial } from "../src/engines.mjs";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
await mkdir("public/covers", { recursive: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});
const base = process.env.DEMO_URL || "http://127.0.0.1:4331";
for (const game of ["hitbox", "tiles", "memory", "reaction"]) {
  await page.goto(`${base}/?game=${game}&seed=42`);
  await page.getByRole("dialog").waitFor();
  if (game === "tiles") {
    for (let index = 0; index < 16; index += 1)
      await page
        .getByRole("button", {
          name: `Move ${["left", "down", "right", "up"][index % 4]}`,
          exact: true,
        })
        .click();
  } else if (game === "memory") {
    await page.getByRole("button", { name: "Start matching" }).click();
    const cards = memoryInitial(42).cards;
    for (let value = 0; value < 4; value += 1) {
      for (const index of cards.flatMap((card, index) =>
        card === value ? [index] : [],
      ))
        await page.locator(".memory-board button").nth(index).click();
    }
  } else if (game === "reaction") {
    await page.clock.install();
    await page.locator(".reaction-button").click();
    await page.clock.fastForward(4500);
  }
  const selector = {
    hitbox: ".letter-board",
    tiles: ".tiles-board",
    memory: ".memory-board",
    reaction: ".reaction-button",
  }[game];
  await page
    .locator(selector)
    .screenshot({ path: `public/covers/${game}.png` });
}
await browser.close();
console.log(
  "Captured four actual game boards. No rendered scores or player counts were invented.",
);
