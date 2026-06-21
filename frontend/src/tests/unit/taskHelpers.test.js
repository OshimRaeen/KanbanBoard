import { test, expect } from "vitest";
import { groupTasksByColumn, computeProgressStats, validateAttachment } from "../../utils/taskHelpers";

const makeTask = (overrides = {}) => ({
  id: "id-1",
  title: "Task",
  description: "",
  priority: "medium",
  category: "feature",
  column: "todo",
  attachment: null,
  order: 0,
  ...overrides,
});

test("groupTasksByColumn buckets tasks by their column", () => {
  const tasks = [
    makeTask({ id: "1", column: "todo" }),
    makeTask({ id: "2", column: "done" }),
    makeTask({ id: "3", column: "todo" }),
  ];

  const grouped = groupTasksByColumn(tasks);

  expect(grouped.todo.map((t) => t.id)).toEqual(["1", "3"]);
  expect(grouped.done.map((t) => t.id)).toEqual(["2"]);
  expect(grouped["in-progress"]).toEqual([]);
});

test("groupTasksByColumn sorts tasks within a column by order", () => {
  const tasks = [
    makeTask({ id: "1", column: "todo", order: 2 }),
    makeTask({ id: "2", column: "todo", order: 0 }),
    makeTask({ id: "3", column: "todo", order: 1 }),
  ];

  const grouped = groupTasksByColumn(tasks);

  expect(grouped.todo.map((t) => t.id)).toEqual(["2", "3", "1"]);
});

test("computeProgressStats returns 0% completion for an empty board", () => {
  const stats = computeProgressStats([]);
  expect(stats.completionPercent).toBe(0);
  expect(stats.total).toBe(0);
});

test("computeProgressStats computes the percentage of tasks in Done", () => {
  const tasks = [
    makeTask({ id: "1", column: "done" }),
    makeTask({ id: "2", column: "done" }),
    makeTask({ id: "3", column: "todo" }),
    makeTask({ id: "4", column: "in-progress" }),
  ];

  const stats = computeProgressStats(tasks);

  expect(stats.total).toBe(4);
  expect(stats.completionPercent).toBe(50);
});

test("computeProgressStats reports a count per column", () => {
  const tasks = [
    makeTask({ id: "1", column: "todo" }),
    makeTask({ id: "2", column: "todo" }),
    makeTask({ id: "3", column: "done" }),
  ];

  const stats = computeProgressStats(tasks);
  const byId = Object.fromEntries(stats.byColumn.map((c) => [c.column, c.count]));

  expect(byId.todo).toBe(2);
  expect(byId.done).toBe(1);
  expect(byId["in-progress"]).toBe(0);
});

test("validateAttachment accepts a supported image type under the size limit", () => {
  const file = new File(["x"], "photo.png", { type: "image/png" });
  expect(validateAttachment(file)).toBeNull();
});

test("validateAttachment rejects an unsupported file type", () => {
  const file = new File(["x"], "script.exe", { type: "application/x-msdownload" });
  expect(validateAttachment(file)).toMatch(/unsupported file type/i);
});

test("validateAttachment rejects a file over the size limit", () => {
  const bigContent = new Uint8Array(6 * 1024 * 1024); // 6MB, over the 5MB limit
  const file = new File([bigContent], "huge.png", { type: "image/png" });
  expect(validateAttachment(file)).toMatch(/too large/i);
});

test("validateAttachment allows a null file (no attachment selected)", () => {
  expect(validateAttachment(null)).toBeNull();
});
