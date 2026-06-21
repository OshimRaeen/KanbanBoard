import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";

function Column({ id, label, tasks, onDelete }) {
  return (
    <div className="column" data-testid={`column-${id}`}>
      <div className="column__header">
        <h3>{label}</h3>
        <span className="column__count">{tasks.length}</span>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column__list${snapshot.isDraggingOver ? " column__list--over" : ""}`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onDelete={onDelete} />
            ))}
            {provided.placeholder}
            {tasks.length === 0 && <p className="column__empty">No tasks yet</p>}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default Column;
