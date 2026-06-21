import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const WORKERS = [
  { id: 'W-1', sends: '14,280', active: true },
  { id: 'W-2', sends: '11,940', active: true },
  { id: 'W-3', sends: '9,615',  active: false },
  { id: 'W-4', sends: '6,300',  active: true },
];
const BAR_H = [74, 62, 48, 35];

export function Scene4() {
  const [phase, setPhase] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2800),
    ];
    const iv = setInterval(() => setTick(t => t + 1), 800);
    return () => { timers.forEach(t => clearTimeout(t)); clearInterval(iv); };
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-6vh' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Radial glow */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(0,91,187,0.14) 0%, transparent 65%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />

      <div style={{ overflow: 'hidden', marginBottom: '0.75rem' }}>
        <motion.div style={{ fontSize: '1.3vw', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#FFD500', textAlign: 'center' }}
          animate={{ y: phase >= 1 ? '0%' : '130%' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          Group Broadcasting
        </motion.div>
      </div>

      <div style={{ overflow: 'hidden', marginBottom: '2.5rem' }}>
        <motion.div style={{ fontFamily: 'Anton, sans-serif', fontSize: '9.5vw', color: 'white', textTransform: 'uppercase', textAlign: 'center', lineHeight: 0.95 }}
          animate={{ y: phase >= 2 ? '0%' : '110%' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          MULTI-WORKER<br /><span style={{ color: '#005BBB' }}>ENGINE</span>
        </motion.div>
      </div>

      <div style={{ display: 'flex', gap: '3vw', alignItems: 'flex-end' }}>
        {WORKERS.map((w, i) => {
          const pulse = (tick + i) % 2 === 0;
          const c = w.active ? '#005BBB' : '#FFD500';
          return (
            <motion.div key={w.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
              animate={{ y: phase >= 3 ? 0 : 60, opacity: phase >= 3 ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 20, delay: i * 0.1 }}>
              <motion.div style={{ fontSize: '0.95vw', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}
                animate={{ opacity: phase >= 4 ? 1 : 0 }} transition={{ duration: 0.5 }}>
                {w.sends}
              </motion.div>
              <div style={{ width: '6vw', height: '14vh', background: 'rgba(255,255,255,0.05)', borderRadius: '8px 8px 0 0', position: 'relative', overflow: 'hidden' }}>
                <motion.div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderRadius: '8px 8px 0 0', background: w.active ? 'linear-gradient(180deg,#005BBB,#003f8a)' : 'linear-gradient(180deg,#FFD500,#cc9900)', boxShadow: w.active ? '0 -8px 24px rgba(0,91,187,0.5)' : '0 -8px 24px rgba(255,213,0,0.5)' }}
                  initial={{ height: '0%' }}
                  animate={{ height: phase >= 3 ? `${BAR_H[i]}%` : '0%' }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 + i * 0.1 }} />
              </div>
              <motion.div style={{ width: '4vw', height: '4vw', borderRadius: '50%', border: `2px solid ${c}`, background: `${c}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: pulse ? `0 0 18px ${c}99` : 'none' }}
                animate={{ scale: pulse ? 1.08 : 1 }} transition={{ duration: 0.4 }}>
                <div style={{ width: '33%', height: '33%', borderRadius: '50%', background: c }} />
              </motion.div>
              <div style={{ fontSize: '1vw', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)' }}>{w.id}</div>
            </motion.div>
          );
        })}
      </div>

      <motion.div style={{ marginTop: '2rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}
        animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 16 }} transition={{ duration: 0.7 }}>
        <span style={{ fontFamily: 'Anton, sans-serif', fontSize: '4.5vw', color: 'white' }}>42,135</span>
        <span style={{ fontSize: '1.5vw', fontWeight: 700, color: '#FFD500', textTransform: 'uppercase', letterSpacing: '0.1em' }}>messages / campaign</span>
      </motion.div>

      <motion.div className="absolute h-[2px] bg-[#FFD500] opacity-50"
        style={{ bottom: '6%' }}
        animate={{ width: phase >= 2 ? '60%' : '0%', left: phase >= 2 ? '20%' : '50%' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
    </motion.div>
  );
}
