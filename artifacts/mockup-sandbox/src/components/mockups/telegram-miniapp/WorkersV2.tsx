import React, { useState } from 'react';

const Icons = {
  Cpu: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  Activity: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Phone: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Plus: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Shield: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  ChevronDown: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevronUp: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  Copy: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
};

const TG = {
  text: '#ffffff',
  muted: '#7c8db0'
};

const BLUR = 'blur(32px) saturate(160%)';

function GlassCard({ children, style = {}, glow, onClick }: any) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)',
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: 20,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: glow
          ? `0 8px 32px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 4px 24px ${glow}`
          : '0 8px 32px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(255,255,255,0.06) inset',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.55) 35%,rgba(255,255,255,0.70) 50%,rgba(255,255,255,0.55) 65%,transparent 95%)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(120,180,255,0.07) 0%, rgba(255,120,200,0.05) 35%, rgba(120,255,170,0.04) 65%, rgba(180,120,255,0.07) 100%)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}

// Mock Data
const MOCK_WORKERS = [
  { id: 'w-alpha-01', pid: 1403, status: 'working', alive: true, done: 1450, failed: 2, lastHeartbeat: '2с назад', uptime: '14ч 32м', currentTask: 'task_8891' },
  { id: 'w-beta-02', pid: 1404, status: 'idle', alive: true, done: 890, failed: 0, lastHeartbeat: '5с назад', uptime: '14ч 30м' },
  { id: 'w-gamma-03', pid: null, status: 'dead', alive: false, done: 304, failed: 15, lastHeartbeat: '4ч назад', error: 'Connection reset by peer' },
];

const MOCK_TASKS = [
  { id: 'task_8891', campaign: 'Промо 15.06', status: 'claimed', worker: 'w-alpha-01', attempts: 1 },
  { id: 'task_8892', campaign: 'Промо 15.06', status: 'pending', time: 'через 2м', attempts: 0 },
  { id: 'task_8880', campaign: 'Скидка 5%', status: 'failed', error: 'Flood wait 30s', attempts: 3 },
  { id: 'task_8879', campaign: 'Скидка 5%', status: 'done', attempts: 1 },
  { id: 'task_8893', campaign: 'Промо 15.06', status: 'pending', time: 'через 5м', attempts: 0 },
];

const MOCK_ACCOUNTS = [
  { phone: '+7 999 123 45 67', label: 'Main', status: 'idle', locked: false, proxy: '192.168.1.1:8080' },
  { phone: '+7 999 765 43 21', label: 'Support', status: 'broadcasting', locked: true, lockedBy: 'w-alpha-01', proxy: '10.0.0.1:1080' },
  { phone: '+7 999 000 11 22', label: 'Promo', status: 'error', locked: false, proxy: '172.16.0.1:3128', error: 'Banned' },
];

function LiveDot({ alive, working }: { alive: boolean; working: boolean }) {
  const color = !alive ? '#ff6b7a' : working ? '#6ba8e5' : '#2de897';
  return (
    <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: alive ? 1 : 0.4 }} />
      {alive && (
        <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: `2px solid ${color}`, animation: 'hb-ring 1.8s ease-out infinite' }} />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#ffc946',
    claimed: '#6ba8e5',
    failed: '#ff6b7a',
    done: '#2de897',
  };
  const color = colors[status] || '#7c8db0';
  return (
    <span style={{ fontSize: 10, color, background: `${color}18`, borderRadius: 20, padding: '2px 7px', fontWeight: 700, flexShrink: 0 }}>
      {status}
    </span>
  );
}

