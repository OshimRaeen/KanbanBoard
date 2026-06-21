const { randomUUID } = require("crypto");

const COLUMNS = ["todo", "in-progress", "done"];
const PRIORITIES = ["low", "medium", "high"];
const CATEGORIES = ["bug", "feature", "enhancement"];

/**
 * In-memory task store.
 *
 * Kept deliberately simple (a Map keyed by task id) so the WebSocket layer
 * in server.js doesn't need to know anything about persistence. Swapping
 * this for a MongoDB-backed store later only means changing the bodies of
 * these functions - the public API (create/update/move/remove/getAll) stays
 * the same, so server.js wouldn't need to change at all.
 */
class TaskStore {
  constructor() {
    this.tasks = new Map();
  }

  getAll() {
    return Array.from(this.tasks.values()).sort((a, b) => a.order - b.order);
  }

  create({ title, description = "", priority = "medium", category = "feature", column = "todo" }) {
    if (!title || !title.trim()) {
      throw new Error("Task title is required");
    }
    if (!COLUMNS.includes(column)) {
      throw new Error(`Invalid column: ${column}`);
    }
    if (!PRIORITIES.includes(priority)) {
      throw new Error(`Invalid priority: ${priority}`);
    }
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    const tasksInColumn = this.getAll().filter((t) => t.column === column);
    const task = {
      id: randomUUID(),
      title: title.trim(),
      description,
      priority,
      category,
      column,
      attachment: null,
      order: tasksInColumn.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    return task;
  }

  update(id, updates) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (updates.priority && !PRIORITIES.includes(updates.priority)) {
      throw new Error(`Invalid priority: ${updates.priority}`);
    }
    if (updates.category && !CATEGORIES.includes(updates.category)) {
      throw new Error(`Invalid category: ${updates.category}`);
    }

    const allowedFields = ["title", "description", "priority", "category", "attachment"];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    }
    task.updatedAt = new Date().toISOString();

    this.tasks.set(id, task);
    return task;
  }

  move(id, { column, order }) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    if (!COLUMNS.includes(column)) {
      throw new Error(`Invalid column: ${column}`);
    }

    task.column = column;
    task.order = order !== undefined ? order : this.getAll().filter((t) => t.column === column).length;
    task.updatedAt = new Date().toISOString();

    this.tasks.set(id, task);
    return task;
  }

  remove(id) {
    const existed = this.tasks.has(id);
    this.tasks.delete(id);
    return existed;
  }

  clear() {
    this.tasks.clear();
  }
}

module.exports = { TaskStore, COLUMNS, PRIORITIES, CATEGORIES };
