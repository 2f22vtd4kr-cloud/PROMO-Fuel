import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const chars = 'PROMO-FUEL'.split('');

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* Diagonal slashes */}
      <motion.div className="absolute top-0 bottom-0 w-[3px] bg-[#FFD500]" style={{ left: '22%', transform: 'rotate(15deg) scaleY(1.5)', opacity: 0.5 }}
        animate={{ scaleY: phase >= 1 ? 1.5 : 0, opacity: phase >= 1 ? 0.45 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
      <motion.div className="absolute top-0 bottom-0 w-[3px] bg-[#005BBB]" style={{ right: '22%', transform: 'rotate(15deg) scaleY(1.5)', opacity: 0.35 }}
        animate={{ scaleY: phase >= 1 ? 1.5 : 0, opacity: phase >= 1 ? 0.35 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} />

      {/* Eyebrow */}
      <div style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
        <motion.div style={{ fontSize: '1.4vw', fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#FFD500' }}
          animate={{ y: phase >= 1 ? '0%' : '120%' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          Introducing
        </motion.div>
      </div>

      {/* Per-character title */}
      <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1, userSelect: 'none', perspective: '600px' }}>
        {chars.map((char, i) => (
          <motion.span key={i}
            style={{
              fontFamily: 'Anton, sans-serif',
              fontSize: char === '-' ? '10vw' : '13vw',
              lineHeight: 1,
              display: 'inline-block',
              color: char === '-' ? '#005BBB' : 'white',
              textTransform: 'uppercase',
            }}
            initial={{ opacity: 0, y: 80, rotateX: -60, scale: 0.8 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0, scale: 1 } : { opacity: 0, y: 80, rotateX: -60, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: phase >= 2 ? i * 0.045 : 0 }}>
            {char}
          </motion.span>
        ))}
      </div>

      {/* Tagline */}
      <motion.div style={{ marginTop: '2rem', fontSize: '2.4vw', fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.75)' }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20, filter: phase >= 3 ? 'blur(0px)' : 'blur(8px)' }}
        transition={{ duration: 0.8 }}>
        Targeted promos.{' '}
        <span style={{ color: '#FFD500', fontWeight: 700 }}>Real reach.</span>
      </motion.div>

      {/* Ambient orb */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0,91,187,0.18) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        animate={{ scale: phase >= 2 ? [1, 1.1, 1] : 0.5, opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
    </motion.div>
  );
}
