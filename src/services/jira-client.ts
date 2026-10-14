import { z } from "zod";
import type { JiraConfig } from "../config.js";
import { COMMENT_PAGE_SIZE, MAX_COMMENTS, REQUEST_TIMEOUT_MS } from "../constants.js";
import type { JiraComment, JiraCommentPage, JiraIssue } from "../types.js";

const userSchema = z
  .object({
    displayName: z.string().optional(),
    name: z.string().optional(),
    emailAddress: z.string().optional(),
  })
  .passthrough();

const issueSchema = z
  .object({
    key: z.string(),
    fields: z
      .object({
        summary: z.string().optional(),
        description: z.unknown().optional(),
        status: z
          .object({
            name: z.string().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        assignee: userSchema.nullable().optional(),
        reporter: userSchema.nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const commentSchema = z
  .object({
    author: userSchema.nullable().optional(),
    body: z.unknown().optional(),
    created: z.string().optional(),
  })
  .passthrough();

const commentPageSchema = z
  .object({
    startAt: z.number(),
    maxResults: z.number(),
    total: z.number(),
    comments: z.array(commentSchema),
  })
  .passthrough();

export class JiraApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "JiraApiError";
    this.status = status;
  }
}

export class JiraClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: JiraConfig) {
    this.baseUrl = config.baseUrl;
    this.token = config.token;
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request(
      `/rest/api/2/issue/${encodeURIComponent(issueKey)}?fields=summary,description,status,assignee,reporter`,
      issueSchema,
      issueKey,
    );
  }

  async listComments(issueKey: string): Promise<{ comments: JiraComment[]; total: number }> {
    const collected: JiraComment[] = [];
    let startAt = 0;
    let total = 0;

    do {
      const page = await this.request<JiraCommentPage>(
        `/rest/api/2/issue/${encodeURIComponent(issueKey)}/comment?startAt=${startAt}&maxResults=${COMMENT_PAGE_SIZE}`,
        commentPageSchema,
        issueKey,
      );
      total = page.total;
      collected.push(...page.comments);
      if (page.comments.length === 0) {
        break;
      }
      startAt += page.comments.length;
    } while (startAt < total && collected.length < MAX_COMMENTS);

    return {
      comments: collected.slice(0, MAX_COMMENTS),
      total,
    };
  }

  private async request<T>(path: string, schema: z.ZodType<T>, issueKey: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new JiraApiError("Jira не ответила за 30 секунд. Повтори запрос.");
      }
      throw new JiraApiError(`Не удалось подключиться к Jira: ${connectionMessage(error)}`);
    }

    const body = await response.text();
    if (!response.ok) {
      throw new JiraApiError(messageForStatus(response.status, body, issueKey), response.status);
    }

    let json: unknown;
    try {
      json = body ? JSON.parse(body) : {};
    } catch {
      throw new JiraApiError("Jira вернула ответ не в формате JSON.");
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new JiraApiError("Jira вернула ответ в неожиданном формате.");
    }

    return parsed.data;
  }
}

function connectionMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.cause instanceof Error && error.cause.message) {
      return error.cause.message;
    }
    return error.message;
  }
  return String(error);
}

function messageForStatus(status: number, body: string, issueKey: string): string {
  const apiMessage = extractErrorMessage(body);
  const suffix = apiMessage ? ` ${apiMessage}` : "";

  switch (status) {
    case 401:
      return "Ошибка авторизации (401). Проверь JIRA_TOKEN.";
    case 403:
      return `Нет доступа к задаче ${issueKey} (403).${suffix}`;
    case 404:
      return `Задача ${issueKey} не найдена. Проверь ключ.`;
    case 429:
      return "Слишком много запросов к Jira (429). Подожди и повтори.";
    default:
      return `Запрос к Jira завершился с кодом ${status}.${suffix}`;
  }
}

function extractErrorMessage(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object") {
      return "";
    }

    const record = parsed as { errorMessages?: unknown; errors?: unknown };
    const messages: string[] = [];

    if (Array.isArray(record.errorMessages)) {
      for (const item of record.errorMessages) {
        if (typeof item === "string") {
          messages.push(item);
        }
      }
    }

    if (record.errors && typeof record.errors === "object") {
      for (const value of Object.values(record.errors)) {
        if (typeof value === "string") {
          messages.push(value);
        }
      }
    }

    return messages.join(" ").slice(0, 300);
  } catch {
    return "";
  }
}
