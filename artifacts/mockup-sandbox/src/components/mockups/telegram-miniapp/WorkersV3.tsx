import { worker } from 'cluster';
import React, { useState, useEffect } from 'react';

const Icons = {
  Cpu: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  Activity: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Copy: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Clock: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Send: ({ size = 24, color = 'currentColor' }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
};

const MOCK_WORKERS = [
  { id: 'w-delta-04', name: 'Alpha Node', status: 'ONLINE', isAlive: true, sends: 12450, uptime: '14ч 32м', currentTask: 'task_9012', progress: 68 },
  { id: 'w-sigma-05', name: 'Beta Node', status: 'ONLINE', isAlive: true, sends: 8930, uptime: '4ч 10м', currentTask: 'task_9015', progress: 24 },
  { id: 'w-omega-06', name: 'Gamma Node', status: 'IDLE', isAlive: true, sends: 4500, uptime: '1ч 05м', currentTask: null, progress: 0 },
  { id: 'w-zeta-07', name: 'Delta Node', status: 'OFFLINE', isAlive: false, sends: 120, lastSeen: '4ч назад', currentTask: null, progress: 0, startCommand: 'python worker.py w-zeta-07' }
];

const MOCK_TASKS = [
  { id: 'task_9020', name: 'Промо рассылка 20.06', priority: 'high' },
  { id: 'task_9021', name: 'Скидка 10% VIP', priority: 'medium' },
  { id: 'task_9022', name: 'Напоминание о брошенной корзине', priority: 'low' }
];

function GlassCard({ children, style = {}, className = '' }: any) {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function WorkersV3() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ONLINE': return 'var(--color-green)';
      case 'IDLE': return 'var(--color-yellow)';
      case 'OFFLINE': return 'var(--color-red)';
      default: return 'var(--color-gray)';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'var(--color-red)';
      case 'medium': return 'var(--color-yellow)';
      case 'low': return 'var(--color-green)';
      default: return 'var(--color-gray)';
    }
  };

  return (
    <div style={{
      width: 390, height: 760, background: '#060810', color: '#ffffff',
      fontFamily: "'Manrope', sans-serif", overflowY: 'auto', position: 'relative'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        
        :root {
          --color-green: #2de897;
          --color-red: #ff6b7a;
          --color-yellow: #ffc946;
          --color-gray: #7c8db0;
          --color-blue: #6ba8e5;
        }

        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(45, 232, 151, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(45, 232, 151, 0); }
          100% { box-shadow: 0 0 0 0 rgba(45, 232, 151, 0); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slide-up {
          opacity: 0;
          animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .pulse-active {
          animation: pulse-ring 2s infinite;
        }
      `}</style>

      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Header */}
        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 8, animationDelay: '0.1s' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Workers</h1>
          
          {/* Summary Pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(45,232,151,0.1)', border: '1px solid rgba(45,232,151,0.2)', padding: '6px 12px', borderRadius: 20, flexShrink: 0 }}>
              <div className="pulse-active" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green)' }}>2 Alive</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,107,122,0.1)', border: '1px solid rgba(255,107,122,0.2)', padding: '6px 12px', borderRadius: 20, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-red)' }}>1 Dead</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 20, flexShrink: 0 }}>
              <Icons.Send size={12} color="var(--color-gray)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>25.8k Sends</span>
            </div>
          </div>
        </div>

        {/* Workers List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MOCK_WORKERS.map((worker, index) => {
            const statusColor = getStatusColor(worker.status);
            
            return (
              <GlassCard 
                key={worker.id} 
                className="animate-slide-up"
                style={{ 
                  animationDelay: \`\${0.2 + index * 0.1}s\`,
                  padding: 16
                }}
              >
                {/* Accent Line */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, height: 2,
                  background: worker.isAlive 
                    ? 'linear-gradient(90deg, transparent, var(--color-green), transparent)'
                    : 'linear-gradient(90deg, transparent, var(--color-red), transparent)',
                  opacity: 0.8
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div className={worker.status === 'ONLINE' ? 'pulse-active' : ''} style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: \`linear-gradient(135deg, \${statusColor}33, transparent)\`,
                    border: \`1px solid \${statusColor}66\`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icons.Cpu size={20} color={statusColor} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {worker.name}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-gray)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                          {worker.id}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 12,
                        color: statusColor, background: \`\${statusColor}1A\`, border: \`1px solid \${statusColor}33\`
                      }}>
                        {worker.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--color-gray)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.Clock size={12} />
                        {worker.isAlive ? worker.uptime : worker.lastSeen}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.Send size={12} />
                        {worker.sends.toLocaleString()}
                      </div>
                    </div>

                    {/* Progress or Code Block */}
                    {worker.currentTask && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                          <span style={{ color: 'var(--color-blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icons.Activity size={10} /> {worker.currentTask}
                          </span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{worker.progress}%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: \`\${worker.progress}%\`, background: 'var(--color-blue)', borderRadius: 2 }} />
                        </div>
                      </div>
                    )}

                    {!worker.isAlive && worker.startCommand && (
                      <div style={{ 
                        marginTop: 12, background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '8px 10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <code style={{ fontSize: 11, color: 'var(--color-gray)', fontFamily: 'monospace' }}>
                          {worker.startCommand}
                        </code>
                        <button style={{ 
                          background: 'none', border: 'none', color: 'var(--color-gray)', cursor: 'pointer', padding: 4
                        }}>
                          <Icons.Copy size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Task Queue Section */}
        <div className="animate-slide-up" style={{ animationDelay: '0.6s', marginTop: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-gray)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Task Queue
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_TASKS.map((task, i) => (
              <GlassCard key={task.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: getPriorityColor(task.priority) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{task.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-gray)', marginTop: 2 }}>{task.id}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-gray)', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 12 }}>
                  {task.priority}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
