import { Draggable } from "@hello-pangea/dnd";
import { isImageAttachment } from "../utils/taskHelpers";

const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };
const CATEGORY_LABELS = { bug: "Bug", feature: "Feature", enhancement: "Enhancement" };

function TaskCard({ task, index, onDelete }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          data-testid={`task-card-${task.id}`}
          className={`task-card priority-${task.priority}${
            snapshot.isDragging ? " task-card--dragging" : ""
          }`}
        >
          <div className="task-card__header">
            <h4 className="task-card__title">{task.title}</h4>
            <button
              type="button"
              aria-label={`Delete ${task.title}`}
              className="task-card__delete"
              onClick={() => onDelete(task.id)}
            >
              ×
            </button>
          </div>

          {task.description && <p className="task-card__description">{task.description}</p>}

          <div className="task-card__badges">
            <span className={`badge badge--priority-${task.priority}`}>
              {PRIORITY_LABELS[task.priority] || task.priority}
            </span>
            <span className="badge badge--category">
              {CATEGORY_LABELS[task.category] || task.category}
            </span>
          </div>

          {task.attachment && (
            <div className="task-card__attachment">
              {isImageAttachment(task.attachment) ? (
                <img
                  src={task.attachment.url}
                  alt={task.attachment.name}
                  className="task-card__attachment-preview"
                />
              ) : (
                <a
                  href={task.attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="task-card__attachment-link"
                >
                  📎 {task.attachment.name}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default TaskCard;
