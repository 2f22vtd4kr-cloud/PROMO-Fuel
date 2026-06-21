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
      {/* Left: headline */}
      <div className="w-[42%] pl-[7vw] flex flex-col justify-center">
        {/* Category label */}
        <div className="overflow-hidden mb-4">
          <motion.div
            className="text-[1.1vw] font-bold tracking-[0.35em] uppercase px-4 py-1 rounded-full border inline-block"
            style={{ borderColor: 'rgba(0,91,187,0.4)', color: '#005BBB', background: 'rgba(0,91,187,0.1)' }}
            animate={{ y: phase >= 1 ? '0%' : '130%', opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Campaign Management
          </motion.div>
        </div>

        {/* Big words */}
        {['Schedule.', 'Target.', 'Convert.'].map((word, i) => (
          <div key={i} className="overflow-hidden">
            <motion.div
              className="font-black uppercase leading-[0.9]"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '8.5vw',
                color: i === 1 ? '#FFD500' : 'white',
              }}
              animate={{ y: phase >= 2 + i ? '0%' : '110%' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
            >
              {word}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <motion.div
        className="absolute left-[42%] top-[15%] bottom-[15%] w-[1px]"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(0,91,187,0.5), rgba(255,213,0,0.5), transparent)' }}
        animate={{ scaleY: phase >= 2 ? 1 : 0, opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style2={{ transformOrigin: 'top' }}
      />

      {/* Right: campaign cards */}
      <div className="w-[58%] pl-[4vw] pr-[6vw] flex flex-col gap-[2vh] justify-center">
        {campaigns.map((c, i) => (
          <motion.div
            key={c.label}
            className="rounded-2xl border relative overflow-hidden"
            style={{
              borderColor: `${c.color}33`,
              background: 'rgba(5,11,20,0.85)',
              backdropFilter: 'blur(12px)',
              padding: '2vh 2vw',
            }}
            animate={{
              x: phase >= 3 + i ? 0 : 80,
              opacity: phase >= 3 + i ? 1 : 0,
            }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          >
            {/* Left accent bar */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ background: c.color }}
              animate={{ scaleY: phase >= 3 + i ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            />

            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold text-[1.3vw]">{c.label}</span>
              <span
                className="text-[0.9vw] font-bold tracking-widest px-2 py-0.5 rounded"
                style={{
                  color: c.color,
                  background: `${c.color}22`,
                }}
              >
                {c.status}
              </span>
            </div>

            {/* Progress bar */}
            <div className="rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: c.color }}
                initial={{ width: '0%' }}
                animate={{ width: phase >= 4 ? `${c.pct}%` : '0%' }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.1 }}
              />
            </div>
            <div className="mt-1 text-right text-[0.85vw] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {c.pct}%
            </div>
          </motion.div>
        ))}
      </div>

      {/* Blue horizontal line top */}
      <motion.div
        className="absolute top-[8%] left-[7vw] h-[2px] bg-[#005BBB] opacity-60"
        animate={{ width: phase >= 1 ? '20%' : '0%' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}
