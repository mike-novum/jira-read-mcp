export interface JiraUser {
  displayName?: string;
  name?: string;
  emailAddress?: string;
}

export interface JiraIssueRef {
  key: string;
  fields?: {
    summary?: string;
    issuetype?: { name?: string } | null;
  };
}

export interface JiraIssueLink {
  type?: {
    name?: string;
    inward?: string;
    outward?: string;
  };
  inwardIssue?: JiraIssueRef;
  outwardIssue?: JiraIssueRef;
}

export interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    description?: unknown;
    status?: { name?: string } | null;
    assignee?: JiraUser | null;
    reporter?: JiraUser | null;
    parent?: JiraIssueRef | null;
    issuelinks?: JiraIssueLink[];
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

export interface TaskParent {
  key: string;
  summary: string;
  issue_type: string;
}

export interface TaskLink {
  relation: string;
  key: string;
  summary: string;
  issue_type: string;
}

export interface TaskView {
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee: string;
  reporter: string;
  parent: TaskParent | null;
  links: TaskLink[];
  comments: TaskComment[];
  total_comments: number;
  truncated: boolean;
  truncation_message?: string;
}
