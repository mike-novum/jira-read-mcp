import { CHARACTER_LIMIT } from "../constants.js";
import type { JiraUser, TaskComment, TaskView } from "../types.js";

const BLOCK_TYPES = new Set([
  "doc",
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
  "bulletList",
  "orderedList",
]);

export function formatUser(user: JiraUser | null | undefined, emptyLabel: string): string {
  if (!user) {
    return emptyLabel;
  }

  return user.displayName || user.name || user.emailAddress || emptyLabel;
}

export function toPlainText(value: unknown): string {
  return flattenNode(value).trim();
}

export function formatCreated(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!match) {
    return value;
  }

  return `${match[1]} ${match[2]}`;
}

export function renderTask(task: TaskView): string {
  const lines = [
    `# ${task.key}`,
    "",
    `**Название:** ${task.summary || "без названия"}`,
    `**Статус:** ${task.status}`,
    `**Исполнитель:** ${task.assignee}`,
    `**Автор:** ${task.reporter}`,
    "",
    "## Описание",
    "",
    task.description || "Описание отсутствует",
    "",
    "## Комментарии",
    "",
  ];

  if (task.comments.length === 0) {
    lines.push("Комментариев нет");
  } else {
    task.comments.forEach((comment, index) => {
      lines.push(...renderComment(comment));
      if (index < task.comments.length - 1) {
        lines.push("");
      }
    });
  }

  if (task.truncation_message) {
    lines.push("", task.truncation_message);
  }

  return lines.join("\n");
}

export function limitTask(task: TaskView): TaskView {
  let view = applyMessage({ ...task, comments: [...task.comments] }, task);

  while (view.comments.length > 0 && renderTask(view).length > CHARACTER_LIMIT) {
    view = applyMessage(
      {
        ...view,
        comments: view.comments.slice(0, -1),
        truncated: true,
      },
      task,
    );
  }

  while (renderTask(view).length > CHARACTER_LIMIT && view.description.length > 0) {
    const overflow = renderTask(view).length - CHARACTER_LIMIT;
    const nextLength = Math.max(0, view.description.length - overflow);
    if (nextLength === view.description.length) {
      break;
    }

    view = applyMessage(
      {
        ...view,
        description: view.description.slice(0, nextLength),
        truncated: true,
      },
      task,
    );
  }

  return view;
}

function applyMessage(view: TaskView, source: TaskView): TaskView {
  if (!view.truncated) {
    return { ...view, truncation_message: undefined };
  }

  const shown = view.comments.length;
  const omitted = source.total_comments - shown;
  return {
    ...view,
    truncation_message:
      omitted > 0
        ? `Ответ обрезан: показано ${shown} из ${source.total_comments} комментариев. Уточни задачу, если нужны остальные.`
        : "Ответ обрезан по лимиту длины.",
  };
}

function renderComment(comment: TaskComment): string[] {
  const created = comment.created ? ` (${comment.created})` : "";
  return [`### ${comment.author}${created}`, "", comment.body || "Пустой комментарий"];
}

function flattenNode(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenNode(item)).join("");
  }

  const node = value as { type?: unknown; text?: unknown; content?: unknown };
  const own = typeof node.text === "string" ? node.text : "";
  const inner = Array.isArray(node.content) ? node.content.map((item) => flattenNode(item)).join("") : "";
  const combined = `${own}${inner}`;

  if (typeof node.type === "string" && BLOCK_TYPES.has(node.type)) {
    return combined.trim() ? `${combined.trim()}\n` : "";
  }

  return combined;
}
