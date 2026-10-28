import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { memoryInitial, reactionDelay } from "../../src/engines.mjs";

test("catalog search, favourites and themes survive normal use", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator(".game-card")).toHaveCount(4);
  await page.getByRole("textbox", { name: "Search games" }).fill("not-a-game");
  await expect(page.getByText("No games here yet.")).toBeVisible();
  await page.getByRole("button", { name: "Show all games" }).click();
  await page.getByRole("button", { name: "Save HITBOX", exact: true }).click();
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unsave HITBOX", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Use light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `docs/arcade-${info.project.name}.png`,
    fullPage: true,
  });
});

test("HITBOX deadline, pause, score and restart do not overlap", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-28T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-28T12:00:01Z"));
  await page.goto("/?game=hitbox&seed=42");
  await page.getByRole("button", { name: "Start 30-second game" }).click();
  const target = await page.locator(".hitbox-target strong").textContent();
  await page
    .getByRole("button", { name: `Letter ${target}`, exact: true })
    .click();
  await expect(
    page.locator(".game-metrics").getByText("10", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(5000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const remaining = await page
    .locator(".game-metrics strong")
    .first()
    .textContent();
  await page.clock.runFor(20000);
  await expect(page.locator(".game-metrics strong").first()).toHaveText(
    remaining,
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(25100);
  await expect(
    page.getByRole("status").filter({ hasText: "Final score: 10" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await page.clock.runFor(10000);
  await expect(page.locator(".game-metrics strong").first()).toHaveText("30s");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Your scores", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("10 pts");
});

test("memory mismatch, reset and completed pairs keep consistent state", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-28T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-28T12:00:01Z"));
  await page.goto("/?game=memory&seed=42");
  await page.getByRole("button", { name: "Start matching" }).click();
  const cards = memoryInitial(42).cards;
  const other = cards.findIndex((value) => value !== cards[0]);
  await page.locator(".memory-board button").nth(0).click();
  await page.locator(".memory-board button").nth(other).click();
  await expect(page.locator(".memory-board button:enabled")).toHaveCount(0);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.locator(".memory-board .revealed")).toHaveCount(0);
  await page.getByRole("button", { name: "Start matching" }).click();
  for (let value = 0; value < 8; value += 1) {
    for (const index of cards.flatMap((card, index) =>
      card === value ? [index] : [],
    ))
      await page.locator(".memory-board button").nth(index).click();
  }
  await expect(
    page.getByRole("status").filter({ hasText: "All pairs found!" }),
  ).toBeVisible();
  await expect(page.locator(".memory-board .revealed")).toHaveCount(16);
  await expect(page.locator(".game-metrics strong").nth(1)).toHaveText("8");
});

test("2048 supports arrows, swipes, explicit controls and score saving", async ({
  page,
}) => {
  await page.goto("/?game=tiles&seed=42");
  for (const key of ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"])
    await page.keyboard.press(key);
  const moves = Number(
    await page.locator(".game-metrics strong").nth(1).textContent(),
  );
  expect(moves).toBeGreaterThan(0);
  await page.locator(".tiles-board").evaluate((board) => {
    board.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        touches: [
          new Touch({
            identifier: 1,
            target: board,
            clientX: 200,
            clientY: 200,
          }),
        ],
      }),
    );
    board.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        changedTouches: [
          new Touch({
            identifier: 1,
            target: board,
            clientX: 100,
            clientY: 200,
          }),
        ],
      }),
    );
  });
  await page.getByRole("button", { name: "Move down", exact: true }).click();
  await page
    .getByRole("button", { name: "Save this score", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Your scores", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(/\d+ pts/);
});

test("reaction false starts cannot leak a delayed GO into the next round", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-28T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-28T12:00:01Z"));
  await page.goto("/?game=reaction&seed=42");
  await page.locator(".reaction-button").click();
  await page.locator(".reaction-button").click();
  await page.clock.runFor(5000);
  await expect(page.locator(".reaction-button")).toContainText("TOO SOON");
  let seed = reactionDelay(42).seed;
  for (let index = 0; index < 5; index += 1) {
    await page.locator(".reaction-button").click();
    const draw = reactionDelay(seed);
    seed = draw.seed;
    await page.clock.runFor(draw.milliseconds);
    await expect(page.locator(".reaction-button")).toContainText("GO");
    await page.clock.runFor(150);
    await page.locator(".reaction-button").click();
  }
  await expect(page.locator(".reaction-button")).toContainText("150 ms");
  await expect(
    page.getByRole("status").filter({ hasText: "Five rounds complete" }),
  ).toBeVisible();
});

test("daily seeds, keyboard dialogs and both themes pass accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Use light theme" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("button", { name: "Play today’s challenge", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "HITBOX · Daily challenge",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Play today’s challenge", exact: true }),
  ).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
