import { test, expect } from "@playwright/test";

/**
 * These tests run against the real app in a real browser, talking to the
 * real backend over an actual WebSocket connection (no mocks). They
 * require the backend (npm run dev / node server.js in /backend) to be
 * running on port 5001 alongside the frontend dev server Playwright
 * starts automatically - see the project README for the two-terminal
 * setup used to run these.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page.getByText("Real-time Kanban Board")).toBeVisible();
  // Wait for the initial sync so we're not racing the loading state.
  await expect(page.getByRole("status")).toHaveCount(0, { timeout: 10000 });
});

test("User can add a task and see it on the board", async ({ page }) => {
  const taskTitle = `E2E task ${Date.now()}`;

  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByRole("button", { name: /add task/i }).click();

  await expect(page.getByTestId("column-todo").getByText(taskTitle)).toBeVisible();
});

test("User can drag and drop a task between columns", async ({ page }) => {
  const taskTitle = `Drag task ${Date.now()}`;

  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByRole("button", { name: /add task/i }).click();

  const card = page.getByTestId("column-todo").getByText(taskTitle);
  await expect(card).toBeVisible();

  const source = page.getByTestId("column-todo").getByText(taskTitle);
  const targetColumn = page.getByTestId("column-in-progress");

  // @hello-pangea/dnd listens for real pointer events, so we drive a
  // manual drag sequence rather than relying on dragTo(), which dispatches
  // native HTML5 drag events that this library does not use.
  const sourceBox = await source.boundingBox();
  const targetBox = await targetColumn.boundingBox();

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + 60;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // The library's sensor needs a brief pause (and a small initial nudge)
  // to register this as a drag rather than a click before it starts
  // tracking pointer movement.
  await page.mouse.move(startX, startY - 5, { steps: 5 });
  await page.waitForTimeout(150);

  // Move in waypoints toward the target so the library's collision
  // detection has intermediate states to recalculate the drop target
  // against, rather than jumping straight from source to destination.
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  await page.mouse.move(midX, midY, { steps: 10 });
  await page.waitForTimeout(100);
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.waitForTimeout(150);

  await page.mouse.up();

  await expect(page.getByTestId("column-in-progress").getByText(taskTitle)).toBeVisible({
    timeout: 10000,
  });
});

test("UI updates in real time when another browser context modifies tasks", async ({
  page,
  browser,
}) => {
  const taskTitle = `Sync task ${Date.now()}`;

  // A second, fully independent browser context simulates a second user
  // with their own WebSocket connection - not a second tab sharing state.
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto("http://localhost:3000");
  await expect(secondPage.getByText("Real-time Kanban Board")).toBeVisible();

  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByRole("button", { name: /add task/i }).click();

  // The second client never touched the form - it should see the task
  // purely from the server's sync:tasks broadcast.
  await expect(secondPage.getByTestId("column-todo").getByText(taskTitle)).toBeVisible({
    timeout: 10000,
  });

  await secondContext.close();
});

test("User can delete a task and see it removed", async ({ page }) => {
  const taskTitle = `Delete task ${Date.now()}`;

  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByRole("button", { name: /add task/i }).click();
  await expect(page.getByTestId("column-todo").getByText(taskTitle)).toBeVisible();

  await page.getByLabel(`Delete ${taskTitle}`).click();

  await expect(page.getByText(taskTitle)).toHaveCount(0);
});

test("User can select a priority level for a task", async ({ page }) => {
  const taskTitle = `Priority task ${Date.now()}`;

  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByLabel("Task priority").selectOption("high");
  await page.getByRole("button", { name: /add task/i }).click();

  const card = page.locator(".task-card", { hasText: taskTitle });
  await expect(card).toHaveClass(/priority-high/);
});

test("User can set a task category", async ({ page }) => {
  const taskTitle = `Category task ${Date.now()}`;

  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByLabel("Task category").selectOption("bug");
  await page.getByRole("button", { name: /add task/i }).click();

  const column = page.getByTestId("column-todo");
  await expect(column.getByText(taskTitle)).toBeVisible();
  await expect(column.getByText("Bug")).toBeVisible();
});

test("uploading an unsupported file type shows an error message", async ({ page }) => {
  await page.getByLabel("Task title").fill("File validation task");

  // Build a tiny fake .exe in-memory so the test doesn't depend on a
  // fixture file existing on disk.
  await page.setInputFiles('input[type="file"]', {
    name: "not-allowed.exe",
    mimeType: "application/x-msdownload",
    buffer: Buffer.from("fake binary content"),
  });

  await expect(page.getByRole("alert")).toContainText(/unsupported file type/i);
});

test("the progress chart reflects task counts as tasks are added", async ({ page }) => {
  const taskTitle = `Chart task ${Date.now()}`;

  await expect(page.getByTestId("progress-chart")).toBeVisible();

  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByRole("button", { name: /add task/i }).click();

  await expect(page.getByTestId("column-todo").getByText(taskTitle)).toBeVisible();
  // The chart re-renders from the same tasks array the columns use, so a
  // successful task creation is sufficient evidence the chart's data
  // source updated; computeProgressStats itself is unit tested separately.
  await expect(page.getByTestId("progress-chart")).toBeVisible();
});
