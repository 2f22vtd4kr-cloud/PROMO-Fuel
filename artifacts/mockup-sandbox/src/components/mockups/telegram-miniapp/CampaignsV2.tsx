import React, { useState, useEffect } from 'react';
import { Search, Plus, Play, Pause, Clock, CheckCircle2, AlertCircle, BarChart2, Zap } from 'lucide-react';

const COLORS = {
  bg: '#060810',
  green: '#2de897',
  blue: '#6ba8e5',
  yellow: '#ffc946',
  red: '#ff6b7a',
  text: '#ffffff',
  muted: 'rgba(255, 255, 255, 0.5)',
  glassBg: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.08)'
};

const INITIAL_CAMPAIGNS = [
  {
    id: 1,
    title: 'Анонс: Новое топливо G-Drive',
    status: 'running',
    sent: 14205,
    target: 25000,
    errors: 12,
    reach: 12500,
    date: 'Сегодня, 14:00'
  },
  {
    id: 2,
    title: 'Скидка на кофе для VIP',
    status: 'scheduled',
    sent: 0,
    target: 5000,
    errors: 0,
    reach: 0,
    countdown: '02:14:45',
    date: 'Завтра, 10:00'
  },
  {
    id: 3,
    title: 'Опрос качества обслуживания',
    status: 'paused',
    sent: 8400,
    target: 10000,
    errors: 45,
    reach: 8200,
    date: '12 Апр, 09:30'
  },
  {
    id: 4,
    title: 'Весенняя акция -20% на омывайку',
    status: 'done',
    sent: 50000,
    target: 50000,
    errors: 312,
    reach: 48900,
    date: '10 Апр, 11:00'
  }
];

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'running':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}40`, color: COLORS.green, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: `0 0 10px ${COLORS.green}20` }}>
          <Zap size={12} fill="currentColor" style={{ animation: 'pulse 1.5s infinite' }} />
          В процессе
        </div>
      );
    case 'scheduled':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${COLORS.yellow}15`, border: `1px solid ${COLORS.yellow}40`, color: COLORS.yellow, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Clock size={12} />
          Запланировано
        </div>
      );
    case 'paused':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${COLORS.blue}15`, border: `1px solid ${COLORS.blue}40`, color: COLORS.blue, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Pause size={12} fill="currentColor" />
          На паузе
        </div>
      );
    case 'done':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${COLORS.text}10`, border: `1px solid ${COLORS.text}20`, color: COLORS.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <CheckCircle2 size={12} />
          Завершено
        </div>
      );
    default:
      return null;
  }
};

