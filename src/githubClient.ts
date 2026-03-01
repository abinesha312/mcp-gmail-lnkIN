/**
 * githubClient.ts
 * GitHub REST API v3 tools — reads credentials from credentialStore.
 * Base URL: https://api.github.com
 * Auth: Authorization: Bearer YOUR_PAT_OR_OAUTH_TOKEN
 * Required header: Accept: application/vnd.github+json
 */
import axios from "axios";
import { getCredential } from "./credentialStore.js";

const BASE_URL = "https://api.github.com";

function getHeaders(): Record<string, string> {
  const token = getCredential("github", "access_token");
  if (!token) throw new Error("GitHub not configured. Open the dashboard → GitHub → Configure.");
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

async function githubRequest(method: string, endpoint: string, data?: any, params?: any): Promise<any> {
  const config: any = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: getHeaders(),
  };
  if (params) config.params = params;
  if (data && method !== "GET") config.data = data;
  const res = await axios(config);
  return res.data;
}

// ── Repos ────────────────────────────────────────────────────────────────────────
export async function githubGetUserRepos(args: {
  type?: "all" | "owner" | "member";
  sort?: "created" | "updated" | "pushed" | "full_name";
  direction?: "asc" | "desc";
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.type) params.type = args.type;
  if (args.sort) params.sort = args.sort;
  if (args.direction) params.direction = args.direction;
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", "/user/repos", undefined, params);
}

export async function githubGetRepo(args: {
  owner: string;
  repo: string;
}): Promise<any> {
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}`);
}

export async function githubCreateRepo(args: {
  name: string;
  description?: string;
  private?: boolean;
  hasIssues?: boolean;
  hasProjects?: boolean;
  hasWiki?: boolean;
}): Promise<any> {
  return githubRequest("POST", "/user/repos", {
    name: args.name,
    description: args.description,
    private: args.private || false,
    has_issues: args.hasIssues !== false,
    has_projects: args.hasProjects !== false,
    has_wiki: args.hasWiki !== false,
  });
}

export async function githubUpdateRepo(args: {
  owner: string;
  repo: string;
  name?: string;
  description?: string;
  private?: boolean;
  hasIssues?: boolean;
  hasProjects?: boolean;
  hasWiki?: boolean;
}): Promise<any> {
  return githubRequest("PATCH", `/repos/${args.owner}/${args.repo}`, {
    name: args.name,
    description: args.description,
    private: args.private,
    has_issues: args.hasIssues,
    has_projects: args.hasProjects,
    has_wiki: args.hasWiki,
  });
}

export async function githubDeleteRepo(args: {
  owner: string;
  repo: string;
}): Promise<any> {
  return githubRequest("DELETE", `/repos/${args.owner}/${args.repo}`);
}

export async function githubGetRepoLanguages(args: {
  owner: string;
  repo: string;
}): Promise<any> {
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/languages`);
}

export async function githubGetRepoContributors(args: {
  owner: string;
  repo: string;
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/contributors`, undefined, params);
}

export async function githubGetRepoStargazers(args: {
  owner: string;
  repo: string;
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/stargazers`, undefined, params);
}

// ── Contents / Files ─────────────────────────────────────────────────────────────
export async function githubGetFileContents(args: {
  owner: string;
  repo: string;
  path: string;
  ref?: string; // Branch/tag/commit SHA
}): Promise<any> {
  const params: any = {};
  if (args.ref) params.ref = args.ref;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/contents/${args.path}`, undefined, params);
}

export async function githubCreateOrUpdateFile(args: {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string; // Base64 encoded
  branch?: string;
  sha?: string; // Required for updates
}): Promise<any> {
  return githubRequest("PUT", `/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
    message: args.message,
    content: args.content,
    branch: args.branch,
    sha: args.sha,
  });
}

export async function githubDeleteFile(args: {
  owner: string;
  repo: string;
  path: string;
  message: string;
  branch?: string;
  sha: string; // Required - SHA of file to delete
}): Promise<any> {
  return githubRequest("DELETE", `/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
    message: args.message,
    branch: args.branch,
    sha: args.sha,
  });
}

export async function githubGetReadme(args: {
  owner: string;
  repo: string;
  ref?: string;
}): Promise<any> {
  const params: any = {};
  if (args.ref) params.ref = args.ref;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/readme`, undefined, params);
}

// ── Issues ────────────────────────────────────────────────────────────────────────
export async function githubGetIssues(args: {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  labels?: string;
  sort?: "created" | "updated" | "comments";
  direction?: "asc" | "desc";
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.state) params.state = args.state;
  if (args.labels) params.labels = args.labels;
  if (args.sort) params.sort = args.sort;
  if (args.direction) params.direction = args.direction;
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/issues`, undefined, params);
}

export async function githubCreateIssue(args: {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}): Promise<any> {
  return githubRequest("POST", `/repos/${args.owner}/${args.repo}/issues`, {
    title: args.title,
    body: args.body,
    labels: args.labels,
    assignees: args.assignees,
    milestone: args.milestone,
  });
}

export async function githubGetIssue(args: {
  owner: string;
  repo: string;
  issueNumber: number;
}): Promise<any> {
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/issues/${args.issueNumber}`);
}

export async function githubUpdateIssue(args: {
  owner: string;
  repo: string;
  issueNumber: number;
  title?: string;
  body?: string;
  state?: "open" | "closed";
  labels?: string[];
  assignees?: string[];
}): Promise<any> {
  return githubRequest("PATCH", `/repos/${args.owner}/${args.repo}/issues/${args.issueNumber}`, {
    title: args.title,
    body: args.body,
    state: args.state,
    labels: args.labels,
    assignees: args.assignees,
  });
}

