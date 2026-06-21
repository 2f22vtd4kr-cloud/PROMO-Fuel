import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: 'blur(12px)' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Full-screen Ukrainian flag halves splitting apart */}
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2"
        style={{ background: 'linear-gradient(180deg, #003f8a 0%, #005BBB 100%)' }}
        animate={{ y: phase >= 2 ? '-100%' : '0%', opacity: phase >= 4 ? 0 : 1 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: 'linear-gradient(0deg, #cc9900 0%, #FFD500 100%)' }}
        animate={{ y: phase >= 2 ? '100%' : '0%', opacity: phase >= 4 ? 0 : 1 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      />

      {/* Seam glow */}
      <motion.div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2"
        style={{ height: 3, background: 'linear-gradient(90deg, transparent, #FFD500, #fff, #FFD500, transparent)', filter: 'blur(2px)' }}
        animate={{ opacity: phase >= 1 && phase < 3 ? 1 : 0, scaleX: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      />

      <div style={{ position: 'absolute', inset: 0, background: '#050B14', zIndex: -1 }} />

      {/* Scan lines */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)', zIndex: 5 }} />

      {/* Blue/gold accent lines */}
      <motion.div className="absolute left-0 h-[2px] bg-[#005BBB]" style={{ top: '48%', zIndex: 10 }}
        animate={{ width: phase >= 3 ? '35%' : '0%', opacity: phase >= 3 ? 0.9 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} />
      <motion.div className="absolute right-0 h-[2px] bg-[#FFD500]" style={{ top: '52%', zIndex: 10 }}
        animate={{ width: phase >= 3 ? '35%' : '0%', opacity: phase >= 3 ? 0.9 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.25 }} />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10 }}>
        <motion.div
          style={{ fontSize: '6vw', lineHeight: 1, marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(255,213,0,0.7))', userSelect: 'none' }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20, scale: phase >= 3 ? 1 : 0.8 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >🔱</motion.div>

        <div style={{ overflow: 'hidden' }}>
          <motion.div
            style={{ fontFamily: 'Anton, sans-serif', fontSize: '8vw', fontWeight: 900, color: 'white', letterSpacing: '0.12em', lineHeight: 1, textTransform: 'uppercase' }}
            animate={{ y: phase >= 3 ? '0%' : '110%' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >UKRAINE</motion.div>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <motion.div
            style={{ fontFamily: 'Anton, sans-serif', fontSize: '4vw', color: '#FFD500', letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: '0.25rem' }}
            animate={{ y: phase >= 3 ? '0%' : '110%' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          >FUEL NETWORK</motion.div>
        </div>
      </div>

      {/* Corner brackets */}
      {[
        { top: '4vh', left: '4vw', borderTop: '2px solid rgba(255,213,0,0.6)', borderLeft: '2px solid rgba(255,213,0,0.6)' },
        { top: '4vh', right: '4vw', borderTop: '2px solid rgba(255,213,0,0.6)', borderRight: '2px solid rgba(255,213,0,0.6)' },
        { bottom: '4vh', left: '4vw', borderBottom: '2px solid rgba(255,213,0,0.6)', borderLeft: '2px solid rgba(255,213,0,0.6)' },
        { bottom: '4vh', right: '4vw', borderBottom: '2px solid rgba(255,213,0,0.6)', borderRight: '2px solid rgba(255,213,0,0.6)' },
      ].map((s, i) => (
        <motion.div key={i} style={{ position: 'absolute', width: '3vw', height: '3vw', zIndex: 10, ...s }}
          animate={{ opacity: phase >= 3 ? 0.7 : 0, scale: phase >= 3 ? 1 : 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 * i }} />
      ))}
    </motion.div>
  );
}
