import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test, expect, vi } from "vitest";
import KanbanBoard from "../../components/KanbanBoard.jsx";
import { createMockSocket } from "../mockSocket";

const sampleTasks = [
  {
    id: "task-1",
    title: "Fix login bug",
    description: "Users get logged out randomly",
    priority: "high",
    category: "bug",
    column: "todo",
    attachment: null,
    order: 0,
  },
  {
    id: "task-2",
    title: "Add dark mode",
    description: "",
    priority: "low",
    category: "feature",
    column: "in-progress",
    attachment: null,
    order: 0,
  },
];

function renderBoard(socket = createMockSocket()) {
  render(<KanbanBoard socketFactory={() => socket} />);
  return socket;
}

test("renders Kanban board title", () => {
  renderBoard();
  expect(screen.getByText("Kanban Board")).toBeInTheDocument();
});

test("shows a loading state until the initial sync:tasks arrives", () => {
  renderBoard();
  expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
});

test("renders tasks into their respective columns after sync", () => {
  const socket = renderBoard();
  socket.__trigger("sync:tasks", sampleTasks);

  const todoColumn = screen.getByTestId("column-todo");
  const inProgressColumn = screen.getByTestId("column-in-progress");

  expect(within(todoColumn).getByText("Fix login bug")).toBeInTheDocument();
  expect(within(inProgressColumn).getByText("Add dark mode")).toBeInTheDocument();
});

test("shows the live connection indicator once connected", () => {
  const socket = renderBoard();
  socket.__trigger("sync:tasks", []);
  socket.__trigger("connect");

  expect(screen.getByTestId("connection-status")).toHaveTextContent("Live");
});

test("submitting the task form emits task:create with the entered values", async () => {
  const user = userEvent.setup();
  const socket = renderBoard();
  socket.__trigger("sync:tasks", []);

  await user.type(screen.getByLabelText("Task title"), "Write README");
  await user.selectOptions(screen.getByLabelText("Task priority"), "high");
  await user.click(screen.getByRole("button", { name: /add task/i }));

  expect(socket.emit).toHaveBeenCalledWith(
    "task:create",
    expect.objectContaining({ title: "Write README", priority: "high" }),
    expect.any(Function)
  );
});

test("clicking delete on a task emits task:delete with its id", async () => {
  const user = userEvent.setup();
  const socket = renderBoard();
  socket.__trigger("sync:tasks", sampleTasks);

  await user.click(screen.getByLabelText("Delete Fix login bug"));

  expect(socket.emit).toHaveBeenCalledWith(
    "task:delete",
    { id: "task-1" },
    expect.any(Function)
  );
});

test("displays the completion percentage based on tasks in Done", () => {
  const socket = renderBoard();
  socket.__trigger("sync:tasks", [
    { ...sampleTasks[0], column: "done", order: 0 },
    { ...sampleTasks[1], column: "todo", order: 0 },
  ]);

  expect(screen.getByTestId("completion-percent")).toHaveTextContent("50% complete");
});
