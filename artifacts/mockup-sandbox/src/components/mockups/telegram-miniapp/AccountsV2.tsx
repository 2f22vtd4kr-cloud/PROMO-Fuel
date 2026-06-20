import React, { useState } from 'react';
import { Plus, Shield, ShieldAlert, ShieldBan, Lock, Globe, Server, Activity, Timer } from 'lucide-react';

export const AccountsV2: React.FC = () => {
  const containerStyle: React.CSSProperties = {
    width: '390px',
    height: '760px',
    backgroundColor: '#060810',
    color: '#ffffff',
    fontFamily: "'Manrope', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '1px solid #1f2937'
  };

  const glassStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
    backdropFilter: 'blur(32px) saturate(160%)',
    WebkitBackdropFilter: 'blur(32px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
  };

  const headerStyle: React.CSSProperties = {
    padding: '24px 20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    zIndex: 10,
    backgroundColor: 'rgba(6, 8, 16, 0.8)',
    backdropFilter: 'blur(12px)',
  };

  const statsRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  };

  const statTileStyle = (color: string): React.CSSProperties => ({
    ...glassStyle,
    borderRadius: '12px',
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    borderTop: `1px solid ${color}40`,
  });

  const scrollAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px 100px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const cardStyle = (color: string, delay: number): React.CSSProperties => ({
    ...glassStyle,
    borderRadius: '16px',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
    animation: `slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s backwards`,
    borderLeft: `4px solid ${color}`,
  });

  const badgeStyle = (color: string, isGlow = false): React.CSSProperties => ({
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 700,
    color: color,
    backgroundColor: `${color}15`,
    border: `1px solid ${color}30`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: isGlow ? `0 0 8px ${color}40` : 'none',
  });

  const fabStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    height: '56px',
    padding: '0 20px',
    borderRadius: '28px',
    backgroundColor: '#2de897',
    color: '#060810',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 8px 32px rgba(45, 232, 151, 0.4)',
    cursor: 'pointer',
    border: 'none',
    zIndex: 100,
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.2px',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* Header & Stats */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Аккаунты</h1>
          <div style={{ display: 'flex', gap: '8px', opacity: 0.7 }}>
            <Server size={18} color="#ffffff" />
          </div>
        </div>

        <div style={statsRowStyle}>
          <div style={statTileStyle('#ffffff')}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ВСЕГО</span>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>3</span>
          </div>
          <div style={statTileStyle('#2de897')}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>АКТИВНЫ</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#2de897' }}>1</span>
          </div>
          <div style={statTileStyle('#ffc946')}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ФЛУД</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffc946' }}>1</span>
          </div>
          <div style={statTileStyle('#ff6b7a')}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>БАН</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#ff6b7a' }}>1</span>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div style={scrollAreaStyle}>
        
        {/* Card 1: Idle/Free */}
        <div style={cardStyle('#2de897', 0.1)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}>+7 999 123-45-67</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Метка: Основной рассыльщик</div>
            </div>
            <Shield size={20} color="#2de897" style={{ opacity: 0.8 }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={badgeStyle('#2de897')}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2de897', animation: 'pulse 2s infinite' }} />
              АВТОРИЗОВАН
            </div>
            <div style={badgeStyle('#6ba8e5')}>
              <Activity size={10} />
              СВОБОДЕН
            </div>
            <div style={badgeStyle('rgba(255,255,255,0.7)')}>
              <Globe size={10} />
              socks5:192.168.1.1:1080
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Отправлено сегодня</span>
              <span style={{ fontWeight: 700 }}>120 <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/ 300</span></span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: '40%', height: '100%', backgroundColor: '#2de897', borderRadius: '2px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '8px', color: 'rgba(255,255,255,0.4)' }}>
              <span>Всего отправлено: 4,521</span>
            </div>
          </div>
        </div>

        {/* Card 2: Locked / Flood Wait */}
        <div style={cardStyle('#ffc946', 0.2)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}>+7 999 765-43-21</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Метка: Резерв 1</div>
            </div>
            <ShieldAlert size={20} color="#ffc946" style={{ opacity: 0.8 }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={badgeStyle('#2de897')}>
              АВТОРИЗОВАН
            </div>
            <div style={badgeStyle('#ffc946')}>
              <Timer size={10} />
              FLOOD WAIT 04:32
            </div>
            <div style={badgeStyle('rgba(255,255,255,0.7)')}>
              <Lock size={10} color="#ffc946" />
              <span style={{ color: '#ffc946' }}>worker-1 (осталось 12м)</span>
            </div>
            <div style={badgeStyle('rgba(255,255,255,0.7)')}>
              <Globe size={10} />
              socks5:10.0.0.1:1080
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Отправлено сегодня</span>
              <span style={{ fontWeight: 700 }}>45 <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/ 300</span></span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: '15%', height: '100%', backgroundColor: '#ffc946', borderRadius: '2px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '8px', color: 'rgba(255,255,255,0.4)' }}>
              <span>Всего отправлено: 1,204</span>
            </div>
          </div>
        </div>

        {/* Card 3: Banned */}
        <div style={cardStyle('#ff6b7a', 0.3)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'line-through', color: 'rgba(255,255,255,0.5)' }}>+7 999 000-11-22</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Метка: Тестовый</div>
            </div>
            <ShieldBan size={20} color="#ff6b7a" style={{ opacity: 0.8 }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={badgeStyle('#ff6b7a')}>
              НЕ АВТОРИЗОВАН
            </div>
            <div style={badgeStyle('#ff6b7a', true)}>
              ЗАБЛОКИРОВАН
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', border: '1px dashed rgba(255,107,122,0.2)', opacity: 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Отправлено сегодня</span>
              <span style={{ fontWeight: 700 }}>0 <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/ 300</span></span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '8px', color: 'rgba(255,255,255,0.4)' }}>
              <span>Всего отправлено: 89</span>
            </div>
          </div>
        </div>

      </div>

      {/* FAB */}
      <button style={fabStyle}>
        <Plus size={20} strokeWidth={3} />
        Добавить аккаунт
      </button>

    </div>
  );
};
