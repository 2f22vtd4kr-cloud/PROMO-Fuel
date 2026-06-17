import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutGrid, Megaphone, BarChart2, Users2, Shield,
  Flame, TrendingUp, Gift, Bell,
  Plus, Play, Pause, Clock,
  Award, ArrowUpRight,
  Filter, User, Zap, Star,
  AlertTriangle, ShieldCheck, WifiOff, Activity, ShieldOff,
  FolderUp, CheckCircle2, Trash2, KeyRound, Pencil, Copy, Square,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const API_BASE = "";

function getCrmSecret(): string {
  return sessionStorage.getItem("crm_secret") ?? "";
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const secret = getCrmSecret();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;
  return fetch(url, { ...options, headers });
}

const TG = {
  bg: "#07090f",
  glass: "rgba(255,255,255,0.065)",
  glassMid: "rgba(255,255,255,0.10)",
  glassStrong: "rgba(255,255,255,0.15)",
  glassBorder: "rgba(255,255,255,0.13)",
  glassBorderStrong: "rgba(255,255,255,0.22)",
  lgSurface: "linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
  lgBorder: "rgba(255,255,255,0.18)",
  lgPrism: "linear-gradient(135deg, rgba(120,180,255,0.07) 0%, rgba(255,120,200,0.05) 35%, rgba(120,255,170,0.04) 65%, rgba(180,120,255,0.07) 100%)",
  text: "#eef2ff",
  textSecondary: "rgba(220,232,255,0.68)",
  muted: "rgba(160,190,230,0.50)",
  green: "#2de897",
  greenGlow: "rgba(45,232,151,0.38)",
  orange: "#ff9f40",
  orangeGlow: "rgba(255,159,64,0.38)",
  blue: "#6ba8e5",
  blueGlow: "rgba(107,168,229,0.45)",
  purple: "#c4aeff",
  purpleGlow: "rgba(196,174,255,0.38)",
  pink: "#ff7eb3",
  pinkGlow: "rgba(255,126,179,0.38)",
  yellow: "#ffc946",
  yellowGlow: "rgba(255,201,70,0.38)",
  red: "#ff6b7a",
  redGlow: "rgba(255,107,122,0.38)",
};

const BLUR = "blur(32px) saturate(160%)";
const BLUR_NAV = "blur(48px) saturate(190%)";

interface Overview {
  totalSent: number;
  totalUsers: number;
  totalCampaigns: number;
  avgOpenRate: number;
  avgCtr: number;
  avgBounceRate: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  sentDelta: number;
  openDelta: number;
  ctrDelta: number;
}

interface Campaign {
  id: number;
  name: string;
  status: string;
  sent_count: number;
  failed_count: number;
  target_count: number;
  created_at: string;
  started_at?: string;
  sender_account_id?: number;
  send_delay_seconds?: number;
  scheduled_tag?: string;
}

interface TrendPoint {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
}

interface UserRow {
  chat_id: number;
  username: string | null;
  first_name: string | null;
  tags: string | null;
  first_seen: string | null;
  last_seen: string | null;
}

interface Account {
  id: number;
  label: string;
  phone: string;
  username?: string;
  api_id?: number;
  api_hash?: string;
  session_file?: string;
  status: string;
  sent_today: number;
  sent_total: number;
  failed_total: number;
  last_error?: string;
  is_banned: number;
  is_active: number;
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("ru");
}

function GlassInput({ value, onChange, placeholder, multiline = false, style = {} }: {
  value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.055)",
    border: `1px solid rgba(255,255,255,0.14)`,
    borderRadius: 12, color: TG.text,
    fontSize: 13, fontFamily: "inherit",
    padding: "10px 12px",
    outline: "none",
    resize: "none",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    caretColor: TG.blue,
    ...style,
  };
  return multiline
    ? <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={base as React.CSSProperties} />
    : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
    }} onClick={onClose}>
      <div style={{
        width: "100%", maxWidth: 430,
        background: "linear-gradient(160deg, rgba(22,25,45,0.98) 0%, rgba(10,12,24,0.99) 100%)",
        border: `1px solid rgba(255,255,255,0.14)`,
        borderRadius: "22px 22px 0 0",
        padding: "22px 18px 36px",
        display: "flex", flexDirection: "column", gap: 14,
        boxShadow: "0 -16px 60px rgba(0,0,0,0.8)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: TG.text }}>{title}</span>
          <div onClick={onClose} style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TG.muted, fontSize: 15, fontWeight: 700 }}>✕</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function GlassCard({
  children, style = {}, glow, onClick,
}: { children: React.ReactNode; style?: React.CSSProperties; glow?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: TG.lgSurface,
      backdropFilter: BLUR,
      WebkitBackdropFilter: BLUR,
      border: `1px solid ${TG.glassBorderStrong}`,
      borderRadius: 20,
      position: "relative",
      overflow: "hidden",
      boxShadow: glow
        ? `0 8px 32px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 4px 24px ${glow}`
        : "0 8px 32px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(255,255,255,0.06) inset",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.55) 35%,rgba(255,255,255,0.70) 50%,rgba(255,255,255,0.55) 65%,transparent 95%)",
        pointerEvents: "none", zIndex: 3,
      }} />
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: TG.lgPrism,
        pointerEvents: "none", zIndex: 1,
      }} />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

function SkeletonCard({ style = {} }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.08)",
      animation: "shimmer 1.6s infinite",
      backgroundSize: "200% 100%",
      backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.03) 100%)",
      ...style,
    }} />
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    running:   { color: TG.green,  bg: `${TG.green}22`,  label: "Активна" },
    scheduled: { color: TG.yellow, bg: `${TG.yellow}22`, label: "Запланирована" },
    paused:    { color: TG.blue,   bg: `${TG.blue}22`,   label: "Пауза" },
    draft:     { color: TG.muted,  bg: "rgba(255,255,255,0.06)", label: "Черновик" },
    done:      { color: TG.muted,  bg: "rgba(255,255,255,0.06)", label: "Готово" },
    cancelled: { color: TG.red,    bg: `${TG.red}22`,    label: "Отменена" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      color: s.color, background: s.bg,
      border: `1px solid ${s.color}40`,
      borderRadius: 20, padding: "2px 8px",
    }}>{s.label}</span>
  );
}

function MeshBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`
        @keyframes floatA {
          0%,100%{transform:translate(0,0) scale(1);}
          33%{transform:translate(18px,-22px) scale(1.08);}
          66%{transform:translate(-14px,16px) scale(0.96);}
        }
        @keyframes floatB {
          0%,100%{transform:translate(0,0) scale(1);}
          40%{transform:translate(-20px,14px) scale(1.05);}
          70%{transform:translate(16px,-18px) scale(0.97);}
        }
        @keyframes floatC {
          0%,100%{transform:translate(0,0) scale(1);}
          50%{transform:translate(12px,20px) scale(1.06);}
        }
        @keyframes navPop {
          0%{transform:scale(0.82);opacity:0;}
          60%{transform:scale(1.06);opacity:1;}
          100%{transform:scale(1);opacity:1;}
        }
        @keyframes shimmer {
          0%{background-position:-200% 0;}
          100%{background-position:200% 0;}
        }
        @keyframes fadeInUp {
          from{opacity:0;transform:translateY(14px);}
          to{opacity:1;transform:translateY(0);}
        }
        @keyframes pulse {
          0%,100%{opacity:1;} 50%{opacity:0.55;}
        }
        .tab-content { animation: fadeInUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div style={{
        position: "absolute", top: "-8%", left: "-10%",
        width: 340, height: 340, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(45,232,151,0.18) 0%, transparent 70%)",
        filter: "blur(48px)", animation: "floatA 9s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", top: "22%", right: "-12%",
        width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(107,168,229,0.16) 0%, transparent 70%)",
        filter: "blur(40px)", animation: "floatB 11s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "18%", left: "-8%",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,159,64,0.13) 0%, transparent 70%)",
        filter: "blur(44px)", animation: "floatC 13s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "-5%", right: "-5%",
        width: 220, height: 220, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(196,174,255,0.12) 0%, transparent 70%)",
        filter: "blur(36px)", animation: "floatA 15s ease-in-out infinite reverse",
      }} />
    </div>
  );
}

type Tab = "home" | "campaigns" | "analytics" | "audience" | "accounts" | "upload";
const NAV_ITEMS: { id: Tab; icon: React.ElementType; label: string; color: string; glow: string }[] = [
  { id: "home",      icon: LayoutGrid, label: "Главная",   color: "#95c4f5", glow: "rgba(107,168,229,0.55)" },
  { id: "campaigns", icon: Megaphone,  label: "Рассылки",  color: "#2de897", glow: "rgba(45,232,151,0.55)" },
  { id: "analytics", icon: BarChart2,  label: "Аналитика", color: "#ffc946", glow: "rgba(255,201,70,0.55)" },
  { id: "audience",  icon: Users2,     label: "Аудитория", color: "#c4aeff", glow: "rgba(196,174,255,0.55)" },
  { id: "accounts",  icon: Shield,     label: "Аккаунты",  color: "#ff7eb3", glow: "rgba(255,126,179,0.55)" },
  { id: "upload",    icon: FolderUp,   label: "Файлы",     color: "#ff9f40", glow: "rgba(255,159,64,0.55)" },
];

function BottomNav({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <div style={{ paddingBottom: 12, paddingLeft: 12, paddingRight: 12, paddingTop: 8, position: "relative", flexShrink: 0 }}>
      <div style={{
        display: "flex",
        background: "linear-gradient(145deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.04) 60%,rgba(255,255,255,0.08) 100%)",
        backdropFilter: BLUR_NAV,
        WebkitBackdropFilter: BLUR_NAV,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.17)",
        boxShadow: "0 2px 0 rgba(255,255,255,0.14) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 16px 48px rgba(0,0,0,0.42), 0 4px 12px rgba(0,0,0,0.22)",
        position: "relative", overflow: "hidden", padding: "4px 4px",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent 3%,rgba(255,255,255,0.58) 30%,rgba(255,255,255,0.72) 50%,rgba(255,255,255,0.58) 70%,transparent 97%)",
          pointerEvents: "none", zIndex: 3,
        }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: TG.lgPrism, pointerEvents: "none", zIndex: 1 }} />
        {NAV_ITEMS.map(({ id, icon: Icon, label, color, glow }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onNav(id)} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3, padding: "9px 2px 8px",
              border: "none", background: "none",
              position: "relative", zIndex: 2,
              cursor: "pointer", minHeight: 54,
            }}>
              {isActive && (
                <div style={{
                  position: "absolute", inset: "2px 4px", borderRadius: 20,
                  background: `linear-gradient(145deg,${color}22 0%,${color}10 100%)`,
                  border: `1px solid ${color}35`,
                  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                  boxShadow: `0 0 24px ${glow}40, inset 0 1px 0 ${color}28`,
                  animation: "navPop 0.36s cubic-bezier(0.16,1,0.3,1) both",
                }} />
              )}
              <div style={{ position: "relative", zIndex: 1 }}>
                <Icon
                  size={isActive ? 21 : 19}
                  color={isActive ? color : "rgba(160,190,230,0.32)"}
                  strokeWidth={isActive ? 2.4 : 1.6}
                  style={{ transition: "color 0.22s,filter 0.22s", filter: isActive ? `drop-shadow(0 0 8px ${glow})` : "none" }}
                />
              </div>
              <span style={{
                fontSize: 9, fontWeight: isActive ? 800 : 400, letterSpacing: "0.03em",
                color: isActive ? color : "rgba(160,190,230,0.30)",
                textTransform: "uppercase", transition: "color 0.22s", position: "relative", zIndex: 1,
              }}>{label}</span>
              {isActive && (
                <div style={{
                  position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                  width: 3, height: 3, borderRadius: "50%", background: color,
                  boxShadow: `0 0 8px 2px ${glow}`,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomeTab({ overview, campaigns, loading, onNav, onCreateCampaign }: { overview: Overview | null; campaigns: Campaign[]; loading: boolean; onNav: (t: Tab) => void; onCreateCampaign: () => void }) {
  const running = campaigns.filter(c => c.status === "running");
  const stats = overview ? [
    { label: "Отправлено",  value: fmtNum(overview.totalSent),       sub: `${overview.sentDelta >= 0 ? "+" : ""}${overview.sentDelta.toFixed(1)}% сегодня`, color: TG.green,  glow: TG.greenGlow,  icon: Gift },
    { label: "Активных",   value: String(overview.activeCampaigns),  sub: "кампании",                color: TG.orange, glow: TG.orangeGlow, icon: Flame },
    { label: "Охват",      value: fmtNum(overview.totalUsers),        sub: "пользователей",           color: TG.blue,   glow: TG.blueGlow,   icon: Users2 },
    { label: "Open Rate",  value: `${overview.avgOpenRate.toFixed(1)}%`, sub: `${overview.openDelta >= 0 ? "+" : ""}${overview.openDelta.toFixed(1)}% за неделю`, color: TG.purple, glow: TG.purpleGlow, icon: TrendingUp },
  ] : [];

  const quickActions: { label: string; icon: React.ElementType; color: string; glow: string; tab: Tab }[] = [
    { label: "Новая рассылка", icon: Megaphone, color: TG.green,  glow: TG.greenGlow,  tab: "campaigns" },
    { label: "Статистика",     icon: BarChart2, color: TG.blue,   glow: TG.blueGlow,   tab: "analytics" },
    { label: "Аудитория",      icon: Users2,    color: TG.purple, glow: TG.purpleGlow, tab: "audience" },
    { label: "Аккаунты",       icon: Shield,    color: TG.pink,   glow: TG.pinkGlow,   tab: "accounts" },
  ];

  const CAMP_COLORS = [TG.blue, TG.green, TG.orange, TG.purple, TG.pink];

  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 14px", paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>
            Добро пожаловать 👋
          </div>
          <div style={{ fontSize: 12, color: TG.textSecondary, marginTop: 2 }}>
            PROMO-Fuel • Личный кабинет
          </div>
        </div>
        <GlassCard style={{ padding: "8px 10px", borderRadius: 14 }}>
          <Bell size={17} color={TG.blue} style={{ display: "block" }} />
        </GlassCard>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} style={{ height: 88 }} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <GlassCard key={s.label} glow={s.glow + "30"} style={{ padding: "14px 14px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: `${s.color}18`, border: `1px solid ${s.color}35`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 12px ${s.glow}` }}>
                    <Icon size={14} color={s.color} />
                  </div>
                  <ArrowUpRight size={12} color={s.color} style={{ opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: TG.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: TG.muted, marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 600 }}>{s.sub}</div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
          Быстрые действия
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {quickActions.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.label} style={{ flexShrink: 0 }} onClick={() => onNav(a.tab)}>
                <GlassCard glow={a.glow + "28"} style={{ padding: "12px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, minWidth: 72, cursor: "pointer" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(145deg,${a.color}30 0%,${a.color}10 100%)`, border: `1px solid ${a.color}40`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${a.glow}50` }}>
                    <Icon size={16} color={a.color} />
                  </div>
                  <span style={{ fontSize: 9, color: TG.textSecondary, fontWeight: 700, textAlign: "center", letterSpacing: "0.02em", lineHeight: 1.2, maxWidth: 64 }}>{a.label}</span>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TG.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Активные кампании
          </div>
          <span style={{ fontSize: 11, color: TG.blue, fontWeight: 600 }}>{running.length > 0 ? `${running.length} активных` : ""}</span>
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} style={{ height: 90 }} />)}
          </div>
        ) : running.length === 0 ? (
          <GlassCard style={{ padding: "20px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: TG.muted }}>Нет активных кампаний</div>
            <div onClick={onCreateCampaign} style={{ fontSize: 11, color: TG.blue, marginTop: 8, fontWeight: 600, cursor: "pointer" }}>+ Создать кампанию</div>
          </GlassCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {running.slice(0, 3).map((c, i) => {
              const color = CAMP_COLORS[i % CAMP_COLORS.length];
              const glow = color + "38";
              const pct = c.target_count > 0 ? Math.round(c.sent_count / c.target_count * 100) : 0;
              return (
                <GlassCard key={c.id} glow={glow + "20"} style={{ padding: "14px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ flex: 1, marginRight: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TG.text, marginBottom: 4 }}>{c.name}</div>
                      <StatusBadge status={c.status} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.05em", color, background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>LIVE</span>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: TG.muted }}>Отправлено</span>
                      <span style={{ fontSize: 10, color, fontWeight: 700 }}>
                        {c.sent_count.toLocaleString("ru")}
                        {c.target_count > 0 ? ` / ${c.target_count.toLocaleString("ru")} (${pct}%)` : ""}
                      </span>
                    </div>
                    {c.target_count > 0 && (
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}bb)`, boxShadow: `0 0 8px ${glow}` }} />
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type ActionFn = (path: string, method?: string, body?: Record<string, unknown>) => Promise<void>;

interface SendLog {
  id: number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  status: string;
  sent_at: string;
  error: string | null;
  account_id: number | null;
}

function CampaignEditModal({ campaign, accounts, onAction, onClose }: { campaign: Campaign; accounts: Account[]; onAction: ActionFn; onClose: () => void }) {
  const [name, setName]         = useState(campaign.name);
  const [text, setText]         = useState("");
  const [accountId, setAccountId] = useState(campaign.sender_account_id ? String(campaign.sender_account_id) : "");
  const [delay, setDelay]       = useState(campaign.send_delay_seconds ?? 15);
  const [tag, setTag]           = useState(campaign.scheduled_tag ?? "");
  const [saving, setSaving]     = useState(false);
  const [textLoaded, setTextLoaded] = useState(false);

  // Load full campaign (including text_template) on mount
  useEffect(() => {
    apiFetch(`/api/campaigns/${campaign.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(c => { if (c) { setText(c.text_template ?? ""); setTag(c.scheduled_tag ?? ""); setTextLoaded(true); } })
      .catch(() => setTextLoaded(true));
  }, [campaign.id]);

  async function handleSave() {
    if (!name.trim() || !text.trim()) return;
    setSaving(true);
    const body: Record<string, unknown> = { name: name.trim(), text_template: text.trim(), send_delay_seconds: delay, scheduled_tag: tag.trim() || null };
    if (accountId) body.sender_account_id = parseInt(accountId);
    else body.sender_account_id = null;
    await onAction(`/api/campaigns/${campaign.id}`, "PUT", body);
    setSaving(false);
    onClose();
  }

  return (
    <Modal title="Редактировать кампанию" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <GlassInput value={name} onChange={setName} placeholder="Название кампании *" />
        {textLoaded
          ? <GlassInput value={text} onChange={setText} placeholder="Текст сообщения… *" multiline />
          : <div style={{ padding: 12, textAlign: "center", color: TG.muted, fontSize: 12 }}>Загрузка…</div>
        }
        {accounts.length > 0 && (
          <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: accountId ? TG.text : TG.muted, fontSize: 13, fontFamily: "inherit", padding: "10px 12px", outline: "none" }}>
            <option value="">— Аккаунт-отправитель (опционально) —</option>
            {accounts.filter(a => a.is_active && !a.is_banned).map(a => (
              <option key={a.id} value={String(a.id)} style={{ background: "#0d1021" }}>
                {a.label || a.phone} ({a.phone})
              </option>
            ))}
          </select>
        )}
        <GlassInput value={tag} onChange={setTag} placeholder="🎯  Целевая аудитория (тег, напр. vip)" />
        <div>
          <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>Задержка между сообщениями (сек)</div>
          <input type="number" min={5} max={120} value={delay} onChange={e => setDelay(Math.max(5, parseInt(e.target.value) || 15))} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: TG.text, fontSize: 13, fontFamily: "inherit", padding: "10px 12px", outline: "none" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <div onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", fontSize: 13, fontWeight: 700, color: TG.muted, cursor: "pointer" }}>Отмена</div>
        <div onClick={handleSave} style={{ flex: 2, padding: "11px 0", borderRadius: 14, background: saving ? `${TG.blue}25` : `linear-gradient(135deg,${TG.blue}55 0%,${TG.purple}44 100%)`, border: `1px solid ${TG.blue}55`, textAlign: "center", fontSize: 13, fontWeight: 800, color: TG.blue, cursor: (saving || !name.trim() || !text.trim()) ? "default" : "pointer", opacity: (saving || !name.trim() || !text.trim()) ? 0.5 : 1 }}>
          {saving ? "Сохранение…" : "Сохранить"}
        </div>
      </div>
    </Modal>
  );
}

function CampaignLogsModal({ campaign, accounts, onClose }: { campaign: Campaign; accounts: Account[]; onClose: () => void }) {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCamp, setLiveCamp] = useState<Campaign>(campaign);

  const fetchLogs = useCallback(() => {
    apiFetch(`/api/campaigns/${campaign.id}/logs`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [campaign.id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-refresh every 4s when the campaign is running
  useEffect(() => {
    if (liveCamp.status !== "running") return;
    const t = setInterval(() => {
      fetchLogs();
      apiFetch(`/api/campaigns/${campaign.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(c => { if (c) setLiveCamp(c); })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [liveCamp.status, campaign.id, fetchLogs]);

  const statusColor: Record<string, string> = {
    ok: TG.green, ok_retry: TG.green, dry_run: TG.blue,
    blocked: TG.red, failed: TG.red,
    skipped_already_targeted: TG.muted,
  };
  const countByStatus = logs.reduce((acc, l) => { acc[l.status] = (acc[l.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <Modal title={`Лог: ${campaign.name}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.entries(countByStatus).map(([s, n]) => (
          <span key={s} style={{ fontSize: 9, fontWeight: 700, color: statusColor[s] ?? TG.muted, background: `${statusColor[s] ?? TG.muted}18`, border: `1px solid ${statusColor[s] ?? TG.muted}30`, borderRadius: 20, padding: "3px 8px" }}>
            {s}: {n}
          </span>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", color: TG.muted, fontSize: 13, padding: 20 }}>Загрузка…</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: "center", color: TG.muted, fontSize: 13, padding: 20 }}>Нет записей</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 340, overflowY: "auto" }}>
          {logs.map(l => {
            const acc = l.account_id ? accounts.find(a => a.id === l.account_id) : null;
            const col = statusColor[l.status] ?? TG.muted;
            return (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: TG.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.first_name || l.username || `id:${l.chat_id}`}
                    {l.username && <span style={{ color: TG.blue, marginLeft: 5, fontSize: 10 }}>@{l.username}</span>}
                  </div>
                  {l.error && <div style={{ fontSize: 9, color: TG.red, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.error}</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: col }}>{l.status}</div>
                  {acc && <div style={{ fontSize: 9, color: TG.muted }}>{acc.username ? `@${acc.username}` : acc.label}</div>}
                  <div style={{ fontSize: 9, color: TG.muted }}>{l.sent_at?.slice(11, 19)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function CampaignsTab({ campaigns, loading, onAction, accounts, openCreate, onCreateClose }: {
  campaigns: Campaign[]; loading: boolean; onAction: ActionFn;
  accounts: Account[]; openCreate: boolean; onCreateClose: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState("");
  const [newText, setNewText]       = useState("");
  const [newAccountId, setNewAccountId] = useState<string>("");
  const [newDelay, setNewDelay]     = useState(15);
  const [newScheduled, setNewScheduled] = useState("");
  const [newTag, setNewTag]         = useState("");
  const [creating, setCreating]     = useState(false);
  const [actionId, setActionId]     = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Campaign | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [logsModal, setLogsModal]   = useState<Campaign | null>(null);
  const [editModal, setEditModal]   = useState<Campaign | null>(null);

  useEffect(() => {
    if (openCreate) { setShowCreate(true); onCreateClose(); }
  }, [openCreate, onCreateClose]);

  const running   = campaigns.filter(c => c.status === "running").length;
  const scheduled = campaigns.filter(c => c.status === "scheduled").length;
  const paused    = campaigns.filter(c => c.status === "paused").length;
  const CAMP_COLORS: Record<string, string> = {
    running: TG.green, scheduled: TG.yellow, paused: TG.blue, done: TG.muted, draft: TG.muted, cancelled: TG.red,
  };

  async function handleCreate() {
    if (!newName.trim() || !newText.trim()) return;
    setCreating(true);
    const body: Record<string, unknown> = {
      name: newName.trim(),
      text_template: newText.trim(),
      status: "draft",
      send_delay_seconds: newDelay,
    };
    if (newAccountId) body.sender_account_id = parseInt(newAccountId);
    if (newScheduled) body.scheduled_at = newScheduled;
    if (newTag.trim()) body.scheduled_tag = newTag.trim();
    await onAction("/api/campaigns", "POST", body);
    setNewName(""); setNewText(""); setNewAccountId(""); setNewDelay(15); setNewScheduled(""); setNewTag("");
    setCreating(false); setShowCreate(false);
  }

  async function handleToggle(c: Campaign) {
    if (actionId === c.id) return;
    const next = c.status === "running" ? "paused" : "running";
    setActionId(c.id);
    await onAction(`/api/campaigns/${c.id}/action`, "POST", { action: next });
    setActionId(null);
  }

  async function handleDelete(c: Campaign) {
    setDeleting(true);
    await onAction(`/api/campaigns/${c.id}`, "DELETE");
    setDeleting(false);
    setDeleteConfirm(null);
  }

  return (
    <>
    {deleteConfirm && (
      <Modal title="Удалить кампанию?" onClose={() => setDeleteConfirm(null)}>
        <div style={{ fontSize: 13, color: TG.textSecondary, lineHeight: 1.6 }}>
          Кампания <span style={{ color: TG.text, fontWeight: 700 }}>«{deleteConfirm.name}»</span> будет удалена без возможности восстановления.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <div onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", fontSize: 13, fontWeight: 700, color: TG.muted, cursor: "pointer" }}>
            Отмена
          </div>
          <div onClick={() => handleDelete(deleteConfirm)} style={{ flex: 2, padding: "11px 0", borderRadius: 14, background: deleting ? `${TG.red}15` : `${TG.red}25`, border: `1px solid ${TG.red}55`, textAlign: "center", fontSize: 13, fontWeight: 800, color: TG.red, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.7 : 1 }}>
            {deleting ? "Удаление…" : "Удалить"}
          </div>
        </div>
      </Modal>
    )}
    {logsModal && (
      <CampaignLogsModal campaign={logsModal} accounts={accounts} onClose={() => setLogsModal(null)} />
    )}
    {editModal && (
      <CampaignEditModal campaign={editModal} accounts={accounts} onAction={onAction} onClose={() => setEditModal(null)} />
    )}
    {showCreate && (
      <Modal title="Новая кампания" onClose={() => setShowCreate(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <GlassInput value={newName} onChange={setNewName} placeholder="Название кампании *" />
          <GlassInput value={newText} onChange={setNewText} placeholder="Текст сообщения… *" multiline />
          {accounts.length > 0 && (
            <select
              value={newAccountId}
              onChange={e => setNewAccountId(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.055)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12, color: newAccountId ? TG.text : TG.muted,
                fontSize: 13, fontFamily: "inherit", padding: "10px 12px",
                outline: "none", backdropFilter: "blur(8px)",
              }}
            >
              <option value="">— Аккаунт-отправитель (опционально) —</option>
              {accounts.filter(a => a.is_active && !a.is_banned).map(a => (
                <option key={a.id} value={String(a.id)} style={{ background: "#0d1021" }}>
                  {a.label || a.phone} ({a.phone})
                </option>
              ))}
            </select>
          )}
          <GlassInput value={newTag} onChange={setNewTag} placeholder="🎯  Целевая аудитория (тег, напр. vip)" />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>Задержка между сообщениями (сек)</div>
              <input
                type="number" min={5} max={120} value={newDelay}
                onChange={e => setNewDelay(Math.max(5, parseInt(e.target.value) || 15))}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 12, color: TG.text,
                  fontSize: 13, fontFamily: "inherit", padding: "10px 12px",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: TG.muted, marginBottom: 4 }}>Запланировать (необяз.)</div>
              <input
                type="datetime-local" value={newScheduled}
                onChange={e => setNewScheduled(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 12, color: TG.text,
                  fontSize: 12, fontFamily: "inherit", padding: "10px 8px",
                  outline: "none", colorScheme: "dark",
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <div onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", fontSize: 13, fontWeight: 700, color: TG.muted, cursor: "pointer" }}>
            Отмена
          </div>
          <div onClick={handleCreate} style={{ flex: 2, padding: "11px 0", borderRadius: 14, background: creating ? `${TG.green}25` : `linear-gradient(135deg,${TG.green}55 0%,${TG.blue}44 100%)`, border: `1px solid ${TG.green}55`, textAlign: "center", fontSize: 13, fontWeight: 800, color: TG.green, cursor: "pointer", opacity: (creating || !newName.trim() || !newText.trim()) ? 0.5 : 1 }}>
            {creating ? "Создание…" : "Создать черновик"}
          </div>
        </div>
      </Modal>
    )}
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 14px", paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>Рассылки</div>
        <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => setShowCreate(true)}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} color={TG.green} />
            <span style={{ fontSize: 12, color: TG.green, fontWeight: 700 }}>Создать</span>
          </div>
        </GlassCard>
      </div>

      {!loading && campaigns.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {running > 0   && <span style={{ fontSize: 10, fontWeight: 700, color: TG.green,  background: `${TG.green}18`,  border: `1px solid ${TG.green}35`,  borderRadius: 20, padding: "4px 10px" }}>{running} активных</span>}
          {scheduled > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: TG.yellow, background: `${TG.yellow}18`, border: `1px solid ${TG.yellow}35`, borderRadius: 20, padding: "4px 10px" }}>{scheduled} запланир.</span>}
          {paused > 0    && <span style={{ fontSize: 10, fontWeight: 700, color: TG.blue,   background: `${TG.blue}18`,   border: `1px solid ${TG.blue}35`,   borderRadius: 20, padding: "4px 10px" }}>{paused} на паузе</span>}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} style={{ height: 100 }} />)}
        </div>
      ) : campaigns.length === 0 ? (
        <GlassCard style={{ padding: "32px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: TG.muted }}>Нет кампаний</div>
          <div onClick={() => setShowCreate(true)} style={{ fontSize: 11, color: TG.green, marginTop: 8, fontWeight: 600, cursor: "pointer" }}>+ Создать первую кампанию</div>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {campaigns.map(c => {
            const color = CAMP_COLORS[c.status] ?? TG.muted;
            const pct = c.target_count > 0 ? Math.round(c.sent_count / c.target_count * 100) : 0;
            const isActing = actionId === c.id;
            return (
              <GlassCard key={c.id} style={{ padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div onClick={() => setLogsModal(c)} style={{ fontSize: 13, fontWeight: 700, color: TG.text, marginBottom: 3, cursor: "pointer" }}>{c.name} <span style={{ fontSize: 10, color: TG.muted, fontWeight: 400 }}>→</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <StatusBadge status={c.status} />
                      {c.created_at && (
                        <span style={{ fontSize: 10, color: TG.muted }}>
                          <Clock size={9} style={{ display: "inline", marginRight: 3 }} />
                          {c.created_at.slice(0, 10)}
                        </span>
                      )}
                      {c.sender_account_id && (() => {
                        const acc = accounts.find(a => a.id === c.sender_account_id);
                        if (!acc) return null;
                        return (
                          <span style={{ fontSize: 9, color: TG.blue, background: `${TG.blue}18`, border: `1px solid ${TG.blue}30`, borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>
                            {acc.username ? `@${acc.username}` : acc.label || acc.phone}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {c.status === "draft" && (
                      <>
                        <div onClick={() => setEditModal(c)} style={{
                          width: 30, height: 30, borderRadius: 10, cursor: "pointer",
                          background: `${TG.muted}12`, border: `1px solid ${TG.muted}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Pencil size={12} color={TG.muted} />
                        </div>
                        <div onClick={() => { setActionId(c.id); onAction(`/api/campaigns/${c.id}/action`, "POST", { action: "running" }).then(() => setActionId(null)); }} style={{
                          width: 30, height: 30, borderRadius: 10, cursor: isActing ? "default" : "pointer", opacity: isActing ? 0.5 : 1,
                          background: `${TG.green}18`, border: `1px solid ${TG.green}40`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "opacity 0.2s",
                        }}>
                          <Play size={13} color={TG.green} />
                        </div>
                      </>
                    )}
                    {(c.status === "running" || c.status === "paused") && (
                      <>
                        <div onClick={() => handleToggle(c)} style={{
                          width: 30, height: 30, borderRadius: 10, cursor: isActing ? "default" : "pointer", opacity: isActing ? 0.5 : 1,
                          background: c.status === "running" ? `${TG.green}18` : `${TG.blue}18`,
                          border: `1px solid ${c.status === "running" ? TG.green : TG.blue}40`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "opacity 0.2s",
                        }}>
                          {c.status === "running" ? <Pause size={13} color={TG.green} /> : <Play size={13} color={TG.blue} />}
                        </div>
                        <div onClick={() => { setActionId(c.id); onAction(`/api/campaigns/${c.id}/action`, "POST", { action: "cancelled" }).then(() => setActionId(null)); }} style={{
                          width: 30, height: 30, borderRadius: 10, cursor: isActing ? "default" : "pointer", opacity: isActing ? 0.5 : 1,
                          background: `${TG.red}12`, border: `1px solid ${TG.red}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "opacity 0.2s",
                        }} title="Остановить кампанию">
                          <Square size={12} color={TG.red} />
                        </div>
                      </>
                    )}
                    {(c.status === "done" || c.status === "cancelled" || c.status === "draft") && (
                      <div onClick={() => { setActionId(c.id); onAction(`/api/campaigns/${c.id}/duplicate`, "POST", {}).then(() => setActionId(null)); }} style={{
                        width: 30, height: 30, borderRadius: 10, cursor: isActing ? "default" : "pointer", opacity: isActing ? 0.5 : 1,
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "opacity 0.2s",
                      }} title="Дублировать кампанию">
                        <Copy size={12} color={TG.muted} />
                      </div>
                    )}
                    {(c.status === "done" || c.status === "cancelled") && (
                      <div onClick={() => { setActionId(c.id); onAction(`/api/campaigns/${c.id}/reset`, "POST", {}).then(() => setActionId(null)); }} style={{
                        width: 30, height: 30, borderRadius: 10, cursor: isActing ? "default" : "pointer", opacity: isActing ? 0.5 : 1,
                        background: `${TG.purple}18`, border: `1px solid ${TG.purple}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "opacity 0.2s",
                      }} title="Сбросить и перезапустить">
                        <Zap size={13} color={TG.purple} />
                      </div>
                    )}
                    {(c.status === "draft" || c.status === "done" || c.status === "cancelled") && (
                      <div onClick={() => setDeleteConfirm(c)} style={{
                        width: 30, height: 30, borderRadius: 10, cursor: "pointer",
                        background: `${TG.red}12`,
                        border: `1px solid ${TG.red}35`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "opacity 0.2s",
                      }}>
                        <Trash2 size={13} color={TG.red} />
                      </div>
                    )}
                  </div>
                </div>
                {c.target_count > 0 ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: TG.muted }}>Отправлено</span>
                      <span style={{ fontSize: 10, color, fontWeight: 700 }}>
                        {c.sent_count.toLocaleString("ru")} / {c.target_count.toLocaleString("ru")} ({pct}%)
                        {c.failed_count > 0 && <span style={{ color: TG.red, marginLeft: 6 }}>· {c.failed_count} ❌</span>}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}aa)`, boxShadow: pct > 0 ? `0 0 6px ${color}88` : "none" }} />
                    </div>
                  </div>
                ) : c.sent_count > 0 ? (
                  <div style={{ fontSize: 11, color: TG.muted }}>
                    Отправлено: <span style={{ color, fontWeight: 700 }}>{c.sent_count.toLocaleString("ru")}</span>
                    {c.failed_count > 0 && <span style={{ color: TG.red, marginLeft: 8 }}>Ошибок: {c.failed_count}</span>}
                  </div>
                ) : null}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}

function AnalyticsTab({ overview, trend, loading }: { overview: Overview | null; trend: TrendPoint[]; loading: boolean }) {
  const kpis = overview ? [
    { label: "Охват",      value: fmtNum(overview.totalUsers),           delta: "",                    color: TG.blue },
    { label: "CTR",        value: `${overview.avgCtr.toFixed(1)}%`,      delta: `+${overview.ctrDelta.toFixed(1)}%`,  color: TG.green },
    { label: "Open Rate",  value: `${overview.avgOpenRate.toFixed(1)}%`, delta: `+${overview.openDelta.toFixed(1)}%`, color: TG.purple },
    { label: "Отправлено", value: fmtNum(overview.totalSent),            delta: `+${overview.sentDelta.toFixed(1)}%`, color: TG.yellow },
  ] : [];

  const chartData = trend.map(t => ({ d: t.date, sent: t.sent, conv: t.opened }));

  const fuelMix = [
    { name: "АИ-92",  value: 38, color: TG.blue },
    { name: "АИ-95",  value: 29, color: TG.green },
    { name: "АИ-98",  value: 17, color: TG.purple },
    { name: "Дизель", value: 16, color: TG.orange },
  ];

  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 14px", paddingBottom: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em", paddingTop: 4 }}>Аналитика</div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} style={{ height: 68 }} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {kpis.map(k => (
            <GlassCard key={k.label} style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: TG.muted, marginBottom: 4 }}>{k.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: TG.text }}>{k.value}</span>
                {k.delta && <span style={{ fontSize: 10, color: k.color, fontWeight: 700 }}>{k.delta}</span>}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassCard style={{ padding: "14px 14px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: TG.textSecondary, marginBottom: 12 }}>
          Рассылки vs Открытия (7 дней)
        </div>
        {loading || chartData.length === 0 ? (
          <SkeletonCard style={{ height: 120, borderRadius: 8 }} />
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TG.blue} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={TG.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TG.green} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={TG.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fill: TG.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: TG.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(7,9,20,0.88)", border: `1px solid ${TG.glassBorder}`, borderRadius: 10, backdropFilter: BLUR }} itemStyle={{ color: TG.textSecondary, fontSize: 11 }} labelStyle={{ color: TG.text, fontWeight: 700, fontSize: 11 }} />
              <Area type="monotone" dataKey="sent" stroke={TG.blue} strokeWidth={2} fill="url(#gSent)" dot={false} name="Отправлено" />
              <Area type="monotone" dataKey="conv" stroke={TG.green} strokeWidth={2} fill="url(#gConv)" dot={false} name="Открыто" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      <GlassCard style={{ padding: "14px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: TG.textSecondary, marginBottom: 12 }}>Топливный микс</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PieChart width={100} height={100}>
            <Pie data={fuelMix} cx={46} cy={46} innerRadius={28} outerRadius={46} paddingAngle={2} dataKey="value" strokeWidth={0}>
              {fuelMix.map(e => <Cell key={e.name} fill={e.color} />)}
            </Pie>
          </PieChart>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            {fuelMix.map(f => (
              <div key={f.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: f.color }} />
                  <span style={{ fontSize: 11, color: TG.textSecondary }}>{f.name}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: f.color }}>{f.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {!loading && chartData.length > 0 && (
        <GlassCard style={{ padding: "14px 14px 8px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TG.textSecondary, marginBottom: 12 }}>
            Отправки по дням
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chartData} barSize={18} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="d" tick={{ fill: TG.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: TG.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(7,9,20,0.88)", border: `1px solid ${TG.glassBorder}`, borderRadius: 10 }} itemStyle={{ color: TG.textSecondary, fontSize: 11 }} labelStyle={{ color: TG.text, fontWeight: 700, fontSize: 11 }} />
              <defs>
                <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TG.orange} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={TG.orange} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <Bar dataKey="sent" fill="url(#gBar)" radius={[4, 4, 0, 0]} name="Отправлено" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  );
}

function AudienceTab({ overview }: { overview: Overview | null }) {
  const [activeTag, setActiveTag]   = useState("");
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebSearch] = useState("");
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [total, setTotal]           = useState(0);
  const [allTags, setAllTags]       = useState<string[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  const TAG_COLORS: Record<string, string> = {
    vip: TG.purple, inactive: TG.red, active: TG.green, premium: TG.yellow, new: TG.blue,
  };
  const USER_COLORS = [TG.purple, TG.green, TG.blue, TG.orange, TG.pink];

  // Load all tags once for filter chips
  useEffect(() => {
    apiFetch("/api/audience?limit=200")
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(d => {
        const tags = Array.from(new Set<string>((d.rows as UserRow[]).flatMap((u: UserRow) => parseTags(u.tags))));
        setAllTags(tags);
      })
      .catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch users whenever filter or search changes
  useEffect(() => {
    setFetchLoading(true);
    const p = new URLSearchParams({ limit: "100" });
    if (activeTag) p.set("tag", activeTag);
    if (debouncedSearch) p.set("search", debouncedSearch);
    apiFetch(`/api/audience?${p}`)
      .then(r => r.ok ? r.json() : { total: 0, rows: [] })
      .then(d => { setUsers(Array.isArray(d.rows) ? d.rows : []); setTotal(d.total ?? 0); setFetchLoading(false); })
      .catch(() => setFetchLoading(false));
  }, [activeTag, debouncedSearch]);

  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 14px", paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>Аудитория</div>
      </div>

      {fetchLoading && users.length === 0 ? (
        <SkeletonCard style={{ height: 72 }} />
      ) : (
        <GlassCard glow={TG.blueGlow + "20"} style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: TG.text, letterSpacing: "-0.04em" }}>
                {(overview?.totalUsers ?? total).toLocaleString("ru")}
              </div>
              <div style={{ fontSize: 12, color: TG.textSecondary }}>Всего пользователей</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {activeTag || debouncedSearch ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TG.blue }}>{total.toLocaleString("ru")} найдено</div>
                  <div style={{ fontSize: 10, color: TG.muted }}>по фильтру</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TG.green }}>{allTags.length || "—"} тегов</div>
                  <div style={{ fontSize: 10, color: TG.muted }}>сегментов</div>
                </>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Search box */}
      <GlassInput value={search} onChange={setSearch} placeholder="🔍  Поиск по имени, @username, ID…" />

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {(["", ...allTags] as string[]).map(tag => {
            const color = tag ? (TAG_COLORS[tag] ?? TG.blue) : TG.blue;
            const active = activeTag === tag;
            return (
              <div
                key={tag || "__all"}
                onClick={() => setActiveTag(active && tag ? "" : tag)}
                style={{ height: 28, borderRadius: 20, cursor: "pointer", padding: "0 12px", display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, background: active ? `${color}28` : "rgba(255,255,255,0.06)", border: `1px solid ${active ? color + "60" : "rgba(255,255,255,0.12)"}`, color: active ? color : TG.muted, transition: "all 0.15s" }}
              >
                {tag || "Все"}
              </div>
            );
          })}
        </div>
      )}

      {/* User list */}
      {fetchLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[0, 1, 2].map(i => <SkeletonCard key={i} style={{ height: 62 }} />)}
        </div>
      ) : users.length === 0 ? (
        <GlassCard style={{ padding: "32px 14px", textAlign: "center" }}>
          <Users2 size={32} color={TG.muted} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: TG.muted }}>
            {activeTag || debouncedSearch ? "Ничего не найдено" : "Нет пользователей в базе"}
          </div>
        </GlassCard>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {users.map((u, i) => {
              const tags = parseTags(u.tags);
              const displayName = u.username ? `@${u.username}` : u.first_name || `User ${u.chat_id}`;
              const color = USER_COLORS[i % USER_COLORS.length];
              return (
                <GlassCard key={u.chat_id} style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `linear-gradient(145deg,${color}35 0%,${color}15 100%)`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color }}>
                      {displayName[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TG.text }}>{displayName}</span>
                        {tags.map(tag => {
                          const tc = TAG_COLORS[tag] ?? TG.blue;
                          return (
                            <span key={tag} onClick={() => setActiveTag(tag)} style={{ fontSize: 9, fontWeight: 700, color: tc, background: `${tc}18`, border: `1px solid ${tc}35`, borderRadius: 20, padding: "1px 6px", cursor: "pointer" }}>{tag}</span>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 10, color: TG.muted, marginTop: 1 }}>
                        ID: {u.chat_id}{u.last_seen ? ` · актив. ${u.last_seen.slice(0, 10)}` : u.first_seen ? ` · с ${u.first_seen.slice(0, 10)}` : ""}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
          {total > users.length && (
            <div style={{ textAlign: "center", fontSize: 11, color: TG.muted, padding: "4px 0" }}>
              Показано {users.length} из {total.toLocaleString("ru")}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AccountsTab({ accounts, loading, onAction }: { accounts: Account[]; loading: boolean; onAction: ActionFn }) {
  const [showAdd, setShowAdd]     = useState(false);
  const [newPhone, setNewPhone]   = useState("");
  const [newLabel, setNewLabel]   = useState("");
  const [newApiId, setNewApiId]   = useState("");
  const [newApiHash, setNewApiHash] = useState("");
  const [adding, setAdding]       = useState(false);
  const [deleteAccConfirm, setDeleteAccConfirm] = useState<Account | null>(null);
  const [deletingAcc, setDeletingAcc] = useState(false);

  const [authAccId, setAuthAccId]         = useState<number | null>(null);
  const [authStep, setAuthStep]           = useState<"otp" | "2fa" | null>(null);
  const [authPhoneCodeHash, setAuthPhoneCodeHash] = useState("");
  const [authCode, setAuthCode]           = useState("");
  const [authPassword, setAuthPassword]   = useState("");
  const [authLoading, setAuthLoading]     = useState(false);
  const [authError, setAuthError]         = useState("");

  const active  = accounts.filter(a => a.is_active && !a.is_banned);
  const sending = accounts.filter(a => a.status === "sending");
  const banned  = accounts.filter(a => a.is_banned);
  const totalSentToday = accounts.reduce((s, a) => s + (a.sent_today ?? 0), 0);
  const DAILY_LIMIT = 300;

  const statusMeta: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    idle:       { label: "Готов",        color: TG.green,  bg: `${TG.green}18`,  icon: ShieldCheck },
    sending:    { label: "Отправка",     color: TG.blue,   bg: `${TG.blue}18`,   icon: Activity },
    flood_wait: { label: "FloodWait",    color: TG.yellow, bg: `${TG.yellow}18`, icon: AlertTriangle },
    banned:     { label: "Заблокирован", color: TG.red,    bg: `${TG.red}18`,    icon: ShieldOff },
    offline:    { label: "Офлайн",       color: TG.muted,  bg: "rgba(255,255,255,0.07)", icon: WifiOff },
  };

  function getStatus(acc: Account) {
    if (acc.is_banned) return "banned";
    if (!acc.is_active) return "offline";
    return acc.status in statusMeta ? acc.status : "idle";
  }

  async function handleAdd() {
    if (!newPhone.trim()) return;
    setAdding(true);
    const body: Record<string, unknown> = {
      phone: newPhone.trim(), label: newLabel.trim() || newPhone.trim(),
      status: "idle", is_active: 1, is_banned: 0,
    };
    if (newApiId.trim()) body.api_id = parseInt(newApiId.trim());
    if (newApiHash.trim()) body.api_hash = newApiHash.trim();
    await onAction("/api/accounts", "POST", body);
    setNewPhone(""); setNewLabel(""); setNewApiId(""); setNewApiHash("");
    setAdding(false); setShowAdd(false);
  }

  async function handleDeleteAcc(acc: Account) {
    setDeletingAcc(true);
    await onAction(`/api/accounts/${acc.id}`, "DELETE");
    setDeletingAcc(false);
    setDeleteAccConfirm(null);
  }

  function resetAuth() {
    setAuthAccId(null); setAuthStep(null);
    setAuthCode(""); setAuthPassword(""); setAuthPhoneCodeHash(""); setAuthError("");
  }

  async function handleStartAuth(acc: Account) {
    setAuthAccId(acc.id); setAuthLoading(true); setAuthError(""); setAuthStep(null);
    try {
      const r = await apiFetch(`${API_BASE}/api/accounts/${acc.id}/start-auth`, { method: "POST" });
      const d = await r.json() as Record<string, unknown>;
      if (!r.ok) { setAuthError(String(d.error ?? "Ошибка")); setAuthAccId(null); }
      else if (d.already_authorized) {
        await onAction(`/api/accounts/${acc.id}`, "PUT", { session_file: String(d.session_file), username: String(d.display_name) });
        resetAuth();
      } else {
        setAuthPhoneCodeHash(String(d.phone_code_hash));
        setAuthStep("otp");
      }
    } catch { setAuthError("Сервер авторизации недоступен"); setAuthAccId(null); }
    setAuthLoading(false);
  }

  async function handleConfirmOtp() {
    if (!authCode.trim() || authAccId === null) return;
    setAuthLoading(true); setAuthError("");
    try {
      const r = await apiFetch(`${API_BASE}/api/accounts/${authAccId}/confirm-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: authCode.trim(), phone_code_hash: authPhoneCodeHash }),
      });
      const d = await r.json() as Record<string, unknown>;
      if (d.needs_2fa) { setAuthStep("2fa"); setAuthCode(""); }
      else if (d.ok) { await onAction(`/api/accounts`, "GET"); resetAuth(); }
      else setAuthError(String(d.error ?? "Неверный код"));
    } catch { setAuthError("Ошибка подключения"); }
    setAuthLoading(false);
  }

  async function handleConfirm2FA() {
    if (!authPassword.trim() || authAccId === null) return;
    setAuthLoading(true); setAuthError("");
    try {
      const r = await apiFetch(`${API_BASE}/api/accounts/${authAccId}/confirm-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: authPassword.trim() }),
      });
      const d = await r.json() as Record<string, unknown>;
      if (d.ok) { await onAction(`/api/accounts`, "GET"); resetAuth(); }
      else setAuthError(String(d.error ?? "Неверный пароль"));
    } catch { setAuthError("Ошибка подключения"); }
    setAuthLoading(false);
  }

  return (
    <>
    {showAdd && (
      <Modal title="Добавить аккаунт" onClose={() => setShowAdd(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <GlassInput value={newPhone} onChange={setNewPhone} placeholder="+7 900 000 00 00 *" />
          <GlassInput value={newLabel} onChange={setNewLabel} placeholder="Метка (необязательно)" />
          <div style={{ display: "flex", gap: 8 }}>
            <GlassInput value={newApiId} onChange={setNewApiId} placeholder="API ID (my.telegram.org)" />
            <GlassInput value={newApiHash} onChange={setNewApiHash} placeholder="API Hash" />
          </div>
          <div style={{ fontSize: 11, color: TG.muted, lineHeight: 1.5 }}>
            API ID и Hash получите на <span style={{ color: TG.blue }}>my.telegram.org</span>. После добавления нажмите «Авторизовать» на карточке аккаунта.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <div onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", fontSize: 13, fontWeight: 700, color: TG.muted, cursor: "pointer" }}>
            Отмена
          </div>
          <div onClick={handleAdd} style={{ flex: 2, padding: "11px 0", borderRadius: 14, background: adding ? `${TG.pink}20` : `linear-gradient(135deg,${TG.pink}55 0%,${TG.purple}44 100%)`, border: `1px solid ${TG.pink}55`, textAlign: "center", fontSize: 13, fontWeight: 800, color: TG.pink, cursor: "pointer", opacity: adding ? 0.7 : 1 }}>
            {adding ? "Добавление…" : "Добавить аккаунт"}
          </div>
        </div>
      </Modal>
    )}
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 14px", paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: TG.text, letterSpacing: "-0.02em" }}>Аккаунты</div>
        <GlassCard style={{ padding: "8px 12px", borderRadius: 14, cursor: "pointer" }} onClick={() => setShowAdd(true)}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} color={TG.pink} />
            <span style={{ fontSize: 12, color: TG.pink, fontWeight: 700 }}>Добавить</span>
          </div>
        </GlassCard>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} style={{ height: 60 }} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Всего",    value: String(accounts.length),             color: TG.text },
            { label: "Активных", value: String(active.length),               color: TG.green },
            { label: "Сегодня",  value: totalSentToday.toLocaleString("ru"), color: TG.blue },
          ].map(s => (
            <GlassCard key={s.label} style={{ padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{s.label}</div>
            </GlassCard>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} style={{ height: 90 }} />)}
        </div>
      ) : accounts.length === 0 ? (
        <GlassCard style={{ padding: "32px 14px", textAlign: "center" }}>
          <Shield size={32} color={TG.muted} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: TG.muted }}>Нет аккаунтов-отправителей</div>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {accounts.map(acc => {
            const st = getStatus(acc);
            const sm = statusMeta[st] ?? statusMeta.offline;
            const Icon = sm.icon;
            const pct = Math.min(Math.round(((acc.sent_today ?? 0) / DAILY_LIMIT) * 100), 100);
            const barColor = pct > 90 ? TG.red : pct > 70 ? TG.yellow : TG.green;
            return (
              <GlassCard key={acc.id} style={{ padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(145deg,${sm.color}30 0%,${sm.color}12 100%)`, border: `1px solid ${sm.color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={16} color={sm.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TG.text }}>{acc.label || "Без названия"}</div>
                      <div style={{ fontSize: 10, color: TG.muted }}>
                        {acc.username ? <span style={{ color: TG.blue }}>{acc.username} · </span> : null}
                        {acc.phone}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {acc.session_file ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: TG.green, background: `${TG.green}18`, border: `1px solid ${TG.green}40`, borderRadius: 20, padding: "3px 8px" }}>
                        ✓ Авторизован
                      </span>
                    ) : acc.api_id ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: TG.yellow, background: `${TG.yellow}18`, border: `1px solid ${TG.yellow}40`, borderRadius: 20, padding: "3px 8px" }}>
                        ⚠ Не авторизован
                      </span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 700, color: sm.color, background: sm.bg, border: `1px solid ${sm.color}40`, borderRadius: 20, padding: "3px 8px" }}>
                        {st === "sending" && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: sm.color, marginRight: 4, animation: "pulse 1s infinite", verticalAlign: "middle" }} />}
                        {sm.label}
                      </span>
                    )}
                    {acc.api_id && (
                      <div
                        onClick={() => authAccId !== acc.id && handleStartAuth(acc)}
                        style={{ height: 26, borderRadius: 8, cursor: authLoading && authAccId === acc.id ? "default" : "pointer", background: acc.session_file ? "rgba(255,255,255,0.06)" : `${TG.blue}18`, border: `1px solid ${acc.session_file ? "rgba(255,255,255,0.12)" : TG.blue + "40"}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "0 8px", opacity: authLoading && authAccId === acc.id ? 0.6 : 1 }}
                        title={acc.session_file ? "Обновить авторизацию" : "Авторизовать аккаунт"}
                      >
                        <KeyRound size={11} color={acc.session_file ? TG.muted : TG.blue} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: acc.session_file ? TG.muted : TG.blue }}>
                          {authLoading && authAccId === acc.id ? "…" : acc.session_file ? "Обновить" : "Авторизовать"}
                        </span>
                      </div>
                    )}
                    <div onClick={() => setDeleteAccConfirm(acc)} style={{ width: 26, height: 26, borderRadius: 8, cursor: "pointer", background: `${TG.red}12`, border: `1px solid ${TG.red}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={12} color={TG.red} />
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: TG.muted }}>Дневной лимит</span>
                    <span style={{ fontSize: 10, color: barColor, fontWeight: 700 }}>
                      {(acc.sent_today ?? 0).toLocaleString("ru")} / {DAILY_LIMIT}
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg,${barColor},${barColor}99)`, boxShadow: `0 0 6px ${barColor}88` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: TG.muted }}>
                      Всего: <span style={{ color: TG.green, fontWeight: 700 }}>{(acc.sent_total ?? 0).toLocaleString("ru")}</span> отправлено
                      {(acc.failed_total ?? 0) > 0 && <span style={{ color: TG.red, marginLeft: 6 }}>· <span style={{ fontWeight: 700 }}>{acc.failed_total.toLocaleString("ru")}</span> ошибок</span>}
                    </span>
                  </div>
                  {acc.last_error && (
                    <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6, background: `${TG.red}10`, borderRadius: 6, padding: "3px 7px" }}>
                      <span style={{ fontSize: 9, color: TG.red, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⚠ {acc.last_error}</span>
                      <span onClick={() => onAction(`/api/accounts/${acc.id}`, "PUT", { last_error: null, ...(acc.is_banned ? { is_banned: 0, status: "idle" } : {}) })} style={{ fontSize: 9, color: TG.muted, cursor: "pointer", flexShrink: 0 }} title="Очистить ошибку">×</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
    {authStep === "otp" && authAccId !== null && (
      <Modal title="Введите код из Telegram" onClose={resetAuth}>
        <div style={{ fontSize: 13, color: TG.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Telegram отправил вам SMS или сообщение в приложение. Введите код ниже.
        </div>
        <GlassInput value={authCode} onChange={setAuthCode} placeholder="12345" />
        {authError && <div style={{ fontSize: 12, color: TG.red, marginTop: 8 }}>{authError}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <div onClick={resetAuth} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", fontSize: 13, fontWeight: 700, color: TG.muted, cursor: "pointer" }}>
            Отмена
          </div>
          <div onClick={handleConfirmOtp} style={{ flex: 2, padding: "11px 0", borderRadius: 14, background: authLoading ? `${TG.blue}20` : `linear-gradient(135deg,${TG.blue}55 0%,${TG.purple}44 100%)`, border: `1px solid ${TG.blue}55`, textAlign: "center", fontSize: 13, fontWeight: 800, color: TG.blue, cursor: "pointer", opacity: authLoading || !authCode.trim() ? 0.6 : 1 }}>
            {authLoading ? "Проверка…" : "Подтвердить"}
          </div>
        </div>
      </Modal>
    )}
    {authStep === "2fa" && authAccId !== null && (
      <Modal title="Двухфакторная аутентификация" onClose={resetAuth}>
        <div style={{ fontSize: 13, color: TG.muted, marginBottom: 12, lineHeight: 1.5 }}>
          На этом аккаунте включена облачная защита паролем. Введите пароль 2FA из Telegram.
        </div>
        <GlassInput value={authPassword} onChange={setAuthPassword} placeholder="Пароль 2FA" />
        {authError && <div style={{ fontSize: 12, color: TG.red, marginTop: 8 }}>{authError}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <div onClick={resetAuth} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", fontSize: 13, fontWeight: 700, color: TG.muted, cursor: "pointer" }}>
            Отмена
          </div>
          <div onClick={handleConfirm2FA} style={{ flex: 2, padding: "11px 0", borderRadius: 14, background: authLoading ? `${TG.green}20` : `linear-gradient(135deg,${TG.green}55 0%,${TG.blue}44 100%)`, border: `1px solid ${TG.green}55`, textAlign: "center", fontSize: 13, fontWeight: 800, color: TG.green, cursor: "pointer", opacity: authLoading || !authPassword.trim() ? 0.6 : 1 }}>
            {authLoading ? "Проверка…" : "Войти"}
          </div>
        </div>
      </Modal>
    )}
    {deleteAccConfirm && (
      <Modal title="Удалить аккаунт?" onClose={() => setDeleteAccConfirm(null)}>
        <div style={{ fontSize: 13, color: TG.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Аккаунт <span style={{ color: TG.text, fontWeight: 700 }}>{deleteAccConfirm.label || deleteAccConfirm.phone}</span> будет удалён без возможности восстановления.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div onClick={() => setDeleteAccConfirm(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", fontSize: 13, fontWeight: 700, color: TG.muted, cursor: "pointer" }}>
            Отмена
          </div>
          <div onClick={() => handleDeleteAcc(deleteAccConfirm)} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: `${TG.red}18`, border: `1px solid ${TG.red}50`, textAlign: "center", fontSize: 13, fontWeight: 800, color: TG.red, cursor: "pointer", opacity: deletingAcc ? 0.6 : 1 }}>
            {deletingAcc ? "Удаление…" : "Удалить"}
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}

function LoginScreen({ onLogin }: { onLogin: (secret: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!pw.trim()) return;
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: pw }),
      });
      if (r.ok) {
        sessionStorage.setItem("crm_secret", pw);
        onLogin(pw);
      } else {
        setErr("Неверный пароль");
      }
    } catch {
      setErr("Ошибка подключения");
    }
    setLoading(false);
  }

  return (
    <div className="login-wrapper">
      <div className={`login-card${err ? " shake" : ""}`}>
        <span className="login-logo">⛽</span>
        <h1>PROMO-Fuel CRM</h1>
        <p>Введите пароль для входа</p>
        <form onSubmit={e => { e.preventDefault(); handleLogin(); }}>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); if (err) setErr(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Пароль"
          />
          {err && (
            <div style={{ color: 'var(--status-cancelled)', fontSize: '0.82rem', marginTop: '-0.4rem', textAlign: 'center' }}>
              {err}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? "Проверка…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

function UploadTab() {
  const [file, setFile]       = useState<File | null>(null);
  const [status, setStatus]   = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult]   = useState<{ key: string; count: number; filename: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploads, setUploads] = useState<{ key: string; filename: string; uploaded_at: string; count: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const ALLOWED = [".html", ".csv", ".tsv", ".json", ".jsonl"];

  useEffect(() => {
    apiFetch(`${API_BASE}/api/upload`).then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data)) setUploads(data);
    }).catch(() => {});
  }, [result]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setErrorMsg(`Формат не поддерживается. Используйте: ${ALLOWED.join(", ")}`);
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const secret = getCrmSecret();
      const headers: Record<string, string> = {};
      if (secret) headers["Authorization"] = `Bearer ${secret}`;
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers,
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const data = await res.json();
      setResult(data);
      setStatus("done");
      setFile(null);
    } catch (e: unknown) {
      setErrorMsg((e as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 14px", paddingBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 6px" }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#eef2ff" }}>📁 Файлы аудитории</div>
          <div style={{ fontSize: 12, color: "rgba(238,242,255,0.4)", marginTop: 2 }}>Загрузка CSV, TSV, JSON, JSONL, HTML</div>
        </div>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          borderRadius: 16,
          border: "2px dashed rgba(255,159,64,0.4)",
          background: "rgba(255,159,64,0.05)",
          padding: "32px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          style={{ display: "none" }}
          onChange={onFileChange}
        />
        {file ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ color: "#ff9f40", fontWeight: 700, fontSize: 14 }}>{file.name}</div>
            <div style={{ color: "rgba(238,242,255,0.4)", fontSize: 12, marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
            <div style={{ color: "rgba(238,242,255,0.6)", fontSize: 14 }}>Нажмите для выбора файла</div>
            <div style={{ color: "rgba(238,242,255,0.3)", fontSize: 12, marginTop: 4 }}>
              {ALLOWED.join(", ")} · до 10 МБ
            </div>
          </>
        )}
      </div>

      {file && status === "idle" && (
        <button
          onClick={handleUpload}
          style={{
            padding: "13px",
            borderRadius: 12,
            background: "linear-gradient(135deg,rgba(255,159,64,0.5),rgba(255,159,64,0.3))",
            border: "1px solid rgba(255,159,64,0.4)",
            color: "#ff9f40",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}
        >
          ⬆️ Загрузить файл
        </button>
      )}
      {status === "uploading" && <div style={{ textAlign: "center", color: "rgba(238,242,255,0.5)", fontSize: 14, padding: 8 }}>⏳ Загружаю...</div>}
      {status === "error" && <div style={{ color: "#ff6b7a", fontSize: 13, padding: "8px 0" }}>❌ {errorMsg}</div>}
      {status === "done" && result && (
        <div style={{
          borderRadius: 14, background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.25)",
          padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <CheckCircle2 size={20} color="#2de897" />
          <div>
            <div style={{ color: "#2de897", fontWeight: 700, fontSize: 14 }}>
              Загружено {result.count} записей
            </div>
            <div style={{ color: "rgba(238,242,255,0.4)", fontSize: 12, marginTop: 2 }}>{result.filename}</div>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(238,242,255,0.5)", paddingTop: 8, paddingBottom: 2 }}>
            ИСТОРИЯ ЗАГРУЗОК
          </div>
          {uploads.map(u => (
            <div key={u.key} style={{
              borderRadius: 14,
              background: "linear-gradient(145deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "12px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ color: "#eef2ff", fontSize: 13, fontWeight: 600 }}>{u.filename}</div>
                <div style={{ color: "rgba(238,242,255,0.4)", fontSize: 11, marginTop: 2 }}>
                  {u.uploaded_at?.slice(0, 16).replace("T", " ")}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ff9f40" }}>
                {u.count} записей
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed]       = useState(() => {
    return !!sessionStorage.getItem("crm_secret");
  });
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [overview, setOverview]   = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [trend, setTrend]         = useState<TrendPoint[]>([]);
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [loading, setLoading]     = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [ov, camps, tr, us, accs] = await Promise.all([
        apiFetch(`${API_BASE}/api/analytics/overview`).then(r => r.status === 401 ? null : r.json()).catch(() => null),
        apiFetch(`${API_BASE}/api/campaigns`).then(r => r.ok ? r.json() : []).catch(() => []),
        apiFetch(`${API_BASE}/api/analytics/trend?days=7`).then(r => r.ok ? r.json() : []).catch(() => []),
        apiFetch(`${API_BASE}/api/users`).then(r => r.ok ? r.json() : []).catch(() => []),
        apiFetch(`${API_BASE}/api/accounts`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (ov && !ov.error) setOverview(ov);
      if (Array.isArray(camps)) setCampaigns(camps);
      if (Array.isArray(tr)) setTrend(tr);
      if (Array.isArray(us)) setUsers(us);
      if (Array.isArray(accs)) setAccounts(accs);
    } catch {}
    setLoading(false);
  }, []);

  const onAction = useCallback(async (path: string, method = "POST", body?: Record<string, unknown>) => {
    try {
      await apiFetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {}
    await fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!authed) return;
    fetchAll();
    const slow = setInterval(fetchAll, 30_000);
    return () => clearInterval(slow);
  }, [authed, fetchAll]);

  useEffect(() => {
    if (!authed) return;
    const fast = setInterval(async () => {
      const running = campaigns.some(c => c.status === "running");
      if (!running) return;
      try {
        const camps = await apiFetch(`${API_BASE}/api/campaigns`).then(r => r.ok ? r.json() : null);
        if (Array.isArray(camps)) setCampaigns(camps);
      } catch {}
    }, 5_000);
    return () => clearInterval(fast);
  }, [authed, campaigns]);

  if (!authed) {
    return <LoginScreen onLogin={() => { setAuthed(true); }} />;
  }

  return (
    <div className="app-root" style={{
      width: "100vw", height: "100dvh",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div className="bg-mesh" aria-hidden="true" />
      <div style={{
        width: "100%", maxWidth: 430, height: "100%", maxHeight: 932,
        background: TG.bg, borderRadius: 0,
        display: "flex", flexDirection: "column", overflow: "hidden",
        position: "relative",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.7)",
        zIndex: 1,
      }}>
        <MeshBg />
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: 4, scrollbarWidth: "none", position: "relative", zIndex: 5 }}>
          {activeTab === "home"      && <HomeTab      overview={overview} campaigns={campaigns} loading={loading} onNav={setActiveTab} onCreateCampaign={() => { setActiveTab("campaigns"); setOpenCreate(true); }} />}
          {activeTab === "campaigns" && <CampaignsTab campaigns={campaigns} loading={loading} onAction={onAction} accounts={accounts} openCreate={openCreate} onCreateClose={() => setOpenCreate(false)} />}
          {activeTab === "analytics" && <AnalyticsTab overview={overview} trend={trend} loading={loading} />}
          {activeTab === "audience"  && <AudienceTab  overview={overview} />}
          {activeTab === "accounts"  && <AccountsTab  accounts={accounts} loading={loading} onAction={onAction} />}
          {activeTab === "upload"    && <UploadTab />}
          <div style={{ height: 16 }} />
        </div>
        <div style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
          <BottomNav active={activeTab} onNav={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
