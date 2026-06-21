const API_BASE     = import.meta.env.VITE_API_URL      ?? "";
const CONTROL_BASE = import.meta.env.VITE_CONTROL_API_URL ?? "";

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
    method: "POST", headers: twaHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}/api/twa${path}`, {
    method: "PUT", headers: twaHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function del(path: string): Promise<void> {
  await fetch(`${API_BASE}/api/twa${path}`, { method: "DELETE", headers: twaHeaders() });
}

async function controlGet<T>(path: string): Promise<T> {
  const r = await fetch(`${CONTROL_BASE}${path}`, { headers: { "Content-Type": "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function controlPost<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${CONTROL_BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); msg = j.detail ?? j.error ?? msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

async function controlDelete<T>(path: string): Promise<T> {
  const r = await fetch(`${CONTROL_BASE}${path}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── Domain types ──────────────────────────────────────────────────────────────

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

export interface BannedGroup {
  group_id: string;
  group_title: string | null;
  ban_reason: string | null;
  banned_at: string | null;
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

export interface MessageTemplate {
  id: number;
  name: string;
  icon: string;
  text: string;
  tags: string;
  use_count: number;
  created_at: string;
  updated_at: string;
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
  locked_by?: string | null;
  locked_at?: string | null;
  proxy_index?: number;
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

export interface DailyDigest {
  date: string;
  total_users: number;
  dm_sent_today: number;
  group_sent_today: number;
  total_sent_today: number;
  active_campaigns: number;
  active_group_campaigns: number;
  workers_alive: number;
  workers_total: number;
  tasks_done: number;
  tasks_failed: number;
  sent_last_7_days: number;
  sent_prev_7_days: number;
  week_delta_pct: number;
}

// ── Control-plane types (apiserver.py / FastAPI) ───────────────────────────────

export interface AuthSession {
  phone: string;
  account_id: number;
  step: string;
  awaiting_2fa: boolean;
  started_at: string;
  expires_in: number;
}

export interface AccountHealth {
  id: number;
  phone: string;
  status: string;
  sent_today: number;
  daily_limit: number;
  quota_pct: number;
  flood_wait_sec: number;
  healthy: boolean;
}

export interface QueueStats {
  pending: number;
  active: number;
  done: number;
  failed: number;
  dead: number;
  cancelled: number;
  locked_accounts: number;
  broadcasting_accounts: number;
}

export interface SystemSnapshot {
  queue: QueueStats;
  workers: BroadcastWorker[];
  accounts: SenderAccount[];
  active_auth_sessions: AuthSession[];
  worker_count: number;
  timestamp: string;
}

export interface TriggerResult {
  ok: boolean;
  task_id: number;
  campaign_id: number;
  campaign_name: string;
}

export interface AdminReleaseResult {
  ok: boolean;
  worker_id: string;
  accounts: number;
  tasks: number;
}

export interface StaleLocksResult {
  released: number;
  timeout_seconds: number;
}

export interface SendCodeResult {
  phone_code_hash: string;
  phone: string;
  session_started: boolean;
}

export interface SignInResult {
  ok: boolean;
  needs_2fa?: boolean;
  display_name?: string;
  session_file?: string;
  error?: string;
}

// ── Express TWA API ───────────────────────────────────────────────────────────

export const api = {
  getCampaigns: (status?: string) => get<Campaign[]>(`/campaigns${status ? `?status=${status}` : ""}`),
  getUpcomingCampaigns: (hours = 24) => get<{ id: number; name: string; status: string; scheduled_at: string; target_count: number }[]>(`/campaigns/upcoming?hours=${hours}`),
  getCampaign:  (id: number) => get<Campaign>(`/campaigns/${id}`),
  createCampaign: (data: { name: string; text_template: string; scheduled_at?: string }) =>
    post<Campaign>("/campaigns", data),
  updateCampaign:   (id: number, data: Partial<Campaign>) => put<Campaign>(`/campaigns/${id}`, data),
  deleteCampaign:   (id: number) => del(`/campaigns/${id}`),
  duplicateCampaign:(id: number) => post<Campaign>(`/campaigns/${id}/duplicate`),
  actionCampaign:   (id: number, action: string) => post(`/campaigns/${id}/action`, { action }),
  getCampaignLogs:  (id: number) => get<SendLog[]>(`/campaigns/${id}/logs`),
  getCampaignBreakdown: (id: number) => get<AccountBreakdown[]>(`/campaigns/${id}/account-breakdown`),

  getGroupCampaigns:    () => get<GroupCampaign[]>("/group-campaigns"),
  getGroupCampaign:     (id: number) => get<GroupCampaign>(`/group-campaigns/${id}`),
  createGroupCampaign:  (data: Partial<GroupCampaign>) => post<GroupCampaign>("/group-campaigns", data),
  updateGroupCampaign:  (id: number, data: Partial<GroupCampaign>) => put<GroupCampaign>(`/group-campaigns/${id}`, data),
  deleteGroupCampaign:  (id: number) => del(`/group-campaigns/${id}`),
  duplicateGroupCampaign:(id: number) => post<GroupCampaign>(`/group-campaigns/${id}/duplicate`),
  actionGroupCampaign:  (id: number, action: string) => post(`/group-campaigns/${id}/action`, { action }),
  getGroupCampaignLogs: (id: number) => get<GroupCampaignLog[]>(`/group-campaigns/${id}/logs`),
  sendNowGroupCampaign: (id: number) => post<{ ok: boolean; task: unknown }>(`/group-campaigns/${id}/send-now`, {}),
  testSendGroupCampaign:(id: number, groupId: string) => post<{ ok: boolean; task: unknown }>(`/group-campaigns/${id}/test-send`, { group_id: groupId }),
  getGroupCampaignStats:(id: number) => get<{ by_group: GroupSendStat[]; daily: DailyStat[] }>(`/group-campaigns/${id}/stats`),
  getCampaignStats:     (id: number) => get<{ campaign: { id: number; name: string; status: string }; total: number; ok: number; failed: number; today: number; success_rate: number; hourly: { h: string; n: number }[] }>(`/campaigns/${id}/stats`),
  patchCampaignNotes:   (id: number, notes: string) => fetch(`${API_BASE}/api/twa/campaigns/${id}`, { method: "PATCH", headers: twaHeaders(), body: JSON.stringify({ notes }) }).then(r => r.json()),
  retryFailedSends:     (windowHours?: number) =>
    post<{ ok: boolean; tasks_created: number; campaigns: number }>("/group-campaigns/retry-failed-sends", { window_hours: windowHours ?? 24 }),
  bulkGroupCampaignAction: (action: "pause" | "resume" | "stop", ids?: number[]) =>
    post<{ ok: boolean; updated: number; campaigns: GroupCampaign[] }>("/group-campaigns/bulk-action", { action, ids }),

  getAccounts:    () => get<SenderAccount[]>("/accounts"),
  getAccount:     (id: number) => get<SenderAccount>(`/accounts/${id}`),
  patchAccount:   (id: number, data: Partial<SenderAccount>) => put<SenderAccount>(`/accounts/${id}`, data),
  createAccount:  (data: { phone: string; label?: string; username?: string; proxy?: string; proxies?: string; api_id?: number; api_hash?: string }) =>
    post<SenderAccount>("/accounts", data),
  deleteAccount:  (id: number) => del(`/accounts/${id}`),
  clearFlood:     (id: number) => post<SenderAccount>(`/accounts/${id}/clear-flood`, {}),
  getAccountRateLimit: (id: number) => get<{
    account_id: number; window_seconds: number; window_max: number;
    count: number; remaining: number; window_start: string | null; resets_at: string | null;
  }>(`/accounts/${id}/rate-limit`),
  resetDailyCounts: () => post<{ ok: boolean }>("/accounts/reset-daily", {}),
  getAudienceTags:  () => get<string[]>("/audience/tags"),
  getAudienceCount: (tag?: string) => get<{ count: number; tag: string | null }>(`/audience/count${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`),
  startAuth:    (id: number) => post<{ phone_code_hash?: string; already_authorized?: boolean; display_name?: string; session_file?: string; error?: string }>(`/accounts/${id}/start-auth`, {}),
  confirmAuth:  (id: number, code: string, phone_code_hash: string) =>
    post<{ ok?: boolean; needs_2fa?: boolean; display_name?: string; session_file?: string; error?: string }>(`/accounts/${id}/confirm-auth`, { code, phone_code_hash }),
  confirm2fa:   (id: number, password: string) =>
    post<{ ok?: boolean; display_name?: string; session_file?: string; error?: string }>(`/accounts/${id}/confirm-2fa`, { password }),

  getAccountGroups:     (accountId: number) => get<AccountGroup[]>(`/accounts/${accountId}/groups`),
  refreshAccountGroups: (accountId: number) =>
    post<{ ok: boolean; count: number; groups: AccountGroup[] }>(`/accounts/${accountId}/groups/refresh`, {}),
  getBannedGroups: (accountId: number) => get<BannedGroup[]>(`/accounts/${accountId}/banned-groups`),
  liftGroupBan:    (accountId: number, groupId: string) =>
    del(`/accounts/${accountId}/banned-groups/${encodeURIComponent(groupId)}`),

  getWorkers:           () => get<BroadcastWorker[]>("/workers"),
  getWorkersSummary:    () => get<WorkersSummary>("/workers-summary"),
  getWorkerHeartbeats:  () => get<WorkerHeartbeat[]>("/worker-heartbeats"),
  getWorkerCrashHistory:() => get<WorkerCrashEvent[]>("/workers/crash-history"),
  deleteWorker:         (workerId: string) => del(`/workers/${encodeURIComponent(workerId)}`),
  spawnWorker:          (workerId?: string) =>
    post<{ ok: boolean; worker_id: string; pid: number | null }>("/workers/spawn", { worker_id: workerId }),
  recoverLocks:         (timeoutSeconds?: number) =>
    post<RecoverLocksResult>("/workers/recover-locks", { timeout_seconds: timeoutSeconds ?? 300 }),
  getTasks:       (status?: string) => get<Task[]>(`/tasks${status ? `?status=${status}` : ""}`),
  retryTask:      (id: number) => post<Task>(`/tasks/${id}/retry`, {}),
  cancelTask:     (id: number) => post<Task>(`/tasks/${id}/cancel`, {}),
  bulkRetryTasks: () => post<{ updated: number }>("/tasks/bulk-retry", {}),
  bulkCancelTasks:() => post<{ updated: number }>("/tasks/bulk-cancel", {}),
  pushTask:       (campaignId: number, payload?: Record<string, unknown>) =>
    post<Task>("/tasks", { campaign_id: campaignId, payload }),

  getCampaignSparklines:  () => get<Record<number, number[]>>("/stats/campaign-sparklines"),
  getAccountSendsToday:   () => get<{ account_id: string; ok: number; failed: number }[]>("/accounts/sends-today"),

  getAccountHealth:         () => get<{ accounts: AccountHealth[]; summary: { total: number; healthy: number; flooding: number; inactive: number } }>("/analytics/account-health"),
  getAnalyticsTrend:        () => get<{ date: string; sent: number; opened: number }[]>("/analytics/trend"),
  getAnalyticsTopCampaigns: (limit = 5) => get<unknown[]>(`/analytics/top-campaigns?limit=${limit}`),
  getAnalyticsSendRate:     () => get<unknown[]>("/analytics/send-rate"),

  getTemplates:   () => get<MessageTemplate[]>("/templates"),
  useTemplate:    (id: number) => post<MessageTemplate>(`/templates/${id}/use`, {}),
  createTemplate: (data: { name: string; icon?: string; text: string; tags?: string[] }) =>
    post<MessageTemplate>("/templates", data),
  deleteTemplate: (id: number) => del(`/templates/${id}`),

  resetAccountDaily: (id: number) => post<{ ok: boolean }>(`/accounts/${id}/reset-daily`, {}),

  getOverview:     () => get<AnalyticsOverview>("/analytics/summary"),
  getDailyDigest:  () => get<DailyDigest>("/analytics/digest"),
  getUsers:    () => get<User[]>("/users"),
  importUsers: (users: { chat_id: number; username?: string; first_name?: string; tags?: string }[]) =>
    post<{ ok: boolean; imported: number; skipped: number; total: number }>("/users/import", { users }),
};

// ── FastAPI Control-Plane API (apiserver.py) ───────────────────────────────────

export const controlApi = {
  // Auth — interactive Telethon login pipeline
  sendCode: (account_id: number) =>
    controlPost<SendCodeResult>("/api/auth/send-code", { account_id }),
  signIn: (phone: string, code: string, phone_code_hash: string) =>
    controlPost<SignInResult>("/api/auth/sign-in", { phone, code, phone_code_hash }),
  signIn2fa: (phone: string, password: string) =>
    controlPost<SignInResult>("/api/auth/sign-in-2fa", { phone, password }),
  cancelAuth: (phone: string) =>
    controlDelete<{ ok: boolean; phone: string }>(`/api/auth/${encodeURIComponent(phone)}`),
  listAuthSessions: () =>
    controlGet<{ sessions: AuthSession[] }>("/api/auth/sessions"),

  // Metrics
  getControlWorkers: () =>
    controlGet<{ workers: BroadcastWorker[]; count: number }>("/api/metrics/workers"),
  getQueueStats: () =>
    controlGet<{ queue: QueueStats }>("/api/metrics/queue"),
  getControlAccounts: () =>
    controlGet<{ accounts: SenderAccount[]; count: number }>("/api/metrics/accounts"),
  getControlTasks: (params?: { status?: string; campaign_id?: number; worker_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status)      qs.set("status",      params.status);
    if (params?.campaign_id) qs.set("campaign_id", String(params.campaign_id));
    if (params?.worker_id)   qs.set("worker_id",   params.worker_id);
    const q = qs.toString();
    return controlGet<{ tasks: Task[]; count: number }>(`/api/metrics/tasks${q ? `?${q}` : ""}`);
  },
  reapWorkers: () =>
    controlPost<{ reaped_workers: number; released_stale_locks: number }>("/api/metrics/reap", {}),

  // Campaign triggers
  triggerCampaign: (campaignId: number, opts?: { priority?: number; scheduled_at?: string }) =>
    controlPost<TriggerResult>(`/api/campaigns/${campaignId}/trigger`, opts ?? {}),
  cancelCampaignTasks: (campaignId: number) =>
    controlPost<{ ok: boolean; cancelled: number; campaign_id: number }>(`/api/campaigns/${campaignId}/cancel-tasks`, {}),
  getCampaignControlTasks: (campaignId: number) =>
    controlGet<{ tasks: Task[]; count: number; campaign_id: number }>(`/api/campaigns/${campaignId}/tasks`),

  // Admin
  recoverStaleLocks: (timeoutSeconds?: number) =>
    controlPost<StaleLocksResult>("/api/admin/recover-stale-locks",
      timeoutSeconds !== undefined ? { timeout_seconds: timeoutSeconds } : {}),
  releaseWorker: (workerId: string) =>
    controlPost<AdminReleaseResult>(`/api/admin/release-worker/${encodeURIComponent(workerId)}`, {}),
  cancelControlTask: (taskId: number) =>
    controlPost<{ ok: boolean; task_id: number }>(`/api/admin/tasks/${taskId}/cancel`, {}),
  getSnapshot: () =>
    controlGet<SystemSnapshot>("/api/admin/snapshot"),
  healthCheck: () =>
    controlGet<{ ok: boolean; uptime_seconds: number; db: string }>("/health"),
};
