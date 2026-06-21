import { DragDropContext } from "@hello-pangea/dnd";
import { useTasks } from "../hooks/useTasks";
import { COLUMNS, groupTasksByColumn } from "../utils/taskHelpers";
import Column from "./Column";
import TaskForm from "./TaskForm";
import ProgressChart from "./ProgressChart";

function KanbanBoard({ socketFactory } = {}) {
  const { tasks, connected, isSyncing, createTask, moveTask, deleteTask } = useTasks(
    socketFactory
  );

  const grouped = groupTasksByColumn(tasks);

  async function handleDragEnd(result) {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    try {
      await moveTask(draggableId, destination.droppableId, destination.index);
    } catch (err) {
      // The server is the source of truth - if the move is rejected, the
      // next sync:tasks broadcast will snap the board back to the real
      // state, so we just log here rather than manage a separate error UI.
      console.error("Failed to move task:", err.message);
    }
  }

  async function handleDelete(taskId) {
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error("Failed to delete task:", err.message);
    }
  }

  async function handleCreate(payload) {
    await createTask(payload);
  }

  return (
    <div className="kanban-board">
      <div className="kanban-board__toolbar">
        <h2>Kanban Board</h2>
        <span
          data-testid="connection-status"
          className={`connection-status connection-status--${connected ? "online" : "offline"}`}
        >
          {connected ? "● Live" : "○ Connecting…"}
        </span>
      </div>

      <TaskForm onCreate={handleCreate} />

      {isSyncing ? (
        <p className="kanban-board__loading" role="status">
          Loading tasks…
        </p>
      ) : (
        <>
          <ProgressChart tasks={tasks} />

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board__columns">
              {COLUMNS.map((column) => (
                <Column
                  key={column.id}
                  id={column.id}
                  label={column.label}
                  tasks={grouped[column.id]}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </DragDropContext>
        </>
      )}
    </div>
  );
}

export default KanbanBoard;
