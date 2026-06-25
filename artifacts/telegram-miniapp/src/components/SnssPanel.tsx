import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Trash2, Shield, AlertTriangle } from "lucide-react";

const GLASS  = "rgba(255,255,255,0.055)";
const GLASS2 = "rgba(255,255,255,0.09)";
const BORDER = "rgba(255,255,255,0.10)";
const ACCENT = "#f59e0b";
const GREEN  = "#2de897";
const RED    = "#ff6b7a";
const BLUE   = "#3b82f6";
const PURPLE = "#c4aeff";

interface SnssPrefix {
  prefix: string;
  country_id: string;
  count: number;
  last_seen: number;
  pricing_options: string[];
  example_phones: string[];
}

interface SnssStats {
  prefix_count: number;
  country_count: number;
  countries: string[];
  total_hits: number;
  min_count: number;
  prefixes: SnssPrefix[];
}

const FLAGS: Record<string, string> = {
  ua: "🇺🇦", uz: "🇺🇿", kz: "🇰🇿", ru: "🇷🇺", by: "🇧🇾",
  kg: "🇰🇬", az: "🇦🇿", ge: "🇬🇪", am: "🇦🇲", md: "🇲🇩",
  tj: "🇹🇯", tm: "🇹🇲", ph: "🇵🇭", bd: "🇧🇩", in: "🇮🇳",
  de: "🇩🇪", gb: "🇬🇧", us: "🇺🇸", pl: "🇵🇱", ee: "🇪🇪",
  lt: "🇱🇹", lv: "🇱🇻", id: "🇮🇩", vn: "🇻🇳",
};

function ago(epoch: number) {
  const d = Date.now() / 1000 - epoch;
  if (d < 60) return "щойно";
  if (d < 3600) return `${Math.floor(d / 60)}хв`;
  if (d < 86400) return `${Math.floor(d / 3600)}год`;
  return `${Math.floor(d / 86400)}д`;
}

