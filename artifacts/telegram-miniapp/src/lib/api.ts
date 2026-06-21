const API_BASE = import.meta.env.VITE_API_URL ?? "";

function twaHeaders(): Record<string, string> {
  const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData ?? "";
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (initData) h["X-Telegram-Init-Data"] = initData;
  return h;
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}/api/twa${path}`, { headers: twaHeaders() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}/api/twa${path}`, {
    method: "POST",
    headers: twaHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}/api/twa${path}`, {
    method: "PUT",
    headers: twaHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function del(path: string): Promise<void> {
  await fetch(`${API_BASE}/api/twa${path}`, { method: "DELETE", headers: twaHeaders() });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Campaign {
  id: number;
  name: string;
  text_template: string;
  status: string;
  sent_count: number;
  failed_count: number;
  target_count: number;
  created_at: string;
  started_at?: string;
  scheduled_at?: string;
  notes?: string;
  dry_run?: number;
  send_delay_seconds?: number;
  sender_account_id?: number | null;
  scheduled_tag?: string | null;
  ab_text_b?: string | null;
}

export interface GroupCampaign {
  id: number;
  name: string;
  text_template: string;
  status: string;
  sender_account_id?: number;
  selected_groups: string;
  interval_seconds: number;
  next_send_at?: string;
  last_sent_at?: string;
  sent_count: number;
  failed_count: number;
  notes?: string;
  media_url?: string;
  media_type?: string;
  inline_buttons?: string;
  pin_message?: number;
  min_delay_seconds?: number;
  max_delay_seconds?: number;
  daily_limit?: number;
  created_at: string;
  updated_at: string;
}

export interface GroupCampaignLog {
  id: number;
  campaign_id: number;
  group_id: string;
  group_title?: string;
  account_id?: number;
  account_phone?: string;
  account_label?: string;
  task_id?: number;
  status: string;
  error?: string;
  sent_at: string;
}

export interface WorkerCrashEvent {
  id: number;
  worker_id: string;
  crashed_at: string;
  restart_num: number;
  error?: string;
}

export interface AccountGroup {
  id: number;
  account_id: number;
  group_id: string;
  group_title?: string;
  group_type?: string;
  member_count?: number;
  username?: string;
  is_active: number;
  refreshed_at: string;
}

export interface GroupSendStat {
  group_id: string;
  group_title?: string;
  total: number;
  sent: number;
  failed: number;
  last_sent_at?: string;
}

export interface DailyStat {
  day: string;
  sent: number;
  failed: number;
}

export interface SenderAccount {
  id: number;
  phone: string;
  label: string;
  username?: string;
  api_id?: number;
  api_hash?: string;
  session_file?: string;
  proxy?: string;
  proxies?: string;
  auth_status?: string;
  status: string;
  flood_wait_until?: string;
  daily_limit: number;
  is_active: number;
  is_banned: number;
  sent_today: number;
  sent_total: number;
  failed_total: number;
  last_used_at?: string;
  last_error?: string;
  /** Worker currently holding this account's lock (null = free) */
  locked_by?: string | null;
  /** ISO-8601 timestamp when the lock was acquired */
  locked_at?: string | null;
  /** Persisted proxy rotation index */
  proxy_index?: number;
  /** 1 while actively broadcasting */
  broadcasting?: number;
}

export interface WorkerHeartbeat {
  worker_id: string;
  last_seen: string;
  status: string;
  tasks_completed: number;
  tasks_failed: number;
  age_seconds?: number;
  is_alive?: boolean;
}

export interface RecoverLocksResult {
  ok: boolean;
  released_accounts: number;
  reset_tasks: number;
  stale: { id: number; phone: string; locked_by: string }[];
}

export interface AnalyticsOverview {
  totalSent: number;
  totalUsers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  avgOpenRate: number;
  avgCtr: number;
  avgBounceRate: number;
  sentDelta: number;
  openDelta: number;
  ctrDelta: number;
}

export interface User {
  chat_id: number;
  username?: string;
  first_name?: string;
  tags?: string;
}

export interface SendLog {
  id: number;
  campaign_id: number;
  chat_id: number;
  account_id: number;
  status: string;
  sent_at: string;
  error?: string;
  username?: string;
  first_name?: string;
  campaign_name?: string;
}

export interface AccountBreakdown {
  id: number;
  label: string;
  phone: string;
  username?: string;
  total: number;
  ok: number;
  errors: number;
}

export interface BroadcastWorker {
  worker_id: string;
  pid?: number;
  status: string;
  current_task?: number;
  tasks_done: number;
  tasks_failed: number;
  started_at: string;
  last_heartbeat: string;
  last_error?: string;
  heartbeat_age_seconds?: number;
  is_alive?: boolean;
  crash_count?: number;
}

export interface Task {
  id: number;
  task_type: string;
  campaign_id: number;
  payload: string;
  status: string;
  priority: number;
  worker_id?: string;
  claimed_at?: string;
  started_at?: string;
  finished_at?: string;
  attempts: number;
  max_attempts: number;
  error?: string;
  created_at: string;
  scheduled_at?: string;
}

export interface WorkersSummary {
  total_workers: number;
  alive_workers: number;
  dead_workers: number;
  tasks_pending: number;
  tasks_claimed: number;
  tasks_done: number;
  tasks_failed: number;
  tasks_dead: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // Campaigns
  getCampaigns: (status?: string) => get<Campaign[]>(`/campaigns${status ? `?status=${status}` : ""}`),
  getCampaign:  (id: number) => get<Campaign>(`/campaigns/${id}`),
  createCampaign: (data: { name: string; text_template: string; scheduled_at?: string }) =>
    post<Campaign>("/campaigns", data),
  updateCampaign: (id: number, data: Partial<Campaign>) => put<Campaign>(`/campaigns/${id}`, data),
  deleteCampaign: (id: number) => del(`/campaigns/${id}`),
  duplicateCampaign: (id: number) => post<Campaign>(`/campaigns/${id}/duplicate`),
  actionCampaign: (id: number, action: string) => post(`/campaigns/${id}/action`, { action }),
  getCampaignLogs: (id: number) => get<SendLog[]>(`/campaigns/${id}/logs`),
  getCampaignBreakdown: (id: number) => get<AccountBreakdown[]>(`/campaigns/${id}/account-breakdown`),

  // Group campaigns
  getGroupCampaigns: () => get<GroupCampaign[]>("/group-campaigns"),
  getGroupCampaign:  (id: number) => get<GroupCampaign>(`/group-campaigns/${id}`),
  createGroupCampaign: (data: Partial<GroupCampaign>) => post<GroupCampaign>("/group-campaigns", data),
  updateGroupCampaign: (id: number, data: Partial<GroupCampaign>) => put<GroupCampaign>(`/group-campaigns/${id}`, data),
  deleteGroupCampaign: (id: number) => del(`/group-campaigns/${id}`),
  duplicateGroupCampaign: (id: number) => post<GroupCampaign>(`/group-campaigns/${id}/duplicate`),
  actionGroupCampaign: (id: number, action: string) => post(`/group-campaigns/${id}/action`, { action }),
  getGroupCampaignLogs: (id: number) => get<GroupCampaignLog[]>(`/group-campaigns/${id}/logs`),
  sendNowGroupCampaign: (id: number) => post<{ ok: boolean; task: unknown }>(`/group-campaigns/${id}/send-now`, {}),
  testSendGroupCampaign: (id: number, groupId: string) => post<{ ok: boolean; task: unknown }>(`/group-campaigns/${id}/test-send`, { group_id: groupId }),
  getGroupCampaignStats: (id: number) => get<{ by_group: GroupSendStat[]; daily: DailyStat[] }>(`/group-campaigns/${id}/stats`),
  retryFailedSends: (windowHours?: number) =>
    post<{ ok: boolean; tasks_created: number; campaigns: number }>("/group-campaigns/retry-failed-sends", { window_hours: windowHours ?? 24 }),
  bulkGroupCampaignAction: (action: "pause" | "resume" | "stop", ids?: number[]) =>
    post<{ ok: boolean; updated: number; campaigns: GroupCampaign[] }>("/group-campaigns/bulk-action", { action, ids }),

  // Accounts
  getAccounts: () => get<SenderAccount[]>("/accounts"),
  getAccount:  (id: number) => get<SenderAccount>(`/accounts/${id}`),
  patchAccount: (id: number, data: Partial<SenderAccount>) => put<SenderAccount>(`/accounts/${id}`, data),
  createAccount: (data: { phone: string; label?: string; username?: string; proxy?: string; proxies?: string; api_id?: number; api_hash?: string }) =>
    post<SenderAccount>("/accounts", data),
  deleteAccount: (id: number) => del(`/accounts/${id}`),
  clearFlood: (id: number) => post<SenderAccount>(`/accounts/${id}/clear-flood`, {}),
  resetDailyCounts: () => post<{ ok: boolean }>("/accounts/reset-daily", {}),
  getAudienceTags:  () => get<string[]>("/audience/tags"),
  getAudienceCount: (tag?: string) => get<{ count: number; tag: string | null }>(`/audience/count${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`),
  startAuth: (id: number) => post<{ phone_code_hash?: string; already_authorized?: boolean; display_name?: string; session_file?: string; error?: string }>(`/accounts/${id}/start-auth`, {}),
  confirmAuth: (id: number, code: string, phone_code_hash: string) =>
    post<{ ok?: boolean; needs_2fa?: boolean; display_name?: string; session_file?: string; error?: string }>(`/accounts/${id}/confirm-auth`, { code, phone_code_hash }),
  confirm2fa: (id: number, password: string) =>
    post<{ ok?: boolean; display_name?: string; session_file?: string; error?: string }>(`/accounts/${id}/confirm-2fa`, { password }),

  // Account groups
  getAccountGroups: (accountId: number) => get<AccountGroup[]>(`/accounts/${accountId}/groups`),
  refreshAccountGroups: (accountId: number) =>
    post<{ ok: boolean; count: number; groups: AccountGroup[] }>(`/accounts/${accountId}/groups/refresh`, {}),

  // Workers / task queue
  getWorkers: () => get<BroadcastWorker[]>("/workers"),
  getWorkersSummary: () => get<WorkersSummary>("/workers-summary"),
  getWorkerHeartbeats: () => get<WorkerHeartbeat[]>("/worker-heartbeats"),
  getWorkerCrashHistory: () => get<WorkerCrashEvent[]>("/workers/crash-history"),
  deleteWorker: (workerId: string) => del(`/workers/${encodeURIComponent(workerId)}`),
  spawnWorker: (workerId?: string) =>
    post<{ ok: boolean; worker_id: string; pid: number | null }>("/workers/spawn", { worker_id: workerId }),
  recoverLocks: (timeoutSeconds?: number) =>
    post<RecoverLocksResult>("/workers/recover-locks", { timeout_seconds: timeoutSeconds ?? 300 }),
  getTasks: (status?: string) => get<Task[]>(`/tasks${status ? `?status=${status}` : ""}`),
  retryTask: (id: number) => post<Task>(`/tasks/${id}/retry`, {}),
  cancelTask: (id: number) => post<Task>(`/tasks/${id}/cancel`, {}),
  bulkRetryTasks: () => post<{ updated: number }>("/tasks/bulk-retry", {}),
  bulkCancelTasks: () => post<{ updated: number }>("/tasks/bulk-cancel", {}),
  pushTask: (campaignId: number, payload?: Record<string, unknown>) =>
    post<Task>("/tasks", { campaign_id: campaignId, payload }),

  getCampaignSparklines: () => get<Record<number, number[]>>("/stats/campaign-sparklines"),
  getAccountSendsToday: () => get<{ account_id: string; ok: number; failed: number }[]>("/accounts/sends-today"),

  // Analytics / users
  getOverview: () => get<AnalyticsOverview>("/analytics/summary"),
  getUsers:    () => get<User[]>("/users"),
  importUsers: (users: { chat_id: number; username?: string; first_name?: string; tags?: string }[]) =>
    post<{ ok: boolean; imported: number; skipped: number; total: number }>("/users/import", { users }),
};
