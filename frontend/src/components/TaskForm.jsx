import { useState } from "react";
import { PRIORITIES, CATEGORIES, validateAttachment } from "../utils/taskHelpers";

const initialFormState = {
  title: "",
  description: "",
  priority: "medium",
  category: "feature",
};

function TaskForm({ onCreate }) {
  const [form, setForm] = useState(initialFormState);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFieldChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    const error = validateAttachment(selected);

    if (error) {
      setFileError(error);
      setFile(null);
      event.target.value = "";
      return;
    }

    setFileError(null);
    setFile(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setSubmitError("Title is required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let attachment = null;
      if (file) {
        // The README specifies "simulated backend storage" for attachments -
        // we create a local object URL so the preview works without
        // needing real file upload infrastructure for this assignment.
        attachment = { name: file.name, type: file.type, url: URL.createObjectURL(file) };
      }

      await onCreate({ ...form, attachment });

      setForm(initialFormState);
      setFile(null);
      setFileError(null);
    } catch (err) {
      setSubmitError(err.message || "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} aria-label="Create task">
      <input
        type="text"
        placeholder="Task title"
        value={form.title}
        onChange={handleFieldChange("title")}
        aria-label="Task title"
        className="task-form__title"
      />

      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={handleFieldChange("description")}
        aria-label="Task description"
        className="task-form__description"
      />

      <div className="task-form__row">
        <label className="task-form__field">
          Priority
          <select
            value={form.priority}
            onChange={handleFieldChange("priority")}
            aria-label="Task priority"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="task-form__field">
          Category
          <select
            value={form.category}
            onChange={handleFieldChange("category")}
            aria-label="Task category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="task-form__field">
        Attachment
        <input type="file" onChange={handleFileChange} aria-label="Task attachment" />
      </label>
      {fileError && (
        <p role="alert" className="task-form__error">
          {fileError}
        </p>
      )}

      {submitError && (
        <p role="alert" className="task-form__error">
          {submitError}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="task-form__submit">
        {isSubmitting ? "Adding…" : "Add Task"}
      </button>
    </form>
  );
}

export default TaskForm;
