export interface JiraUser {
  displayName?: string;
  name?: string;
  emailAddress?: string;
}

export interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    description?: unknown;
    status?: { name?: string } | null;
    assignee?: JiraUser | null;
    reporter?: JiraUser | null;
  };
}

export interface JiraComment {
  author?: JiraUser | null;
  body?: unknown;
  created?: string;
}

export interface JiraCommentPage {
  startAt: number;
  maxResults: number;
  total: number;
  comments: JiraComment[];
}

export interface TaskComment {
  author: string;
  created: string;
  body: string;
}

export interface TaskView {
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee: string;
  reporter: string;
  comments: TaskComment[];
  total_comments: number;
  truncated: boolean;
  truncation_message?: string;
}
