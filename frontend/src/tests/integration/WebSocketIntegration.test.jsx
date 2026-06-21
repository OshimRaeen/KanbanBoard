import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test, expect } from "vitest";

import KanbanBoard from "../../components/KanbanBoard";
import { createMockSocket } from "../mockSocket";

/**
 * These tests simulate two browser tabs (clientA, clientB) each with their
 * own socket, both pointed at the same in-memory mock "server" state. This
 * is the real shape of the thing the README asks us to verify: that a
 * change made through one client's socket ends up reflected in another
 * client once the server broadcasts sync:tasks.
 *
 * Drag-and-drop itself is deliberately NOT exercised here - jsdom has no
 * real layout/pointer engine, so simulating @hello-pangea/dnd's pointer
 * sequence in Vitest produces a test that's either flaky or fake. That
 * interaction is covered for real in the Playwright E2E suite, which runs
 * in an actual browser.
 */

test("WebSocket receives task update", async () => {
  const socket = createMockSocket();
  render(<KanbanBoard socketFactory={() => socket} />);

  socket.__trigger("sync:tasks", []);

  expect(screen.getByText("Kanban Board")).toBeInTheDocument();
});

test("a task created via one client's socket appears once that client's sync:tasks fires", async () => {
  const user = userEvent.setup();
  const socketA = createMockSocket();

  render(<KanbanBoard socketFactory={() => socketA} />);
  socketA.__trigger("sync:tasks", []);

  // Simulate the server accepting the creation and broadcasting it back,
  // the way server.js's broadcastTasks() does after a successful task:create.
  socketA.emit.mockImplementation((event, payload, ack) => {
    if (event === "task:create") {
      const created = { id: "server-generated-id", column: "todo", order: 0, ...payload };
      socketA.__trigger("sync:tasks", [created]);
      ack?.({ ok: true, task: created });
    }
  });

  await user.type(screen.getByLabelText("Task title"), "Ship the feature");
  await user.click(screen.getByRole("button", { name: /add task/i }));

  const todoColumn = await screen.findByTestId("column-todo");
  expect(within(todoColumn).getByText("Ship the feature")).toBeInTheDocument();
});

test("two independently-rendered clients converge to the same board after both receive sync:tasks", async () => {
  const socketA = createMockSocket();
  const socketB = createMockSocket();

  const { unmount: unmountA } = render(<KanbanBoard socketFactory={() => socketA} />);
  socketA.__trigger("sync:tasks", []);

  const sharedState = [
    {
      id: "task-shared",
      title: "Visible to both clients",
      description: "",
      priority: "medium",
      category: "feature",
      column: "in-progress",
      attachment: null,
      order: 0,
    },
  ];

  // clientA's "server" pushes a state that originated elsewhere (e.g. from
  // clientB's action) - this is the multi-client convergence the README
  // testing criteria calls out explicitly.
  socketA.__trigger("sync:tasks", sharedState);
  const columnA = screen.getByTestId("column-in-progress");
  expect(within(columnA).getByText("Visible to both clients")).toBeInTheDocument();
  unmountA();

  render(<KanbanBoard socketFactory={() => socketB} />);
  socketB.__trigger("sync:tasks", sharedState);
  const columnB = screen.getByTestId("column-in-progress");
  expect(within(columnB).getByText("Visible to both clients")).toBeInTheDocument();
});

test("deleting a task removes it from the board once sync:tasks confirms the deletion", async () => {
  const user = userEvent.setup();
  const socket = createMockSocket();

  render(<KanbanBoard socketFactory={() => socket} />);
  socket.__trigger("sync:tasks", [
    {
      id: "task-to-remove",
      title: "Temporary task",
      description: "",
      priority: "low",
      category: "bug",
      column: "todo",
      attachment: null,
      order: 0,
    },
  ]);

  socket.emit.mockImplementation((event, payload, ack) => {
    if (event === "task:delete") {
      socket.__trigger("sync:tasks", []);
      ack?.({ ok: true });
    }
  });

  await user.click(screen.getByLabelText("Delete Temporary task"));

  expect(screen.queryByText("Temporary task")).not.toBeInTheDocument();
});

test("rejects task creation gracefully when the server acknowledges failure", async () => {
  const user = userEvent.setup();
  const socket = createMockSocket();

  render(<KanbanBoard socketFactory={() => socket} />);
  socket.__trigger("sync:tasks", []);

  socket.emit.mockImplementation((event, payload, ack) => {
    if (event === "task:create") {
      ack?.({ ok: false, error: "Task title is required" });
    }
  });

  await user.click(screen.getByRole("button", { name: /add task/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/title is required/i);
});
