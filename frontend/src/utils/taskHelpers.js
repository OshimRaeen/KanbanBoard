export const COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

export const PRIORITIES = ["low", "medium", "high"];
export const CATEGORIES = ["bug", "feature", "enhancement"];

const ACCEPTED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Groups a flat task list into a { [columnId]: Task[] } map, sorted by
 * each task's `order` field. Kept as a pure function (no component, no
 * hooks) so it's cheap to unit test and reuse from both the board and
 * the progress chart.
 */
export function groupTasksByColumn(tasks) {
  const grouped = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));

  for (const task of tasks) {
    if (!grouped[task.column]) {
      grouped[task.column] = [];
    }
    grouped[task.column].push(task);
  }

  for (const columnId of Object.keys(grouped)) {
    grouped[columnId].sort((a, b) => a.order - b.order);
  }

  return grouped;
}

/**
 * Computes the data the progress chart needs: a count per column plus a
 * completion percentage. Separated from the chart component so it can be
 * unit tested without rendering anything.
 */
export function computeProgressStats(tasks) {
  const grouped = groupTasksByColumn(tasks);
  const total = tasks.length;
  const doneCount = grouped.done.length;

  return {
    total,
    completionPercent: total === 0 ? 0 : Math.round((doneCount / total) * 100),
    byColumn: COLUMNS.map((c) => ({
      column: c.id,
      label: c.label,
      count: grouped[c.id].length,
    })),
  };
}

/**
 * Validates a File before we let it become a task attachment. Returns
 * null if valid, or a human-readable error string if not.
 */
export function validateAttachment(file) {
  if (!file) return null;

  if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
    return "Unsupported file type. Please upload an image (PNG, JPEG, GIF, WebP) or a PDF.";
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "File is too large. Maximum size is 5MB.";
  }

  return null;
}

export function isImageAttachment(attachment) {
  return Boolean(attachment && attachment.type && attachment.type.startsWith("image/"));
}
