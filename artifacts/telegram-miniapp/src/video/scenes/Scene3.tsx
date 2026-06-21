import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const campaigns = [
  { label: 'Літній бонус', status: 'ACTIVE', pct: 78, color: '#FFD500' },
  { label: 'ДТ -8грн/л', status: 'SCHEDULED', pct: 45, color: '#005BBB' },
  { label: 'Преміум клієнти', status: 'ACTIVE', pct: 91, color: '#FFD500' },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center overflow-hidden"
      initial={{ opacity: 0, x: '8vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-8vw' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Left */}
      <div style={{ width: '42%', paddingLeft: '7vw', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ overflow: 'hidden', marginBottom: '1rem' }}>
          <motion.div style={{ fontSize: '1.1vw', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', padding: '4px 16px', borderRadius: '999px', border: '1px solid rgba(0,91,187,0.4)', color: '#005BBB', background: 'rgba(0,91,187,0.1)', display: 'inline-block' }}
            animate={{ y: phase >= 1 ? '0%' : '130%', opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            Campaign Management
          </motion.div>
        </div>
        {['Schedule.', 'Target.', 'Convert.'].map((word, i) => (
          <div key={i} style={{ overflow: 'hidden' }}>
            <motion.div style={{ fontFamily: 'Anton, sans-serif', fontSize: '8.5vw', color: i === 1 ? '#FFD500' : 'white', textTransform: 'uppercase', lineHeight: 0.9 }}
              animate={{ y: phase >= 2 + i ? '0%' : '110%' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}>
              {word}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <motion.div style={{ position: 'absolute', left: '42%', top: '15%', bottom: '15%', width: 1, background: 'linear-gradient(180deg, transparent, rgba(0,91,187,0.5), rgba(255,213,0,0.5), transparent)' }}
        animate={{ scaleY: phase >= 2 ? 1 : 0, opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />

      {/* Campaign cards */}
      <div style={{ width: '58%', paddingLeft: '4vw', paddingRight: '6vw', display: 'flex', flexDirection: 'column', gap: '2vh', justifyContent: 'center' }}>
        {campaigns.map((c, i) => (
          <motion.div key={c.label}
            style={{ borderRadius: 16, border: `1px solid ${c.color}33`, background: 'rgba(5,11,20,0.85)', backdropFilter: 'blur(12px)', padding: '2vh 2vw', position: 'relative', overflow: 'hidden' }}
            animate={{ x: phase >= 3 + i ? 0 : 80, opacity: phase >= 3 + i ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}>
            <motion.div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.color }}
              animate={{ scaleY: phase >= 3 + i ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.15 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '1.3vw' }}>{c.label}</span>
              <span style={{ fontSize: '0.9vw', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 4, color: c.color, background: `${c.color}22` }}>{c.status}</span>
            </div>
            <div style={{ borderRadius: 4, overflow: 'hidden', height: 4, background: 'rgba(255,255,255,0.08)' }}>
              <motion.div style={{ height: '100%', borderRadius: 4, background: c.color }}
                initial={{ width: '0%' }}
                animate={{ width: phase >= 4 ? `${c.pct}%` : '0%' }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.1 }} />
            </div>
            <div style={{ marginTop: 4, textAlign: 'right', fontSize: '0.85vw', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{c.pct}%</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
