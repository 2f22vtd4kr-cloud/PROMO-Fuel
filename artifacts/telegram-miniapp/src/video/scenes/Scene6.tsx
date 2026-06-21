import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const chars = 'PROMO-FUEL'.split('');

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#050B14' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Blue wipe */}
      <motion.div className="absolute inset-y-0 left-0 right-0" style={{ background: '#005BBB', transformOrigin: 'left' }}
        animate={{ scaleX: phase >= 1 ? [1, 0] : 0 }}
        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }} />
      {/* Gold wipe */}
      <motion.div className="absolute inset-y-0 right-0" style={{ background: '#FFD500', width: '50%', transformOrigin: 'right' }}
        animate={{ scaleX: phase >= 1 ? [1, 0] : 0 }}
        transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1], delay: 0.08 }} />

      {/* Grid lines */}
      {[25, 50, 75].map(p => (
        <div key={p} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 1, background: 'rgba(255,255,255,0.03)' }} />
      ))}

      {/* Diamond */}
      <motion.div style={{ marginBottom: '2rem' }}
        animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.4, rotate: phase >= 2 ? 0 : 45 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}>
        <div style={{ width: '5vw', height: '5vw', background: 'linear-gradient(135deg, #005BBB 0%, #FFD500 100%)', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', boxShadow: '0 0 40px rgba(0,91,187,0.5), 0 0 80px rgba(255,213,0,0.25)' }} />
      </motion.div>

      {/* Per-char title */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5vw', overflow: 'hidden', marginBottom: '1.5rem', perspective: '800px', userSelect: 'none' }}>
        {chars.map((char, i) => (
          <motion.span key={i}
            style={{ fontFamily: 'Anton, sans-serif', fontSize: char === '-' ? '9vw' : '12vw', lineHeight: 1, color: char === '-' ? '#005BBB' : 'white', textTransform: 'uppercase', display: 'inline-block' }}
            initial={{ opacity: 0, y: 60, rotateX: -30 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 60, rotateX: -30 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: phase >= 2 ? 0.05 * i : 0 }}>
            {char}
          </motion.span>
        ))}
      </div>

      {/* Rule */}
      <motion.div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #FFD500, #005BBB, #FFD500, transparent)', marginBottom: '1.5rem' }}
        animate={{ width: phase >= 3 ? '55%' : '0%', opacity: phase >= 3 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />

      {/* Tagline */}
      <motion.div style={{ fontSize: '2vw', fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 18, filter: phase >= 3 ? 'blur(0px)' : 'blur(6px)' }}
        transition={{ duration: 0.9 }}>
        Built for <span style={{ color: '#FFD500', fontWeight: 800 }}>Ukraine's</span> fuel network.
      </motion.div>

      {/* Flag stripe */}
      <motion.div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', height: 4, overflow: 'hidden' }}
        animate={{ opacity: phase >= 3 ? 1 : 0 }} transition={{ duration: 0.5 }}>
        <div style={{ flex: 1, background: '#005BBB' }} />
        <div style={{ flex: 1, background: '#FFD500' }} />
      </motion.div>

      {/* Ambient glow */}
      <motion.div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,91,187,0.12) 0%, transparent 70%)', pointerEvents: 'none' }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }} transition={{ duration: 1.5 }} />

      {/* Corner brackets */}
      {[
        { top: '3vh', left: '3vw', borderTop: '1.5px solid rgba(255,213,0,0.45)', borderLeft: '1.5px solid rgba(255,213,0,0.45)' },
        { top: '3vh', right: '3vw', borderTop: '1.5px solid rgba(255,213,0,0.45)', borderRight: '1.5px solid rgba(255,213,0,0.45)' },
        { bottom: '4vh', left: '3vw', borderBottom: '1.5px solid rgba(255,213,0,0.45)', borderLeft: '1.5px solid rgba(255,213,0,0.45)' },
        { bottom: '4vh', right: '3vw', borderBottom: '1.5px solid rgba(255,213,0,0.45)', borderRight: '1.5px solid rgba(255,213,0,0.45)' },
      ].map((s, i) => (
        <motion.div key={i} style={{ position: 'absolute', width: '2.5vw', height: '2.5vw', ...s }}
          animate={{ opacity: phase >= 4 ? 0.7 : 0, scale: phase >= 4 ? 1 : 0.3 }}
          transition={{ duration: 0.5, delay: i * 0.08 }} />
      ))}
    </motion.div>
  );
}
