import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

function isHydrationMismatchMessage(text: string): boolean {
  return (
    /hydration-mismatch/i.test(text) ||
    /react\.dev\/link\/hydration-mismatch/i.test(text) ||
    /hydrated but some attributes/i.test(text) ||
    /server rendered html didn't match/i.test(text) ||
    /didn't match the client properties/i.test(text)
  );
}

test.describe("Kanban board", () => {
  test("does not log React hydration attribute mismatches after board loads", async ({ page }) => {
    const issues: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" && isHydrationMismatchMessage(text)) {
        issues.push(`[console.error] ${text}`);
      }
      if (msg.type() === "warning" && isHydrationMismatchMessage(text)) {
        issues.push(`[console.warning] ${text}`);
      }
    });

    page.on("pageerror", (err) => {
      if (isHydrationMismatchMessage(err.message)) {
        issues.push(`[pageerror] ${err.message}`);
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("column-c0")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("card-k1")).toBeVisible();

    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );

    expect(issues, issues.join("\n---\n")).toEqual([]);
  });

  test("loads the board and columns", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Project board" })).toBeVisible();
    await expect(page.getByTestId("column-c0")).toBeVisible();
    await expect(page.getByTestId("column-c4")).toBeVisible();
  });

  test("renames a column", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("column-c0").getByRole("button", { name: "Backlog" }).click();
    const input = page.getByRole("textbox", { name: "Column name" });
    await expect(input).toBeVisible();
    await input.fill("Icebox");
    await input.press("Enter");
    await expect(page.getByTestId("column-c0").getByRole("button", { name: "Icebox" })).toBeVisible();
  });

  test("adds a card to a column", async ({ page }) => {
    await page.goto("/");
    const col = page.getByTestId("column-c3");
    await col.getByRole("button", { name: "+ Add card" }).click();
    const titleInput = col.getByRole("textbox", { name: "New card title" });
    await expect(titleInput).toBeVisible();
    await titleInput.fill("E2E card");
    await col.getByRole("textbox", { name: "New card details" }).fill("Created by Playwright");
    await col.getByRole("button", { name: "Add card" }).click();
    await expect(page.getByText("E2E card")).toBeVisible();
  });

  test("deletes a card", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("card-k2");
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Delete Pick drag-and-drop library/ }).click();
    await expect(page.getByTestId("card-k2")).toHaveCount(0);
  });

  test("drags a card to another column", async ({ page }) => {
    await page.goto("/");
    const handle = page.getByTestId("card-k1").getByRole("button", { name: /^Drag / });
    const target = page.getByTestId("column-c4");
    const hb = await handle.boundingBox();
    const tb = await target.boundingBox();
    if (!hb || !tb) throw new Error("missing bounding box for drag");
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + 100, { steps: 25 });
    await page.mouse.up();
    await expect(target.getByTestId("card-k1")).toBeVisible();
  });

  test("edits a card", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("card-k1");
    await card.getByRole("button", { name: "Edit Design board layout" }).click();
    await card.getByRole("textbox", { name: "Card title" }).fill("Layout refresh");
    await card.getByRole("textbox", { name: "Card details" }).fill("Polished chrome.");
    await card.getByRole("button", { name: "Save", exact: true }).click();
    await expect(card.getByRole("heading", { level: 3, name: "Layout refresh" })).toBeVisible();
    await expect(card.getByText("Polished chrome.")).toBeVisible();
  });
});
