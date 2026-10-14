import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MAX_COMMENTS } from "../constants.js";
import type { JiraConfig } from "../config.js";
import { readTaskInputSchema, readTaskOutputSchema, type ReadTaskInput, type ReadTaskOutput } from "../schemas/read-task.js";
import { formatCreated, formatUser, limitTask, renderTask, toPlainText } from "../services/format-task.js";
import { JiraApiError, JiraClient } from "../services/jira-client.js";
import type { JiraComment, JiraIssue, TaskView } from "../types.js";

export function registerReadTask(server: McpServer, config: JiraConfig): void {
  const client = new JiraClient(config);

  server.registerTool(
    "read_task",
    {
      title: "Прочитать задачу Jira",
      description: `Читает задачу Jira по ключу.

Возвращает название, описание, статус, исполнителя, автора и комментарии.
Используй для ключей вида JIRA-ХХХХ или подобные.

Args:
  - issue_key (string): ключ задачи

Returns:
  Текст задачи и структурированные поля key, summary, description, status, assignee, reporter, comments.
  Если комментариев больше ${MAX_COMMENTS} или ответ длиннее лимита, лишняя часть отрезается и truncated=true.`,
      inputSchema: readTaskInputSchema,
      outputSchema: readTaskOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args: ReadTaskInput) => {
      try {
        const issueKey = args.issue_key.toUpperCase();
        const issue = await client.getIssue(issueKey);
        const commentPage = await client.listComments(issueKey);
        const task = limitTask(toTaskView(issue.key || issueKey, issue.fields, commentPage.comments, commentPage.total));
        const structured = toOutput(task);

        return {
          content: [{ type: "text" as const, text: renderTask(task) }],
          structuredContent: structured,
        };
      } catch (error) {
        const message = error instanceof JiraApiError
          ? error.message
          : `Не удалось прочитать задачу: ${error instanceof Error ? error.message : String(error)}`;

        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    },
  );
}

function toTaskView(key: string, fields: JiraIssue["fields"], comments: JiraComment[], total: number): TaskView {
  return {
    key,
    summary: fields.summary?.trim() || "",
    description: toPlainText(fields.description),
    status: fields.status?.name?.trim() || "не указан",
    assignee: formatUser(fields.assignee, "не назначен"),
    reporter: formatUser(fields.reporter, "не указан"),
    comments: comments.map((comment) => ({
      author: formatUser(comment.author, "неизвестен"),
      created: formatCreated(comment.created),
      body: toPlainText(comment.body),
    })),
    total_comments: total,
    truncated: total > comments.length,
  };
}

function toOutput(task: TaskView): ReadTaskOutput {
  const output: ReadTaskOutput = {
    key: task.key,
    summary: task.summary,
    description: task.description,
    status: task.status,
    assignee: task.assignee,
    reporter: task.reporter,
    comments: task.comments,
    total_comments: task.total_comments,
    truncated: task.truncated,
  };

  if (task.truncation_message) {
    output.truncation_message = task.truncation_message;
  }

  return output;
}
