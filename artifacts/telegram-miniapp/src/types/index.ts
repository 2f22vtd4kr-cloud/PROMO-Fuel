export interface Campaign {
  id: number;
  name: string;
  status: "draft" | "running" | "paused" | "done" | "cancelled" | "scheduled" | "sending" | "sent";
  text_template: string;
  target_count: number;
  sent_count: number;
  failed_count: number;
  dry_run: number;
  scheduled_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
}

export interface User {
  id?: number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  promo_targeted: number;
  converted: number;
  converted_at: string | null;
  first_seen: string;
  last_seen: string;
  tags: string;
}

export interface Send {
  id: number;
  campaign_id: number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  status: "ok" | "ok_retry" | "failed" | "blocked" | "dry_run" | "skipped_already_targeted";
  error: string | null;
  sent_at: string;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalSent: number;
  activeCampaigns: number;
  totalCampaigns: number;
  targetedUsers: number;
  untargetedUsers: number;
  convertedUsers: number;
  conversionRate: string;
  recentSends: Array<{ day: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  avgOpenRate: number;
  avgCtr: number;
  avgBounceRate: number;
  sentDelta: number;
}

export interface UploadResult {
  key: string;
  filename: string;
  count: number;
}

export interface UploadRecord {
  key: string;
  filename: string;
  uploaded_at: string;
  imported_count: number;
  count: number;
}

export interface Account {
  id: number;
  label: string;
  phone: string;
  username: string | null;
  telegram_id: number | null;
  status: string;
  sent_today: number;
  sent_total: number;
  failed_total: number;
  is_banned: number;
  is_active: number;
}
