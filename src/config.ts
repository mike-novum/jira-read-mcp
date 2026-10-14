export interface JiraConfig {
  baseUrl: string;
  token: string;
}

export function loadConfig(): JiraConfig {
  const rawUrl = process.env.JIRA_BASE_URL?.trim();
  const token = process.env.JIRA_TOKEN?.trim();

  if (!rawUrl) {
    throw new Error("Не задан JIRA_BASE_URL.");
  }

  if (!token) {
    throw new Error("Не задан JIRA_TOKEN.");
  }

  let baseUrl = rawUrl.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("JIRA_BASE_URL должен быть корректным URL, например https://tracker.mycompany.ru");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("JIRA_BASE_URL должен начинаться с http:// или https://");
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  return {
    baseUrl: `${parsed.origin}${pathname}`,
    token,
  };
}
