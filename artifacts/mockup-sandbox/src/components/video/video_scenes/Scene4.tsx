import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const WORKERS = [
  { id: 'W-1', sends: '14,280', status: 'active' },
  { id: 'W-2', sends: '11,940', status: 'active' },
  { id: 'W-3', sends: '9,615', status: 'busy' },
  { id: 'W-4', sends: '6,300', status: 'active' },
];

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
    const interval = setInterval(() => setTick(t => t + 1), 800);
    return () => { timers.forEach(t => clearTimeout(t)); clearInterval(interval); };
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-6vh' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Radial glow behind center */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '70vw', height: '70vw',
          background: 'radial-gradient(circle, rgba(0,91,187,0.14) 0%, transparent 65%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Label */}
      <div className="overflow-hidden mb-3">
        <motion.div
          className="text-[1.3vw] font-bold tracking-[0.35em] uppercase text-[#FFD500] text-center"
          animate={{ y: phase >= 1 ? '0%' : '130%' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Group Broadcasting
        </motion.div>
      </div>

      {/* Hero title */}
      <div className="overflow-hidden mb-10">
        <motion.div
          className="font-black uppercase text-white text-center leading-none"
          style={{ fontFamily: 'var(--font-display)', fontSize: '9.5vw' }}
          animate={{ y: phase >= 2 ? '0%' : '110%' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          MULTI-WORKER
          <br />
          <span style={{ color: '#005BBB' }}>ENGINE</span>
        </motion.div>
      </div>

      {/* Worker nodes grid */}
      <div className="flex gap-[3vw] items-end">
        {WORKERS.map((w, i) => {
          const barH = [74, 62, 48, 35][i];
          const isActive = w.status === 'active';
          const pulse = (tick + i) % 2 === 0;

          return (
            <motion.div
              key={w.id}
              className="flex flex-col items-center gap-3"
              animate={{ y: phase >= 3 ? 0 : 60, opacity: phase >= 3 ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 20, delay: i * 0.1 }}
            >
              {/* Sends counter */}
              <motion.div
                className="text-[0.95vw] font-bold tabular-nums"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                animate={{ opacity: phase >= 4 ? 1 : 0 }}
                transition={{ duration: 0.5 }}
              >
                {w.sends}
              </motion.div>

              {/* Animated bar */}
              <div
                className="w-[6vw] rounded-t-xl overflow-hidden"
                style={{ height: '14vh', background: 'rgba(255,255,255,0.05)', position: 'relative' }}
              >
                <motion.div
                  className="absolute bottom-0 left-0 right-0 rounded-t-xl"
                  style={{
                    background: isActive
                      ? `linear-gradient(180deg, #005BBB 0%, #003f8a 100%)`
                      : `linear-gradient(180deg, #FFD500 0%, #cc9900 100%)`,
                    boxShadow: isActive
                      ? '0 -8px 24px rgba(0,91,187,0.5)'
                      : '0 -8px 24px rgba(255,213,0,0.5)',
                  }}
                  initial={{ height: '0%' }}
                  animate={{ height: phase >= 3 ? `${barH}%` : '0%' }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 + i * 0.1 }}
                />
              </div>

              {/* Node circle */}
              <motion.div
                className="w-[4vw] h-[4vw] rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: isActive ? '#005BBB' : '#FFD500',
                  background: isActive ? 'rgba(0,91,187,0.15)' : 'rgba(255,213,0,0.15)',
                  boxShadow: pulse && isActive
                    ? '0 0 18px rgba(0,91,187,0.6)'
                    : pulse && !isActive
                    ? '0 0 18px rgba(255,213,0,0.6)'
                    : 'none',
                }}
                animate={{ scale: pulse ? 1.08 : 1 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                <div
                  className="w-1/3 h-1/3 rounded-full"
                  style={{ background: isActive ? '#005BBB' : '#FFD500' }}
                />
              </motion.div>

              {/* Worker ID */}
              <div className="text-[1vw] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {w.id}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total stat */}
      <motion.div
        className="mt-8 flex items-baseline gap-2"
        animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 16 }}
        transition={{ duration: 0.7 }}
      >
        <span className="font-black text-[4.5vw] text-white" style={{ fontFamily: 'var(--font-display)' }}>
          42,135
        </span>
        <span className="text-[1.5vw] font-bold text-[#FFD500] uppercase tracking-widest">messages / campaign</span>
      </motion.div>

      {/* Gold line bottom */}
      <motion.div
        className="absolute bottom-[6%] h-[2px] bg-[#FFD500] opacity-50"
        animate={{ width: phase >= 2 ? '60%' : '0%', left: phase >= 2 ? '20%' : '50%' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}
