import React, { useState, useEffect } from 'react';

// Icons (Inline SVG to avoid external deps)
const SearchIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const FilterIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const PlusIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const ClockIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const ZapIcon = ({ size = 12, color = 'currentColor', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const CheckIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const PauseIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

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
    snippet: 'Скидка 10% на первую заправку для всех клиентов программы лояльности.',
    status: 'running',
    sent: 14205,
    target: 25000,
    errors: 12,
    reach: 12500,
    date: 'Сегодня, 14:00',
    sparkline: [20, 40, 30, 70, 85]
  },
  {
    id: 2,
    title: 'Скидка на кофе для VIP',
    snippet: 'Дарим двойной эспрессо при покупке любого хот-дога.',
    status: 'scheduled',
    sent: 0,
    target: 5000,
    errors: 0,
    reach: 0,
    countdown: '02:14:45',
    date: 'Завтра, 10:00',
    sparkline: [0, 0, 0, 0, 0]
  },
  {
    id: 3,
    title: 'Опрос качества обслуживания',
    snippet: 'Пройдите короткий опрос и получите 500 бонусов на карту.',
    status: 'paused',
    sent: 8400,
    target: 10000,
    errors: 45,
    reach: 8200,
    date: '12 Апр, 09:30',
    sparkline: [80, 75, 90, 85, 80]
  },
  {
    id: 4,
    title: 'Весенняя акция -20% на омывайку',
    snippet: 'Только до конца мая скидка на всю весеннюю коллекцию.',
    status: 'done',
    sent: 50000,
    target: 50000,
    errors: 312,
    reach: 48900,
    date: '10 Апр, 11:00',
    sparkline: [30, 50, 40, 60, 20]
  },
  {
    id: 5,
    title: 'Flash Sale: Масло моторное',
    snippet: 'Специальное предложение на синтетику 5W-40, ограниченный сток.',
    status: 'running',
    sent: 3450,
    target: 15000,
    errors: 2,
    reach: 3300,
    date: 'Сегодня, 16:00',
    sparkline: [10, 25, 45, 60, 95]
  },
  {
    id: 6,
    title: 'Реактивация спящих клиентов',
    snippet: 'Мы соскучились! Дарим 1000 приветственных бонусов на следующую покупку.',
    status: 'done',
    sent: 12000,
    target: 12000,
    errors: 104,
    reach: 11500,
    date: '01 Мар, 12:00',
    sparkline: [60, 40, 50, 30, 10]
  }
];

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'running', label: 'Активные', color: COLORS.green },
  { id: 'scheduled', label: 'Запланировано', color: COLORS.yellow },
  { id: 'archived', label: 'Архив', color: COLORS.blue }
];

const MiniSparkline = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
      {data.map((val, i) => (
        <div 
          key={i} 
          style={{ 
            width: 3, 
            height: `${Math.max((val / max) * 100, 10)}%`, 
            background: color,
            borderRadius: 2,
            opacity: val === 0 ? 0.3 : 0.8
          }} 
        />
      ))}
    </div>
  );
};

