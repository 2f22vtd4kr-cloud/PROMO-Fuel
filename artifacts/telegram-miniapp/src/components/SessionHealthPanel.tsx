import { useState, useCallback, useRef } from "react";
import { Activity, RefreshCw, AlertCircle, Clock, Zap } from "lucide-react";
import { getStoredSecret } from "../pages/LockScreen";

const GLASS  = "rgba(255,255,255,0.055)";
const GLASS2 = "rgba(255,255,255,0.09)";
const BORDER = "rgba(255,255,255,0.10)";
const GREEN  = "#2de897";
const RED    = "#ff6b7a";
const AMBER  = "#ffc946";
const BLUE   = "#6ba8e5";

interface AccountHealth {
  id: number;
  phone: string;
  label: string;
  username: string | null;
  status: string;
  session_file: string | null;
  is_active: number;
  is_banned: number;
  flood_wait_until: string | null;
  daily_limit: number;
  sent_today: number;
  last_used_at: string | null;
  health: string;
}

interface ValidateResult {
  id: number;
  phone: string;
  status: string;
  display_name: string | null;
  error: string | null;
}

type HealthKey = "active" | "flood_wait" | "banned" | "session_invalid" | "no_session";

const HCFG: Record<HealthKey, { dot: string; label: string }> = {
  active:          { dot: GREEN,                    label: "АКТИВНИЙ"   },
  flood_wait:      { dot: AMBER,                    label: "FLOOD WAIT" },
  banned:          { dot: RED,                      label: "ЗАБЛОК."    },
  session_invalid: { dot: RED,                      label: "НЕВАЛІДНА"  },
  no_session:      { dot: "rgba(255,255,255,0.22)", label: "НЕ МАЄ"    },
};

function authHdr(): Record<string, string> {
  const s = getStoredSecret();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (s) h["Authorization"] = `Bearer ${s}`;
  return h;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)    return "щойно";
  if (d < 3600)  return `${Math.floor(d / 60)}хв тому`;
  if (d < 86400) return `${Math.floor(d / 3600)}год тому`;
  return `${Math.floor(d / 86400)}д тому`;
}

function HealthBadge({ h }: { h: string }) {
  const c = HCFG[h as HealthKey] ?? { dot: "rgba(255,255,255,0.25)", label: h.toUpperCase() };
  return (
    <span style={{ fontSize: 8, fontWeight: 700, color: c.dot, background: `${c.dot}18`, border: `1px solid ${c.dot}35`, borderRadius: 20, padding: "2px 6px", letterSpacing: "0.04em", flexShrink: 0 }}>
      {c.label}
    </span>
  );
}

