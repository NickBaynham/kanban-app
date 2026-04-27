import { expect, test, type Page } from "@playwright/test";

const API = "http://127.0.0.1:8000";
const TEST_USER = `e2e_${Date.now()}`;
const TEST_PASS = "e2etest123";

let token: string;
let boardId: number;

// Find a column section by its title button text.
function col(name: string, page: Page) {
  return page.locator('[data-testid^="column-"]').filter({
    has: page.getByRole("button", { name, exact: true }),
  });
}

// Find a card article by its heading text.
function card(title: string, page: Page) {
  return page.locator('[data-testid^="card-"]').filter({
    has: page.getByRole("heading", { level: 3, name: title }),
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Kanban board", () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/api/register`, {
      data: { username: TEST_USER, password: TEST_PASS },
    });

    const loginRes = await request.post(`${API}/api/login`, {
      form: { username: TEST_USER, password: TEST_PASS },
    });
    expect(loginRes.ok()).toBeTruthy();
    token = (await loginRes.json()).access_token;

    const boardRes = await request.post(`${API}/api/boards`, {
      data: { name: "E2E Test Board" },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(boardRes.ok()).toBeTruthy();
    boardId = (await boardRes.json()).id;
  });

  test.afterAll(async ({ request }) => {
    if (boardId) {
      await request.delete(`${API}/api/boards/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    // Best-effort cleanup of the e2e user so the dev DB doesn't accumulate.
    // The /api/users delete endpoint isn't exposed today; revisit if added.
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login/");
    await page.evaluate((t) => localStorage.setItem("token", t), token);
    await page.goto(`/board/?id=${boardId}`);
    await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  // ── Regression: no hydration errors ────────────────────────────────────────

  test("does not log React hydration mismatches after board loads", async ({ page }) => {
    const issues: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if ((msg.type() === "error" || msg.type() === "warning") && /hydration/i.test(text)) {
        issues.push(`[${msg.type()}] ${text}`);
      }
    });
    page.on("pageerror", (err) => {
      if (/hydration/i.test(err.message)) issues.push(`[pageerror] ${err.message}`);
    });

    await page.reload();
    await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible({ timeout: 15_000 });
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );
    expect(issues, issues.join("\n---\n")).toEqual([]);
  });

  // ── Board structure ─────────────────────────────────────────────────────────

  test("loads the board with 5 default columns", async ({ page }) => {
    await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
    for (const name of ["To Do", "In Progress", "In Review", "Testing", "Done"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
  });

  // ── Board rename ────────────────────────────────────────────────────────────

  test("renames the board via the title", async ({ page }) => {
    await page.getByTestId("project-title-display").click();
    const input = page.getByRole("textbox", { name: "Project title" });
    await expect(input).toBeVisible();
    await input.fill("My Renamed Board");
    await input.press("Enter");
    await expect(page.getByTestId("project-title-display")).toHaveText("My Renamed Board");

    // Rename back
    await page.getByTestId("project-title-display").click();
    await page.getByRole("textbox", { name: "Project title" }).fill("E2E Test Board");
    await page.getByRole("textbox", { name: "Project title" }).press("Enter");
    await expect(page.getByTestId("project-title-display")).toHaveText("E2E Test Board");
  });

  // ── Column rename ───────────────────────────────────────────────────────────

  test("renames a column", async ({ page }) => {
    await col("To Do", page).getByRole("button", { name: "To Do", exact: true }).click();
    const input = page.getByRole("textbox", { name: "Column name" });
    await expect(input).toBeVisible();
    await input.fill("Backlog");
    await input.press("Enter");

    const backlogCol = col("Backlog", page);
    await expect(backlogCol.getByRole("button", { name: "Backlog", exact: true })).toBeVisible();

    // Rename back
    await backlogCol.getByRole("button", { name: "Backlog", exact: true }).click();
    const input2 = page.getByRole("textbox", { name: "Column name" });
    await input2.fill("To Do");
    await input2.press("Enter");
    await expect(col("To Do", page).getByRole("button", { name: "To Do", exact: true })).toBeVisible();
  });

  // ── Collapse / expand lane ──────────────────────────────────────────────────

  test("collapses and expands a lane", async ({ page }) => {
    const inProgressCol = col("In Progress", page);

    // Collapse
    await inProgressCol.getByRole("button", { name: "Collapse lane" }).click();
    await expect(inProgressCol).toHaveAttribute("data-collapsed", "true");
    await expect(inProgressCol.getByRole("button", { name: "Add card" })).not.toBeVisible();

    // Expand
    await inProgressCol.getByRole("button", { name: "Expand lane" }).click();
    await expect(inProgressCol).toHaveAttribute("data-collapsed", "false");
    await expect(inProgressCol.getByRole("button", { name: "Add card" })).toBeVisible();
  });

  test("collapsed state persists on reload", async ({ page }) => {
    const testingCol = col("Testing", page);
    await testingCol.getByRole("button", { name: "Collapse lane" }).click();
    await expect(testingCol).toHaveAttribute("data-collapsed", "true");

    // Reload page and check state is restored from DB
    await page.goto(`/board/?id=${boardId}`);
    await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible({ timeout: 15_000 });
    await expect(col("Testing", page)).toHaveAttribute("data-collapsed", "true");

    // Expand so other tests start clean
    await col("Testing", page).getByRole("button", { name: "Expand lane" }).click();
    await expect(col("Testing", page)).toHaveAttribute("data-collapsed", "false");
  });

  // ── Card CRUD ───────────────────────────────────────────────────────────────

  test("adds a card to a column", async ({ page }) => {
    const inProgressCol = col("In Progress", page);
    await inProgressCol.getByRole("button", { name: "Add card" }).click();
    await inProgressCol.getByRole("textbox", { name: "New card title" }).fill("E2E card");
    await inProgressCol.getByRole("textbox", { name: "New card details" }).fill("Created by Playwright");
    await inProgressCol.getByRole("button", { name: "Add card", exact: true }).click();
    await expect(inProgressCol.getByText("E2E card")).toBeVisible();
  });

  test("edits a card", async ({ page }) => {
    const toDoCol = col("To Do", page);
    await toDoCol.getByRole("button", { name: "Add card" }).click();
    await toDoCol.getByRole("textbox", { name: "New card title" }).fill("Card to Edit");
    await toDoCol.getByRole("button", { name: "Add card", exact: true }).click();
    await expect(toDoCol.getByText("Card to Edit")).toBeVisible();

    await card("Card to Edit", page).getByRole("button", { name: "Edit Card to Edit" }).click();

    // h3 heading replaced by inputs while editing — use page-level locators
    await page.getByRole("textbox", { name: "Card title" }).fill("Edited Card");
    await page.getByRole("textbox", { name: "Card details" }).fill("Updated details");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(card("Edited Card", page).getByRole("heading", { level: 3 })).toBeVisible();
  });

  test("deletes a card", async ({ page }) => {
    const toDoCol = col("To Do", page);
    await toDoCol.getByRole("button", { name: "Add card" }).click();
    await toDoCol.getByRole("textbox", { name: "New card title" }).fill("Card to Delete");
    await toDoCol.getByRole("button", { name: "Add card", exact: true }).click();
    await expect(toDoCol.getByText("Card to Delete")).toBeVisible();

    await card("Card to Delete", page).getByRole("button", { name: "Delete Card to Delete" }).click();
    await expect(page.getByText("Card to Delete")).toHaveCount(0);
  });

  test("drags a card to another column", async ({ page }) => {
    const toDoCol = col("To Do", page);
    await toDoCol.getByRole("button", { name: "Add card" }).click();
    await toDoCol.getByRole("textbox", { name: "New card title" }).fill("Card to Drag");
    await toDoCol.getByRole("button", { name: "Add card", exact: true }).click();
    await expect(toDoCol.getByText("Card to Drag")).toBeVisible();

    const theCard = card("Card to Drag", page);
    const doneCol = col("Done", page);
    const handle = theCard.getByRole("button", { name: "Drag Card to Drag" });
    const hb = await handle.boundingBox();
    const tb = await doneCol.boundingBox();
    if (!hb || !tb) throw new Error("missing bounding box for drag");

    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + 100, { steps: 25 });
    await page.mouse.up();
    await expect(doneCol.getByText("Card to Drag")).toBeVisible({ timeout: 5_000 });
  });
});
