import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STATS = [
  { label: 'Reach', value: '127K', sub: 'recipients', color: '#FFD500' },
  { label: 'Open Rate', value: '68%', sub: 'avg across campaigns', color: '#005BBB' },
  { label: 'Conversion', value: '24%', sub: 'promo redeemed', color: '#FFD500' },
];
const BARS = [55, 72, 43, 89, 65, 91, 78];

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
      transition={{ duration: 0.9 }}
    >
      {/* Left */}
      <div style={{ width: '45%', paddingLeft: '7vw', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ overflow: 'hidden', marginBottom: '1rem' }}>
          <motion.div style={{ fontSize: '1.2vw', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#005BBB' }}
            animate={{ y: phase >= 1 ? '0%' : '130%' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            Analytics Dashboard
          </motion.div>
        </div>
        {['Real-Time', 'Stats'].map((w, i) => (
          <div key={i} style={{ overflow: 'hidden' }}>
            <motion.div style={{ fontFamily: 'Anton, sans-serif', fontSize: '10vw', color: i === 1 ? '#FFD500' : 'white', textTransform: 'uppercase', lineHeight: 0.88 }}
              animate={{ y: phase >= 2 ? '0%' : '110%' }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}>
              {w}
            </motion.div>
          </div>
        ))}
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {STATS.map((s, i) => (
            <motion.div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              animate={{ x: phase >= 3 ? 0 : -40, opacity: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}>
              <div style={{ width: 2, alignSelf: 'stretch', borderRadius: 4, background: s.color }} />
              <div>
                <div style={{ fontWeight: 900, fontSize: '2.4vw', lineHeight: 1, color: 'white' }}>{s.value}</div>
                <div style={{ fontSize: '0.85vw', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{s.label} — {s.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <motion.div style={{ position: 'absolute', left: '45%', top: '12%', bottom: '12%', width: 1, background: 'linear-gradient(180deg, transparent, rgba(255,213,0,0.4), rgba(0,91,187,0.4), transparent)' }}
        animate={{ scaleY: phase >= 2 ? 1 : 0, opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />

      {/* Right */}
      <div style={{ width: '55%', paddingRight: '6vw', paddingLeft: '2vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem' }}>
        {/* Bar chart */}
        <motion.div style={{ borderRadius: 16, border: '1px solid rgba(0,91,187,0.25)', background: 'rgba(5,11,20,0.8)', backdropFilter: 'blur(16px)', padding: '2.5vh 2vw' }}
          animate={{ y: phase >= 2 ? 0 : 40, opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: '0.9vw', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Sends per Day</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.2vw', height: '12vh' }}>
            {BARS.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <motion.div style={{ borderRadius: '4px 4px 0 0', background: i === 5 ? 'linear-gradient(180deg,#FFD500,#cc9900)' : 'linear-gradient(180deg,#005BBB,#003f8a)', boxShadow: i === 5 ? '0 -6px 16px rgba(255,213,0,0.4)' : 'none' }}
                  initial={{ height: 0 }}
                  animate={{ height: phase >= 3 ? `${h}%` : 0 }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 + i * 0.07 }} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Donut */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <motion.div style={{ width: '11vw', height: '11vw', position: 'relative', flexShrink: 0 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, rotate: phase >= 3 ? 0 : -90 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <motion.circle cx="50" cy="50" r="38" fill="none" stroke="#FFD500" strokeWidth="10" strokeLinecap="round"
                strokeDasharray="239"
                initial={{ strokeDashoffset: 239 }}
                animate={{ strokeDashoffset: phase >= 4 ? 60 : 239 }}
                transition={{ duration: 1.5, ease: 'easeOut' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '2.6vw', color: 'white', lineHeight: 1 }}>75%</div>
              <div style={{ fontSize: '0.75vw', fontWeight: 700, color: '#FFD500', textTransform: 'uppercase', letterSpacing: '0.1em' }}>open</div>
            </div>
          </motion.div>
          <motion.div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            animate={{ opacity: phase >= 4 ? 1 : 0, x: phase >= 4 ? 0 : 20 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD500' }} />
              <span style={{ fontSize: '0.9vw', fontWeight: 700, color: 'white' }}>LIVE</span>
            </div>
            <div style={{ fontSize: '0.8vw', color: 'rgba(255,255,255,0.45)' }}>3 campaigns running</div>
            <div style={{ fontSize: '0.8vw', color: 'rgba(255,255,255,0.45)' }}>4 workers active</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
