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

  const words = 'PROMO-FUEL'.split('');

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#050B14]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Full-width blue sweep from left */}
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{ background: '#005BBB', transformOrigin: 'left' }}
        animate={{ scaleX: phase >= 1 ? [1, 0] : 0 }}
        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0 }}
      />

      {/* Gold sweep from right */}
      <motion.div
        className="absolute inset-y-0 right-0"
        style={{ background: '#FFD500', transformOrigin: 'right', width: '50%' }}
        animate={{ scaleX: phase >= 1 ? [1, 0] : 0 }}
        transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1], delay: 0.08 }}
      />

      {/* Subtle grid lines */}
      {[25, 50, 75].map(pct => (
        <div
          key={pct}
          className="absolute top-0 bottom-0 w-[1px]"
          style={{ left: `${pct}%`, background: 'rgba(255,255,255,0.03)' }}
        />
      ))}

      {/* Diamond logo mark */}
      <motion.div
        className="mb-8"
        animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.4, rotate: phase >= 2 ? 0 : 45 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
      >
        <div
          className="w-[5vw] h-[5vw]"
          style={{
            background: 'linear-gradient(135deg, #005BBB 0%, #FFD500 100%)',
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            boxShadow: '0 0 40px rgba(0,91,187,0.5), 0 0 80px rgba(255,213,0,0.25)',
          }}
        />
      </motion.div>

      {/* Giant title */}
      <div className="flex items-baseline gap-[0.5vw] overflow-hidden mb-6" style={{ perspective: '800px' }}>
        {words.map((char, i) => (
          <motion.span
            key={i}
            className="font-black text-white uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: char === '-' ? '9vw' : '12vw',
              lineHeight: 1,
              color: char === '-' ? '#005BBB' : 'white',
              display: 'inline-block',
            }}
            initial={{ opacity: 0, y: 60, rotateX: -30 }}
            animate={
              phase >= 2
                ? { opacity: 1, y: 0, rotateX: 0 }
                : { opacity: 0, y: 60, rotateX: -30 }
            }
            transition={{
              type: 'spring', stiffness: 220, damping: 20,
              delay: phase >= 2 ? 0.05 * i : 0,
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Gold rule */}
      <motion.div
        className="h-[2px] mb-6"
        style={{ background: 'linear-gradient(90deg, transparent, #FFD500, #005BBB, #FFD500, transparent)' }}
        animate={{ width: phase >= 3 ? '55%' : '0%', opacity: phase >= 3 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Tagline */}
      <motion.div
        className="text-[2vw] font-medium tracking-wide text-center"
        style={{ color: 'rgba(255,255,255,0.65)' }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 18, filter: phase >= 3 ? 'blur(0px)' : 'blur(6px)' }}
        transition={{ duration: 0.9 }}
      >
        Built for{' '}
        <span style={{ color: '#FFD500', fontWeight: 800 }}>Ukraine's</span>
        {' '}fuel network.
      </motion.div>

      {/* Ukrainian flag accent at bottom */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex overflow-hidden"
        style={{ height: '4px' }}
        animate={{ opacity: phase >= 3 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex-1 bg-[#005BBB]" />
        <div className="flex-1 bg-[#FFD500]" />
      </motion.div>

      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,91,187,0.12) 0%, transparent 70%)',
        }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 1.5 }}
      />

      {/* Corner accents */}
      {[
        { top: '3vh', left: '3vw' }, { top: '3vh', right: '3vw' },
        { bottom: '4vh', left: '3vw' }, { bottom: '4vh', right: '3vw' },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute w-[2.5vw] h-[2.5vw]"
          style={{
            ...pos,
            borderTop: i < 2 ? '1.5px solid rgba(255,213,0,0.45)' : 'none',
            borderBottom: i >= 2 ? '1.5px solid rgba(255,213,0,0.45)' : 'none',
            borderLeft: i % 2 === 0 ? '1.5px solid rgba(255,213,0,0.45)' : 'none',
            borderRight: i % 2 === 1 ? '1.5px solid rgba(255,213,0,0.45)' : 'none',
          }}
          animate={{ opacity: phase >= 4 ? 0.7 : 0, scale: phase >= 4 ? 1 : 0.3 }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
        />
      ))}
    </motion.div>
  );
}