export function SnssPanel({ authHeaders, lang }: {
  authHeaders: () => Record<string, string>;
  lang: string;
}) {
  const L = (en: string, ua: string) => lang === "ua" ? ua : en;

  const [stats, setStats]               = useState<SnssStats | null>(null);
  const [loading, setLoading]           = useState(false);
  const [pendingMin, setPendingMin]      = useState(2);
  const [savedMin, setSavedMin]          = useState(2);
  const [savingThresh, setSavingThresh]  = useState(false);
  const [clearing, setClearing]          = useState(false);
  const [unlocking, setUnlocking]        = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [collapsed, setCollapsed]        = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/factory/snss/stats", { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: SnssStats = await r.json();
      setStats(d);
      setSavedMin(d.min_count);
      setPendingMin(d.min_count);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const saveThreshold = async () => {
    setSavingThresh(true);
    try {
      await fetch("/api/factory/snss/config", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ min_count: pendingMin }),
      });
      setSavedMin(pendingMin);
      await fetchStats();
    } finally {
      setSavingThresh(false);
    }
  };

  const unblock = async (prefix: string, country_id: string) => {
    const key = `${prefix}:${country_id}`;
    setUnlocking(key);
    try {
      await fetch(
        `/api/factory/snss/prefix?prefix=${encodeURIComponent(prefix)}&country_id=${encodeURIComponent(country_id)}`,
        { method: "DELETE", headers: authHeaders() },
      );
      await fetchStats();
    } finally {
      setUnlocking(null);
    }
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      await fetch("/api/factory/snss/clear", { method: "POST", headers: authHeaders() });
      await fetchStats();
    } finally {
      setClearing(false);
    }
  };

  const isDirty = pendingMin !== savedMin;

  return (
    <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px", cursor: "pointer",
          borderBottom: collapsed ? "none" : `1px solid ${BORDER}`,
        }}
      >
        <Shield size={15} color={ACCENT} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
            {L("SNSS — Prefix Blacklist", "SNSS — Чорний список префіксів")}
          </div>
          {stats && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
              {stats.prefix_count} {L("blocked", "заблоковано")}
              {" · "}{stats.total_hits} {L("hits", "спрацювань")}
              {" · "}поріг: {savedMin}
            </div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); fetchStats(); }}
          disabled={loading}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: "rgba(255,255,255,0.3)" }}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
        </button>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{collapsed ? "▼" : "▲"}</span>
      </div>

      {!collapsed && (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Error */}
          {error && (
            <div style={{ fontSize: 11, color: RED, background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.25)", borderRadius: 10, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          {/* ── Stat chips ── */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
              {[
                { label: L("Blocked", "Заблоковано"), value: stats.prefix_count, color: RED },
                { label: L("Countries", "Країни"),    value: stats.country_count, color: ACCENT },
                { label: L("Total hits", "Спрацювань"), value: stats.total_hits, color: PURPLE },
                { label: L("Threshold", "Поріг"),     value: savedMin,           color: BLUE },
              ].map(s => (
                <div key={s.label} style={{ background: GLASS2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 4, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Threshold slider ── */}
          <div style={{ background: GLASS2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "13px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
                  {L("Blacklist threshold", "Поріг для блокування")}
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
                  {L("recycled hits before prefix is blocked", "спрацювань перед блокуванням префіксу")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: isDirty ? ACCENT : "rgba(255,255,255,0.7)", minWidth: 26, textAlign: "center", transition: "color 0.2s" }}>
                  {pendingMin}
                </span>
                {isDirty && (
                  <button
                    onClick={saveThreshold} disabled={savingThresh}
                    style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 8, padding: "4px 10px", cursor: savingThresh ? "not-allowed" : "pointer", opacity: savingThresh ? 0.6 : 1, fontFamily: "inherit" }}
                  >
                    {savingThresh ? "…" : L("Save", "Зберегти")}
                  </button>
                )}
              </div>
            </div>
            <input
              type="range" min={1} max={10} value={pendingMin}
              onChange={e => setPendingMin(Number(e.target.value))}
              style={{ width: "100%", accentColor: ACCENT, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <span key={n} style={{ fontSize: 8, color: n === pendingMin ? ACCENT : "rgba(255,255,255,0.15)", fontWeight: n === pendingMin ? 800 : 400, transition: "color 0.15s", minWidth: 14, textAlign: "center" }}>
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* ── Prefix table ── */}
          {stats && stats.prefixes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "22px 0", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              {L("✓ Blacklist is empty", "✓ Чорний список порожній")}
            </div>
          ) : stats && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 40px 56px 34px", gap: 6, padding: "0 6px 6px", borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                {[L("Prefix","Префікс"), L("Country","Країна"), L("Hits","Разів"), L("Last seen","Остання"), ""].map((h, i) => (
                  <div key={i} style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em", textTransform: "uppercase", textAlign: i === 2 ? "center" : "left" }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {stats.prefixes.map(p => {
                const key = `${p.prefix}:${p.country_id}`;
                const busy = unlocking === key;
                const flag = FLAGS[p.country_id.toLowerCase()] ?? "🌐";
                const hitColor = p.count >= 6 ? RED : p.count >= 3 ? ACCENT : PURPLE;
                return (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 56px 40px 56px 34px", gap: 6, alignItems: "center", padding: "9px 8px", background: "rgba(255,255,255,0.025)", borderRadius: 11, border: "1px solid rgba(255,255,255,0.055)", transition: "opacity 0.2s", opacity: busy ? 0.5 : 1 }}>

                    {/* Prefix */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                        {p.prefix}
                      </div>
                      {p.example_phones[0] && (
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.22)", fontFamily: "monospace", marginTop: 1 }}>
                          {p.example_phones[0]}
                        </div>
                      )}
                    </div>

                    {/* Country */}
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 14 }}>{flag}</span>
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontWeight: 700 }}>{p.country_id.toUpperCase()}</span>
                    </div>

                    {/* Hit count */}
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: hitColor }}>{p.count}</span>
                    </div>

                    {/* Last seen */}
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}>{ago(p.last_seen)}</div>

                    {/* Unblock */}
                    <button
                      onClick={() => unblock(p.prefix, p.country_id)}
                      disabled={busy}
                      title={L("Unblock this prefix", "Розблокувати префікс")}
                      style={{ background: "rgba(45,232,151,0.07)", border: "1px solid rgba(45,232,151,0.18)", borderRadius: 8, padding: "5px 0", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 28 }}
                    >
                      {busy
                        ? <div style={{ width: 9, height: 9, borderRadius: "50%", border: `1.5px solid ${GREEN}40`, borderTopColor: GREEN, animation: "spin 0.8s linear infinite" }} />
                        : <span style={{ fontSize: 12, color: GREEN }}>✕</span>
                      }
                    </button>
                  </div>
                );
              })}

              {/* Clear all */}
              <button
                onClick={clearAll} disabled={clearing}
                style={{ marginTop: 4, width: "100%", background: "rgba(255,107,122,0.06)", border: "1px solid rgba(255,107,122,0.18)", borderRadius: 12, padding: "10px 14px", fontSize: 11, fontWeight: 700, color: clearing ? "rgba(255,107,122,0.35)" : RED, cursor: clearing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}
              >
                {clearing
                  ? <><div style={{ width: 11, height: 11, borderRadius: "50%", border: `1.5px solid ${RED}35`, borderTopColor: RED, animation: "spin 0.8s linear infinite" }} />{L("Clearing…","Очищення…")}</>
                  : <><Trash2 size={12} />{L("Clear entire blacklist","Очистити весь чорний список")} ({stats.prefix_count})</>
                }
              </button>
            </div>
          )}

          {/* Loading placeholder */}
          {!stats && !error && loading && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${ACCENT}35`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