export function CampaignsV3() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [livePulse, setLivePulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setLivePulse(p => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return COLORS.green;
      case 'scheduled': return COLORS.yellow;
      case 'paused': return COLORS.blue;
      case 'done': return COLORS.text;
      default: return COLORS.muted;
    }
  };

  const filteredCampaigns = INITIAL_CAMPAIGNS.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.snippet.toLowerCase().includes(search.toLowerCase());
    let matchesFilter = true;
    if (activeFilter === 'running') matchesFilter = c.status === 'running';
    if (activeFilter === 'scheduled') matchesFilter = c.status === 'scheduled';
    if (activeFilter === 'archived') matchesFilter = ['paused', 'done'].includes(c.status);
    return matchesSearch && matchesFilter;
  });

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
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressSweep {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 5px rgba(45, 232, 151, 0.2); }
          50% { box-shadow: 0 0 15px rgba(45, 232, 151, 0.6); }
          100% { box-shadow: 0 0 5px rgba(45, 232, 151, 0.2); }
        }
        .animate-card {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header & Sticky Search */}
      <div style={{
        padding: '40px 20px 16px',
        background: `linear-gradient(180deg, ${COLORS.bg} 85%, transparent 100%)`,
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Campaigns</h1>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <SearchIcon size={18} color={COLORS.muted} style={{ position: 'absolute', left: 16 }} />
            <input 
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: COLORS.glassBg,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${COLORS.glassBorder}`,
                borderRadius: 24,
                padding: '12px 16px 12px 44px',
                color: COLORS.text,
                fontSize: 15,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <button style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: COLORS.glassBg,
            border: `1px solid ${COLORS.glassBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.text,
            cursor: 'pointer',
            flexShrinks: 0
          }}>
            <FilterIcon size={18} />
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="hide-scroll" style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          margin: '0 -20px',
          padding: '0 20px 4px'
        }}>
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  background: isActive ? (filter.color ? `${filter.color}20` : 'rgba(255,255,255,0.1)') : 'transparent',
                  border: `1px solid ${isActive ? (filter.color || COLORS.text) : COLORS.glassBorder}`,
                  color: isActive ? (filter.color || COLORS.text) : COLORS.muted,
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive && filter.color ? `0 0 12px ${filter.color}30` : 'none'
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards List */}
      <div className="hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredCampaigns.map((campaign, idx) => {
          const isRunning = campaign.status === 'running';
          const statusColor = getStatusColor(campaign.status);
          const progress = campaign.target > 0 ? (campaign.sent / campaign.target) * 100 : 0;

          return (
            <div 
              key={campaign.id} 
              className="animate-card"
              style={{
                background: COLORS.glassBg,
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                border: `1px solid ${COLORS.glassBorder}`,
                borderRadius: 20,
                padding: '16px 20px',
                animationDelay: `${idx * 0.08}s`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Colored Left Border Strip */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: statusColor,
                boxShadow: isRunning ? `0 0 10px ${statusColor}` : 'none'
              }} />

              {/* Header: Title + Sparkline */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.3, paddingRight: 12 }}>
                  {campaign.title}
                </h3>
                <MiniSparkline data={campaign.sparkline} color={statusColor} />
              </div>

              {/* Snippet */}
              <p style={{
                fontSize: 13,
                color: COLORS.muted,
                margin: '0 0 16px 0',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {campaign.snippet}
              </p>

              {/* Progress or Countdown */}
              {campaign.status !== 'scheduled' ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isRunning ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: statusColor, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <ZapIcon size={12} color={statusColor} style={{ animation: 'pulseGlow 2s infinite' }} />
                          В процессе
                        </div>
                      ) : campaign.status === 'paused' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: statusColor, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <PauseIcon size={12} color={statusColor} /> Пауза
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: COLORS.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <CheckIcon size={12} color={COLORS.muted} /> Завершено
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isRunning ? statusColor : COLORS.text, fontVariantNumeric: 'tabular-nums' }}>
                      {campaign.sent.toLocaleString('ru')} / {campaign.target.toLocaleString('ru')}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      background: isRunning ? `linear-gradient(90deg, ${statusColor}, #ffffff, ${statusColor})` : statusColor,
                      backgroundSize: '200% 100%',
                      borderRadius: 2,
                      animation: isRunning ? 'progressSweep 2s linear infinite' : 'none',
                      opacity: campaign.status === 'done' ? 0.3 : 1
                    }} />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px dashed ${COLORS.glassBorder}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${statusColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClockIcon size={14} color={statusColor} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, marginBottom: 2 }}>Старт через</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: statusColor, fontVariantNumeric: 'tabular-nums' }}>
                      {campaign.countdown}
                    </div>
                  </div>
                </div>
              )}

              {/* 3-Column Stats Footer */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: 8,
                paddingTop: 12,
                borderTop: `1px solid ${COLORS.glassBorder}`
              }}>
                <div>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Отправлено</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{campaign.sent.toLocaleString('ru')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Охват</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{campaign.reach.toLocaleString('ru')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Ошибок</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: campaign.errors > 0 ? COLORS.red : COLORS.text }}>
                    {campaign.errors > 0 ? `+${campaign.errors}` : '0'}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button style={{
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${COLORS.green}, #1fb372)`,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#000',
        cursor: 'pointer',
        boxShadow: `0 10px 24px ${COLORS.green}50, inset 0 -2px 0 rgba(0,0,0,0.1)`,
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 30
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <PlusIcon size={28} />
      </button>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: `linear-gradient(0deg, ${COLORS.bg} 20%, transparent 100%)`,
        pointerEvents: 'none',
        zIndex: 20
      }} />
    </div>
  );
}