export function SessionHealthPanel() {
  const [accounts, setAccounts]         = useState<AccountHealth[]>([]);
  const [validating, setValidating]     = useState<Set<number>>(new Set());
  const [results, setResults]           = useState<Record<number, ValidateResult>>({});
  const [loading, setLoading]           = useState(false);
  const [collapsed, setCollapsed]       = useState(true);
  const loaded                          = useRef(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/accounts/session-health", { headers: authHdr() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json() as { results: AccountHealth[] };
      setAccounts(d.results ?? []);
    } catch (e) {
      console.error("[SessionHealth]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const onToggle = () => {
    setCollapsed(v => {
      if (v && !loaded.current) { loaded.current = true; fetchHealth(); }
      return !v;
    });
  };

  const doValidate = useCallback(async (ids: number[]) => {
    if (!ids.length) return;
    setValidating(prev => new Set([...prev, ...ids]));
    try {
      const r = await fetch("/api/accounts/validate-sessions", {
        method: "POST",
        headers: authHdr(),
        body: JSON.stringify({ ids }),
      });
      if (r.ok) {
        const d = await r.json() as { results: ValidateResult[] };
        const map: Record<number, ValidateResult> = {};
        (d.results ?? []).forEach(rv => { map[rv.id] = rv; });
        setResults(prev => ({ ...prev, ...map }));
        await fetchHealth();
      }
    } catch (e) {
      console.error("[SessionHealth] validate", e);
    } finally {
      setValidating(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [fetchHealth]);

  const counts = accounts.reduce<Record<string, number>>((a, acc) => {
    a[acc.health] = (a[acc.health] ?? 0) + 1; return a;
  }, {});

  const allIds     = accounts.map(a => a.id);
  const problemIds = accounts.filter(a => a.health !== "active" && a.session_file).map(a => a.id);
  const anyBusy   = validating.size > 0;

  return (
    <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", cursor: "pointer", borderBottom: collapsed ? "none" : `1px solid ${BORDER}` }}
      >
        <Activity size={14} color={BLUE} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
            Session Health Dashboard
          </div>
          {accounts.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
              {(Object.entries(counts) as [string, number][]).map(([k, v]) => {
                const c = HCFG[k as HealthKey];
                if (!c || !v) return null;
                return <span key={k} style={{ fontSize: 9, color: c.dot, fontWeight: 700 }}>{v} {c.label}</span>;
              })}
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={e => { e.stopPropagation(); fetchHealth(); }} disabled={loading} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: "rgba(255,255,255,0.28)" }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
          </button>
        )}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{collapsed ? "▼" : "▲"}</span>
      </div>

      {!collapsed && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Action strip */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <button
              onClick={() => doValidate(allIds)}
              disabled={loading || !allIds.length || anyBusy}
              style={{ fontSize: 10, fontWeight: 700, color: BLUE, background: "rgba(107,168,229,0.10)", border: "1px solid rgba(107,168,229,0.24)", borderRadius: 10, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: (!allIds.length || anyBusy) ? 0.45 : 1, fontFamily: "inherit" }}
            >
              {anyBusy
                ? <div style={{ width: 9, height: 9, borderRadius: "50%", border: `1.5px solid ${BLUE}45`, borderTopColor: BLUE, animation: "spin 0.8s linear infinite" }} />
                : <Zap size={10} />}
              Validate All ({allIds.length})
            </button>
            {problemIds.length > 0 && (
              <button
                onClick={() => doValidate(problemIds)}
                disabled={anyBusy}
                style={{ fontSize: 10, fontWeight: 700, color: AMBER, background: "rgba(255,201,70,0.10)", border: "1px solid rgba(255,201,70,0.24)", borderRadius: 10, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: anyBusy ? 0.45 : 1, fontFamily: "inherit" }}
              >
                <AlertCircle size={10} />
                Recheck problems ({problemIds.length})
              </button>
            )}
          </div>

          {/* List */}
          {loading && !accounts.length ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${BLUE}35`, borderTopColor: BLUE, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            </div>
          ) : !accounts.length ? (
            <div style={{ textAlign: "center", padding: "22px 0", fontSize: 12, color: "rgba(255,255,255,0.22)" }}>Акаунтів немає</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {accounts.map(a => {
                const isChecking = validating.has(a.id);
                const res        = results[a.id];
                const qpct       = a.daily_limit > 0 ? Math.min(Math.round((a.sent_today / a.daily_limit) * 100), 100) : 0;
                const qcol       = qpct >= 90 ? RED : qpct >= 70 ? AMBER : GREEN;
                const name       = res?.display_name || a.label || a.username || a.phone;
                const cfg        = HCFG[a.health as HealthKey] ?? { dot: "rgba(255,255,255,0.2)", label: a.health };
                const floodSecs  = a.flood_wait_until
                  ? Math.max(0, Math.round((new Date(a.flood_wait_until).getTime() - Date.now()) / 1000))
                  : 0;

                return (
                  <div key={a.id} style={{ background: GLASS2, border: `1px solid ${BORDER}`, borderRadius: 13, padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>

                      {/* Status dot */}
                      <div style={{ paddingTop: 4, flexShrink: 0 }}>
                        {isChecking
                          ? <div style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid ${BLUE}40`, borderTopColor: BLUE, animation: "spin 0.8s linear infinite" }} />
                          : <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: cfg.dot, boxShadow: a.health === "active" ? `0 0 5px ${GREEN}70` : undefined }} />
                        }
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.88)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                            {name}
                          </span>
                          <HealthBadge h={a.health} />
                          {!a.is_active && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "2px 6px" }}>ВИМК.</span>}
                        </div>

                        <div style={{ display: "flex", gap: 9, marginTop: 5, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>{a.phone}</span>

                          {/* Quota bar */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 34, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${qpct}%`, background: qcol, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 9, color: qcol, fontWeight: 700 }}>{a.sent_today}/{a.daily_limit}</span>
                          </div>

                          {/* Last used */}
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: 2 }}>
                            <Clock size={7} />{timeAgo(a.last_used_at)}
                          </span>

                          {/* Flood countdown */}
                          {a.health === "flood_wait" && floodSecs > 0 && (
                            <span style={{ fontSize: 9, color: AMBER, fontWeight: 700 }}>
                              ⏳ {Math.floor(floodSecs / 60)}:{String(floodSecs % 60).padStart(2, "0")}
                            </span>
                          )}
                        </div>

                        {/* Validate result */}
                        {res?.error && <div style={{ marginTop: 4, fontSize: 9, color: RED, opacity: 0.85 }}>⚠ {res.error}</div>}
                        {res && !res.error && <div style={{ marginTop: 4, fontSize: 9, color: GREEN, opacity: 0.85 }}>✓ Авторизовано{res.display_name ? ` · ${res.display_name}` : ""}</div>}
                      </div>

                      {/* Per-account check button */}
                      <button
                        onClick={() => doValidate([a.id])}
                        disabled={isChecking || anyBusy}
                        title="Telethon-перевірка сесії"
                        style={{ flexShrink: 0, background: "rgba(107,168,229,0.07)", border: "1px solid rgba(107,168,229,0.2)", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 9, fontWeight: 700, color: BLUE, opacity: (isChecking || anyBusy) ? 0.38 : 1, fontFamily: "inherit" }}
                      >
                        {isChecking ? "…" : "check"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
