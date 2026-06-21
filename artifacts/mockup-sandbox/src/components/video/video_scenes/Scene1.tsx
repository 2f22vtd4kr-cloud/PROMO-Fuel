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
        className="absolute inset-x-0 top-0 h-1/2 origin-top"
        style={{ background: 'linear-gradient(180deg, #003f8a 0%, #005BBB 100%)' }}
        animate={{ y: phase >= 2 ? '-100%' : '0%', opacity: phase >= 4 ? 0 : 1 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom"
        style={{ background: 'linear-gradient(0deg, #cc9900 0%, #FFD500 100%)' }}
        animate={{ y: phase >= 2 ? '100%' : '0%', opacity: phase >= 4 ? 0 : 1 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      />

      {/* Seam glow at split line */}
      <motion.div
        className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, #FFD500, #fff, #FFD500, transparent)', filter: 'blur(2px)' }}
        animate={{ opacity: phase >= 1 && phase < 3 ? 1 : 0, scaleX: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      />

      {/* Background after flag splits */}
      <div className="absolute inset-0 bg-[#050B14]" style={{ zIndex: -1 }} />

      {/* Scan lines texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)',
          zIndex: 5,
        }}
      />

      {/* Blue accent line — horizontal sweep */}
      <motion.div
        className="absolute top-[48%] left-0 h-[2px] bg-[#005BBB]"
        animate={{ width: phase >= 3 ? '35%' : '0%', opacity: phase >= 3 ? 0.9 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{ zIndex: 10 }}
      />
      <motion.div
        className="absolute top-[52%] right-0 h-[2px] bg-[#FFD500]"
        animate={{ width: phase >= 3 ? '35%' : '0%', opacity: phase >= 3 ? 0.9 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        style={{ zIndex: 10 }}
      />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10 }}>
        {/* Trident mark */}
        <motion.div
          animate={{
            opacity: phase >= 3 ? 1 : 0,
            y: phase >= 3 ? 0 : 20,
            scale: phase >= 3 ? 1 : 0.8,
          }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-[6vw] mb-4 select-none"
          style={{ filter: 'drop-shadow(0 0 20px rgba(255,213,0,0.7))' }}
        >
          🔱
        </motion.div>

        {/* Title */}
        <div className="overflow-hidden">
          <motion.div
            className="text-[8vw] font-black text-white uppercase tracking-[0.12em] leading-none"
            style={{ fontFamily: 'var(--font-display)', textShadow: '0 0 60px rgba(255,255,255,0.15)' }}
            animate={{ y: phase >= 3 ? '0%' : '110%' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            UKRAINE
          </motion.div>
        </div>
        <div className="overflow-hidden">
          <motion.div
            className="text-[4vw] font-bold tracking-[0.35em] uppercase mt-1"
            style={{ color: '#FFD500', fontFamily: 'var(--font-display)' }}
            animate={{ y: phase >= 3 ? '0%' : '110%' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          >
            FUEL NETWORK
          </motion.div>
        </div>
      </div>

      {/* Corner brackets */}
      {[
        { top: '4vh', left: '4vw', rotate: 0 },
        { top: '4vh', right: '4vw', rotate: 90 },
        { bottom: '4vh', left: '4vw', rotate: 270 },
        { bottom: '4vh', right: '4vw', rotate: 180 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute w-[3vw] h-[3vw]"
          style={{
            ...pos,
            borderTop: i === 0 || i === 1 ? '2px solid rgba(255,213,0,0.6)' : 'none',
            borderBottom: i === 2 || i === 3 ? '2px solid rgba(255,213,0,0.6)' : 'none',
            borderLeft: i === 0 || i === 2 ? '2px solid rgba(255,213,0,0.6)' : 'none',
            borderRight: i === 1 || i === 3 ? '2px solid rgba(255,213,0,0.6)' : 'none',
            zIndex: 10,
          }}
          animate={{ opacity: phase >= 3 ? 0.7 : 0, scale: phase >= 3 ? 1 : 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 * i }}
        />
      ))}
    </motion.div>
  );
}
