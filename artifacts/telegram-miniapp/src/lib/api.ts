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

export interface Campaign {
  id: number;
  name: string;
  text_template: string;
  status: string;
  sent_count: number;
  failed_count: number;
  target_count: number;
  created_at: string;
  scheduled_at?: string;
  notes?: string;
}

export interface SenderAccount {
  id: number;
  phone: string;
  label: string;
  username?: string;
  status: string;
  is_active: number;
  is_banned: number;
  sent_today: number;
  sent_total: number;
  failed_total: number;
  last_used_at?: string;
  last_error?: string;
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

export const api = {
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

  getAccounts: () => get<SenderAccount[]>("/accounts"),
  getAccount:  (id: number) => get<SenderAccount>(`/accounts/${id}`),
  patchAccount: (id: number, data: Partial<SenderAccount>) => put<SenderAccount>(`/accounts/${id}`, data),
  createAccount: (data: { phone: string; label?: string; username?: string; proxy?: string }) =>
    post<SenderAccount>("/accounts", data),
  deleteAccount: (id: number) => del(`/accounts/${id}`),

  getOverview: () => get<AnalyticsOverview>("/analytics/summary"),
  getUsers:    () => get<User[]>("/users"),

  importUsers: (users: { chat_id: number; username?: string; first_name?: string; tags?: string }[]) =>
    post<{ ok: boolean; imported: number; skipped: number; total: number }>("/users/import", { users }),
};