export const CampaignsV2 = () => {
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [search, setSearch] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [livePulse, setLivePulse] = useState(true);

  // Simple pulsing effect for running numbers
  useEffect(() => {
    const interval = setInterval(() => setLivePulse(p => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  const filtered = showEmpty ? [] : campaigns.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      width: 390,
      height: 760,
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: "'Manrope', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes progressSweep {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes countUpBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); color: #fff; }
          100% { transform: scale(1); }
        }
        .animate-card {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '40px 20px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: `linear-gradient(180deg, ${COLORS.bg} 80%, transparent 100%)`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Рассылки</h1>
          {/* Dev toggle to test empty state */}
          <button 
            onClick={() => setShowEmpty(!showEmpty)}
            style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {showEmpty ? 'Mock Data' : 'Empty State'}
          </button>
        </div>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={18} color={COLORS.muted} style={{ position: 'absolute', left: 16 }} />
          <input 
            type="text"
            placeholder="Поиск кампаний..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: COLORS.glassBg,
              backdropFilter: 'blur(32px) saturate(160%)',
              border: `1px solid ${COLORS.glassBorder}`,
              borderRadius: 16,
              padding: '14px 16px 14px 44px',
              color: COLORS.text,
              fontSize: 15,
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'all 0.3s ease'
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0, animation: 'slideUp 0.6s forwards' }}>
            {/* Beautiful Empty State SVG Illustration */}
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 24 }}>
              <circle cx="80" cy="80" r="80" fill="url(#paint0_radial)" fillOpacity="0.1"/>
              <path d="M50 70L80 40L110 70" stroke={COLORS.green} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'slideUp 2s infinite alternate' }}/>
              <path d="M80 40V120" stroke={COLORS.green} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="80" cy="120" r="6" fill={COLORS.green}/>
              <rect x="40" y="80" width="80" height="40" rx="12" stroke={COLORS.glassBorder} strokeWidth="2" fill={COLORS.glassBg} backdropFilter="blur(10px)"/>
              <line x1="55" y1="100" x2="105" y2="100" stroke={COLORS.muted} strokeWidth="2" strokeLinecap="round"/>
              <line x1="55" y1="110" x2="85" y2="110" stroke={COLORS.muted} strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(80 80) rotate(90) scale(80)">
                  <stop stopColor={COLORS.green} />
                  <stop offset="1" stopColor={COLORS.green} stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: COLORS.text }}>Пока пусто</h3>
            <p style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 1.5, maxWidth: 240 }}>
              У вас еще нет созданных рассылок. Нажмите кнопку ниже, чтобы запустить первую.
            </p>
          </div>
        ) : (
          filtered.map((campaign, idx) => {
            const isRunning = campaign.status === 'running';
            const progress = (campaign.sent / campaign.target) * 100;
            
            return (
              <div 
                key={campaign.id} 
                className="animate-card"
                style={{
                  background: COLORS.glassBg,
                  backdropFilter: 'blur(32px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(160%)',
                  border: `1px solid ${isRunning ? `${COLORS.green}30` : COLORS.glassBorder}`,
                  borderRadius: 24,
                  padding: 20,
                  animationDelay: `${idx * 0.1}s`,
                  boxShadow: isRunning ? `0 8px 32px ${COLORS.green}10` : '0 8px 32px rgba(0,0,0,0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Status & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <StatusBadge status={campaign.status} />
                  <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600 }}>{campaign.date}</div>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 20px', lineHeight: 1.3 }}>
                  {campaign.title}
                </h3>

                {/* Live Progress Bar for Running/Paused/Done */}
                {campaign.status !== 'scheduled' ? (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600 }}>Прогресс</span>
                      <span style={{ 
                        fontSize: 13, 
                        fontWeight: 800, 
                        color: isRunning ? COLORS.green : COLORS.text,
                        transition: 'color 0.3s',
                        animation: isRunning && livePulse ? 'countUpBounce 0.3s ease' : 'none'
                      }}>
                        {campaign.sent.toLocaleString('ru')} / {campaign.target.toLocaleString('ru')}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        background: isRunning 
                          ? `linear-gradient(90deg, ${COLORS.green}, #50f2aa, ${COLORS.green})` 
                          : campaign.status === 'paused' ? COLORS.blue : COLORS.muted,
                        backgroundSize: '200% 100%',
                        borderRadius: 2,
                        animation: isRunning ? 'progressSweep 2s linear infinite' : 'none',
                        boxShadow: isRunning ? `0 0 10px ${COLORS.green}` : 'none'
                      }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 20, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${COLORS.glassBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${COLORS.yellow}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} color={COLORS.yellow} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, marginBottom: 2 }}>Старт через</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.yellow, fontVariantNumeric: 'tabular-nums' }}>
                        {campaign.countdown}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3-Stat Footer */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: 8,
                  paddingTop: 16,
                  borderTop: `1px solid ${COLORS.glassBorder}`
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Отправлено</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{campaign.sent.toLocaleString('ru')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Охват</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{campaign.reach.toLocaleString('ru')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ошибок</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: campaign.errors > 0 ? COLORS.red : COLORS.text }}>
                      {campaign.errors > 0 ? `+${campaign.errors}` : '0'}
                    </div>
                  </div>
                </div>

                {/* Play/Pause overlay for interactivity feel */}
                {['running', 'paused'].includes(campaign.status) && (
                  <button style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: COLORS.glassBg,
                    border: `1px solid ${COLORS.glassBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.text,
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)'
                  }}>
                    {campaign.status === 'running' ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button style={{
        position: 'absolute',
        bottom: 32,
        right: 20,
        height: 56,
        padding: '0 24px',
        borderRadius: 28,
        background: COLORS.green,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#000',
        fontSize: 15,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: `0 8px 32px ${COLORS.green}60, inset 0 -2px 0 rgba(0,0,0,0.1)`,
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 20
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Plus size={20} strokeWidth={3} />
        Новая рассылка
      </button>

      {/* Bottom gradient fade for smooth scroll cut-off */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        background: `linear-gradient(0deg, ${COLORS.bg} 20%, transparent 100%)`,
        pointerEvents: 'none',
        zIndex: 10
      }} />
    </div>
  );
};