export async function githubAddIssueComment(args: {
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
}): Promise<any> {
  return githubRequest("POST", `/repos/${args.owner}/${args.repo}/issues/${args.issueNumber}/comments`, {
    body: args.body,
  });
}

export async function githubGetIssueComments(args: {
  owner: string;
  repo: string;
  issueNumber: number;
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/issues/${args.issueNumber}/comments`, undefined, params);
}

// ── Pull Requests ────────────────────────────────────────────────────────────────
export async function githubGetPullRequests(args: {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  head?: string; // Branch name
  base?: string; // Base branch
  sort?: "created" | "updated" | "popularity" | "long-running";
  direction?: "asc" | "desc";
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.state) params.state = args.state;
  if (args.head) params.head = args.head;
  if (args.base) params.base = args.base;
  if (args.sort) params.sort = args.sort;
  if (args.direction) params.direction = args.direction;
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/pulls`, undefined, params);
}

export async function githubCreatePullRequest(args: {
  owner: string;
  repo: string;
  title: string;
  head: string; // Branch to merge FROM
  base: string; // Branch to merge INTO
  body?: string;
  draft?: boolean;
}): Promise<any> {
  return githubRequest("POST", `/repos/${args.owner}/${args.repo}/pulls`, {
    title: args.title,
    head: args.head,
    base: args.base,
    body: args.body,
    draft: args.draft || false,
  });
}

export async function githubGetPullRequest(args: {
  owner: string;
  repo: string;
  pullNumber: number;
}): Promise<any> {
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/pulls/${args.pullNumber}`);
}

export async function githubUpdatePullRequest(args: {
  owner: string;
  repo: string;
  pullNumber: number;
  title?: string;
  body?: string;
  state?: "open" | "closed";
  base?: string;
}): Promise<any> {
  return githubRequest("PATCH", `/repos/${args.owner}/${args.repo}/pulls/${args.pullNumber}`, {
    title: args.title,
    body: args.body,
    state: args.state,
    base: args.base,
  });
}

export async function githubMergePullRequest(args: {
  owner: string;
  repo: string;
  pullNumber: number;
  commitTitle?: string;
  commitMessage?: string;
  mergeMethod?: "merge" | "squash" | "rebase";
}): Promise<any> {
  return githubRequest("PUT", `/repos/${args.owner}/${args.repo}/pulls/${args.pullNumber}/merge`, {
    commit_title: args.commitTitle,
    commit_message: args.commitMessage,
    merge_method: args.mergeMethod || "merge",
  });
}

// ── Commits / Branches ────────────────────────────────────────────────────────────
export async function githubGetCommits(args: {
  owner: string;
  repo: string;
  sha?: string; // Branch/tag name
  path?: string; // File path
  author?: string;
  since?: string; // ISO 8601
  until?: string; // ISO 8601
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.sha) params.sha = args.sha;
  if (args.path) params.path = args.path;
  if (args.author) params.author = args.author;
  if (args.since) params.since = args.since;
  if (args.until) params.until = args.until;
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/commits`, undefined, params);
}

export async function githubGetCommit(args: {
  owner: string;
  repo: string;
  ref: string; // SHA, branch, or tag
}): Promise<any> {
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/commits/${args.ref}`);
}

export async function githubGetBranches(args: {
  owner: string;
  repo: string;
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/branches`, undefined, params);
}

export async function githubGetBranch(args: {
  owner: string;
  repo: string;
  branch: string;
}): Promise<any> {
  return githubRequest("GET", `/repos/${args.owner}/${args.repo}/branches/${args.branch}`);
}

// ── Users ────────────────────────────────────────────────────────────────────────
export async function githubGetCurrentUser(): Promise<any> {
  return githubRequest("GET", "/user");
}

export async function githubGetUser(args: {
  username: string;
}): Promise<any> {
  return githubRequest("GET", `/users/${args.username}`);
}

export async function githubGetUserStarred(args: {
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", "/user/starred", undefined, params);
}

export async function githubGetUserFollowing(args: {
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", "/user/following", undefined, params);
}

export async function githubGetUserFollowers(args: {
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = {};
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", "/user/followers", undefined, params);
}

// ── Search ────────────────────────────────────────────────────────────────────────
export async function githubSearchRepositories(args: {
  query: string;
  sort?: "stars" | "forks" | "help-wanted-issues" | "updated";
  order?: "desc" | "asc";
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = { q: args.query };
  if (args.sort) params.sort = args.sort;
  if (args.order) params.order = args.order;
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", "/search/repositories", undefined, params);
}

export async function githubSearchIssues(args: {
  query: string;
  sort?: "comments" | "reactions" | "interactions" | "created" | "updated";
  order?: "desc" | "asc";
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = { q: args.query };
  if (args.sort) params.sort = args.sort;
  if (args.order) params.order = args.order;
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", "/search/issues", undefined, params);
}

export async function githubSearchCode(args: {
  query: string;
  sort?: "indexed";
  order?: "desc" | "asc";
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = { q: args.query };
  if (args.sort) params.sort = args.sort;
  if (args.order) params.order = args.order;
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", "/search/code", undefined, params);
}

export async function githubSearchUsers(args: {
  query: string;
  sort?: "followers" | "repositories" | "joined";
  order?: "desc" | "asc";
  perPage?: number;
  page?: number;
}): Promise<any> {
  const params: any = { q: args.query };
  if (args.sort) params.sort = args.sort;
  if (args.order) params.order = args.order;
  if (args.perPage) params.per_page = args.perPage;
  if (args.page) params.page = args.page;
  return githubRequest("GET", "/search/users", undefined, params);
}
