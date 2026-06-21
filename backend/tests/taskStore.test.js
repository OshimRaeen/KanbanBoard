import { describe, test, expect, beforeEach } from "vitest";
import { TaskStore } from "../taskStore.js";

describe("TaskStore", () => {
  let store;

  beforeEach(() => {
    store = new TaskStore();
  });

  test("creates a task with sensible defaults", () => {
    const task = store.create({ title: "Write tests" });

    expect(task.title).toBe("Write tests");
    expect(task.column).toBe("todo");
    expect(task.priority).toBe("medium");
    expect(task.category).toBe("feature");
    expect(task.id).toBeTruthy();
  });

  test("rejects a task with an empty title", () => {
    expect(() => store.create({ title: "   " })).toThrow("Task title is required");
  });

  test("rejects an invalid priority", () => {
    expect(() => store.create({ title: "Bad task", priority: "urgent" })).toThrow(
      /Invalid priority/
    );
  });

  test("updates a task's fields without touching its id or column", () => {
    const task = store.create({ title: "Original" });

    const updated = store.update(task.id, { title: "Updated", priority: "high" });

    expect(updated.id).toBe(task.id);
    expect(updated.title).toBe("Updated");
    expect(updated.priority).toBe("high");
    expect(updated.column).toBe("todo");
  });

  test("throws when updating a task that doesn't exist", () => {
    expect(() => store.update("not-a-real-id", { title: "x" })).toThrow("Task not found");
  });

  test("moves a task to a new column", () => {
    const task = store.create({ title: "Move me" });

    const moved = store.move(task.id, { column: "in-progress" });

    expect(moved.column).toBe("in-progress");
  });

  test("rejects a move to an invalid column", () => {
    const task = store.create({ title: "Move me" });
    expect(() => store.move(task.id, { column: "archived" })).toThrow("Invalid column");
  });

  test("removes a task", () => {
    const task = store.create({ title: "Delete me" });

    const existed = store.remove(task.id);
    const after = store.getAll();

    expect(existed).toBe(true);
    expect(after.find((t) => t.id === task.id)).toBeUndefined();
  });

  test("returns false when removing a task that doesn't exist", () => {
    expect(store.remove("nope")).toBe(false);
  });

  test("getAll returns tasks ordered by their order field", () => {
    store.create({ title: "First" });
    store.create({ title: "Second" });
    store.create({ title: "Third" });

    const all = store.getAll();

    expect(all.map((t) => t.title)).toEqual(["First", "Second", "Third"]);
  });
});
