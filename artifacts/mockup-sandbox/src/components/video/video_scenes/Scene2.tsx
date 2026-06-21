import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2800),
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
      {/* Diagonal gold slash */}
      <motion.div
        className="absolute top-0 bottom-0 w-[3px] bg-[#FFD500] opacity-60"
        style={{ left: '22%', transform: 'rotate(15deg) scaleY(1.5)', transformOrigin: 'center' }}
        animate={{ scaleY: phase >= 1 ? 1.5 : 0, opacity: phase >= 1 ? 0.5 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute top-0 bottom-0 w-[3px] bg-[#005BBB] opacity-40"
        style={{ right: '22%', transform: 'rotate(15deg) scaleY(1.5)', transformOrigin: 'center' }}
        animate={{ scaleY: phase >= 1 ? 1.5 : 0, opacity: phase >= 1 ? 0.4 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />

      {/* "Introducing" eyebrow — revealed via clip */}
      <div className="overflow-hidden mb-6">
        <motion.div
          className="text-[1.4vw] font-bold tracking-[0.4em] uppercase"
          style={{ color: '#FFD500' }}
          animate={{ y: phase >= 1 ? '0%' : '120%' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Introducing
        </motion.div>
      </div>

      {/* Giant kinetic title — per-character stagger */}
      <div className="flex items-baseline leading-none select-none" style={{ perspective: '600px' }}>
        {chars.map((char, i) => (
          <motion.span
            key={i}
            className="font-black uppercase text-white"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: char === '-' ? '10vw' : '13vw',
              lineHeight: 1,
              display: 'inline-block',
              color: char === '-' ? '#005BBB' : 'white',
              textShadow: char === '-' ? 'none' : '0 0 80px rgba(255,255,255,0.08)',
            }}
            initial={{ opacity: 0, y: 80, rotateX: -60, scale: 0.8 }}
            animate={
              phase >= 2
                ? { opacity: 1, y: 0, rotateX: 0, scale: 1 }
                : { opacity: 0, y: 80, rotateX: -60, scale: 0.8 }
            }
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 22,
              delay: phase >= 2 ? i * 0.045 : 0,
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Tagline */}
      <motion.div
        className="mt-8 text-[2.4vw] font-medium tracking-wide"
        style={{ color: 'rgba(255,255,255,0.75)' }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20, filter: phase >= 3 ? 'blur(0px)' : 'blur(8px)' }}
        transition={{ duration: 0.8 }}
      >
        Targeted promos.{' '}
        <span style={{ color: '#FFD500', fontWeight: 700 }}>Real reach.</span>
      </motion.div>

      {/* Bottom gold bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, transparent, #FFD500, #005BBB, #FFD500, transparent)' }}
        animate={{ scaleX: phase >= 4 ? 1 : 0, opacity: phase >= 4 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style2={{ transformOrigin: 'center' }}
      />

      {/* Ambient orb behind title */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(0,91,187,0.18) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: phase >= 2 ? [1, 1.1, 1] : 0.5, opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