export function WorkersV2() {
  const [showAccounts, setShowAccounts] = useState(false);

  return (
    <div style={{
      width: 390, height: 760, background: '#060810', color: TG.text,
      fontFamily: "'Manrope', sans-serif", overflowY: 'auto', position: 'relative'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        @keyframes hb-ring {
          0% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(2.4); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ padding: '16px 14px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Воркеры</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2de897', background: 'rgba(45,232,151,0.10)', borderRadius: 20, padding: '2px 9px' }}>
              2 активных
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#2de897', background: 'rgba(45,232,151,0.08)', border: '1px solid rgba(45,232,151,0.25)', borderRadius: 20, padding: '3px 8px', fontWeight: 700 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2de897', animation: 'hb-ring 2s ease-out infinite' }} />
            live stream
          </div>
        </div>

        {/* Summary Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[
            { label: 'Живых', value: 2, color: '#2de897' },
            { label: 'Очередь', value: 2, color: '#ffc946' },
            { label: 'Готово', value: 1450, color: '#6ba8e5' },
            { label: 'Ошибок', value: 3, color: '#ff6b7a' },
          ].map(s => (
            <GlassCard key={s.label} style={{ padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>{s.label}</div>
            </GlassCard>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, background: 'rgba(45,232,151,0.12)', border: '1px solid rgba(45,232,151,0.30)', color: '#2de897', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Icons.Plus size={14} /> Запустить воркер
          </button>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, background: 'rgba(255,201,70,0.09)', border: '1px solid rgba(255,201,70,0.27)', color: '#ffc946', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Icons.Shield size={14} /> 🔓 Освободить
          </button>
        </div>

        {/* Workers List */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            Статус Воркеров
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_WORKERS.map(w => {
              const color = !w.alive ? '#ff6b7a' : w.status === 'working' ? '#6ba8e5' : '#2de897';
              return (
                <GlassCard key={w.id} glow={w.alive ? `${color}15` : undefined} style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <LiveDot alive={w.alive} working={w.status === 'working'} />
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icons.Cpu size={15} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{w.id}</div>
                      <div style={{ fontSize: 10, color: TG.muted }}>
                        {w.pid ? `PID ${w.pid}` : '—'} • {w.uptime && <span>⏱ {w.uptime}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 20, padding: '2px 8px' }}>
                      {w.alive ? w.status : 'dead'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 4px' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#2de897' }}>{w.done}</div>
                      <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>Выполнено</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 4px' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: w.failed > 0 ? '#ff6b7a' : TG.text }}>{w.failed}</div>
                      <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>Ошибок</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 4px' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: w.alive ? '#6ba8e5' : '#ff6b7a' }}>{w.lastHeartbeat}</div>
                      <div style={{ fontSize: 9, color: TG.muted, marginTop: 2 }}>Пульс</div>
                    </div>
                  </div>

                  {w.currentTask && (
                    <div style={{ marginTop: 10, fontSize: 11, color: '#6ba8e5', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icons.Activity size={10} /> Задача #{w.currentTask}
                    </div>
                  )}
                  {w.error && (
                    <div style={{ marginTop: 8, fontSize: 10, color: '#ff6b7a', background: 'rgba(255,107,122,0.08)', borderRadius: 8, padding: '6px 8px' }}>
                      {w.error}
                    </div>
                  )}
                  {!w.alive && (
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: 9, color: '#6ba8e5', background: 'rgba(107,168,229,0.08)', border: '1px solid rgba(107,168,229,0.2)', borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <Icons.Copy size={10} /> python worker.py {w.id}
                      </div>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Task Queue */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: TG.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Очередь задач</span>
            <span style={{ color: '#6ba8e5' }}>Все ({MOCK_TASKS.length})</span>
          </div>
          <GlassCard style={{ padding: 4 }}>
            {MOCK_TASKS.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderRadius: 12 }}>
                <StatusPill status={t.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>#{t.id} — {t.campaign}</div>
                  <div style={{ fontSize: 10, color: TG.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.worker && <span style={{ color: '#ffc946' }}>@ {t.worker}</span>}
                    {t.time && <span>⏰ {t.time}</span>}
                    {t.error && <span style={{ color: '#ff6b7a' }}>{t.error}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: TG.muted }}>{t.attempts}/3</div>
              </div>
            ))}
          </GlassCard>
        </div>

        {/* Accounts Collapsible */}
        <div style={{ marginTop: 8 }}>
          <GlassCard onClick={() => setShowAccounts(!showAccounts)} style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.Phone size={14} color="#6ba8e5" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Аккаунты отправки (3)</span>
            </div>
            {showAccounts ? <Icons.ChevronUp size={16} color={TG.muted} /> : <Icons.ChevronDown size={16} color={TG.muted} />}
          </GlassCard>
          
          {showAccounts && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MOCK_ACCOUNTS.map(a => {
                const color = a.locked ? '#ffc946' : a.status === 'error' ? '#ff6b7a' : '#2de897';
                return (
                  <GlassCard key={a.phone} style={{ padding: '10px 12px', background: `${color}0A`, border: `1px solid ${color}20` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {a.phone}
                          <span style={{ fontSize: 9, color: TG.muted }}>({a.label})</span>
                        </div>
                        <div style={{ fontSize: 10, color: TG.muted, marginTop: 2 }}>
                          {a.locked ? <span style={{ color: '#ffc946' }}>🔒 {a.lockedBy}</span> : a.status === 'error' ? <span style={{ color: '#ff6b7a' }}>{a.error}</span> : <span style={{ color: '#2de897' }}>свободен</span>}
                          <span style={{ marginLeft: 8 }}>🌐 {a.proxy}</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
