import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MAX_COMMENTS } from "../constants.js";
import type { JiraConfig } from "../config.js";
import { readTaskInputSchema, readTaskOutputSchema, type ReadTaskInput, type ReadTaskOutput } from "../schemas/read-task.js";
import { formatCreated, formatUser, limitTask, renderTask, toPlainText } from "../services/format-task.js";
import { JiraApiError, JiraClient } from "../services/jira-client.js";
import type { JiraComment, JiraIssue, JiraIssueLink, JiraIssueRef, TaskLink, TaskParent, TaskView } from "../types.js";

export function registerReadTask(server: McpServer, config: JiraConfig): void {
  const client = new JiraClient(config);

  server.registerTool(
    "read_task",
    {
      title: "Прочитать задачу Jira",
      description: `Читает задачу Jira по ключу.

Возвращает название, описание, статус, исполнителя, автора, родителя, связи и комментарии.
Родитель содержит ключ, название и тип задачи: Epic, Story, Spike или другое имя типа в Jira.
Связи содержат направление, ключ, название и тип связанной задачи.
Используй для ключей вида JIRA-ХХХХ или подобные.

Args:
  - issue_key (string): ключ задачи

Returns:
  Текст задачи и структурированные поля key, summary, description, status, assignee, reporter, parent, links, comments.
  parent равен null, если родителя нет. links — пустой массив, если связей нет.
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
    parent: toParent(fields.parent),
    links: toLinks(fields.issuelinks),
    comments: comments.map((comment) => ({
      author: formatUser(comment.author, "неизвестен"),
      created: formatCreated(comment.created),
      body: toPlainText(comment.body),
    })),
    total_comments: total,
    truncated: total > comments.length,
  };
}

function toParent(parent: JiraIssueRef | null | undefined): TaskParent | null {
  const key = parent?.key?.trim();
  if (!key) {
    return null;
  }

  return {
    key,
    summary: parent?.fields?.summary?.trim() || "",
    issue_type: parent?.fields?.issuetype?.name?.trim() || "не указан",
  };
}

function toLinks(links: JiraIssueLink[] | undefined): TaskLink[] {
  if (!links) {
    return [];
  }

  const result: TaskLink[] = [];
  for (const link of links) {
    const outward = toLinkedIssue(link.outwardIssue, link.type?.outward || link.type?.name);
    if (outward) {
      result.push(outward);
    }

    const inward = toLinkedIssue(link.inwardIssue, link.type?.inward || link.type?.name);
    if (inward) {
      result.push(inward);
    }
  }

  return result;
}

function toLinkedIssue(issue: JiraIssueRef | undefined, relation: string | undefined): TaskLink | null {
  const key = issue?.key?.trim();
  if (!key) {
    return null;
  }

  return {
    relation: relation?.trim() || "связана с",
    key,
    summary: issue?.fields?.summary?.trim() || "",
    issue_type: issue?.fields?.issuetype?.name?.trim() || "не указан",
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
    parent: task.parent,
    links: task.links,
    comments: task.comments,
    total_comments: task.total_comments,
    truncated: task.truncated,
  };

  if (task.truncation_message) {
    output.truncation_message = task.truncation_message;
  }

  return output;
}
