import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STATS = [
  { label: 'Reach', value: '127K', sub: 'recipients', color: '#FFD500' },
  { label: 'Open Rate', value: '68%', sub: 'avg across campaigns', color: '#005BBB' },
  { label: 'Conversion', value: '24%', sub: 'promo redeemed', color: '#FFD500' },
];

const BAR_DATA = [55, 72, 43, 89, 65, 91, 78];

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
      {/* Left panel */}
      <div className="w-[45%] pl-[7vw] flex flex-col justify-center">
        <div className="overflow-hidden mb-4">
          <motion.div
            className="text-[1.2vw] font-bold tracking-[0.3em] uppercase text-[#005BBB]"
            animate={{ y: phase >= 1 ? '0%' : '130%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Analytics Dashboard
          </motion.div>
        </div>

        {['Real-Time', 'Stats'].map((word, i) => (
          <div key={i} className="overflow-hidden">
            <motion.div
              className="font-black uppercase leading-[0.88]"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '10vw',
                color: i === 1 ? '#FFD500' : 'white',
              }}
              animate={{ y: phase >= 2 ? '0%' : '110%' }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
            >
              {word}
            </motion.div>
          </div>
        ))}

        {/* Stat pills */}
        <div className="mt-8 flex flex-col gap-3">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="flex items-center gap-3"
              animate={{ x: phase >= 3 ? 0 : -40, opacity: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
            >
              <div className="w-[2px] self-stretch rounded-full" style={{ background: s.color }} />
              <div>
                <div className="font-black text-[2.4vw] leading-none text-white">{s.value}</div>
                <div className="text-[0.85vw] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {s.label} — {s.sub}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: chart area */}
      <div className="w-[55%] pr-[6vw] pl-[2vw] flex flex-col justify-center gap-6">
        {/* Bar chart */}
        <motion.div
          className="rounded-2xl border relative overflow-hidden p-[2.5vh_2vw]"
          style={{ borderColor: 'rgba(0,91,187,0.25)', background: 'rgba(5,11,20,0.8)', backdropFilter: 'blur(16px)' }}
          animate={{ y: phase >= 2 ? 0 : 40, opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-[0.9vw] font-bold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Sends per Day
          </div>
          <div className="flex items-end gap-[1.2vw]" style={{ height: '12vh' }}>
            {BAR_DATA.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <motion.div
                  className="rounded-t-lg"
                  style={{
                    background: i === 5
                      ? 'linear-gradient(180deg, #FFD500 0%, #cc9900 100%)'
                      : 'linear-gradient(180deg, #005BBB 0%, #003f8a 100%)',
                    boxShadow: i === 5 ? '0 -6px 16px rgba(255,213,0,0.4)' : 'none',
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: phase >= 3 ? `${h}%` : 0 }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 + i * 0.07 }}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Donut + live badge */}
        <div className="flex gap-4 items-center">
          <motion.div
            className="relative flex-shrink-0"
            style={{ width: '11vw', height: '11vw' }}
            animate={{ opacity: phase >= 3 ? 1 : 0, rotate: phase >= 3 ? 0 : -90 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <motion.circle
                cx="50" cy="50" r="38" fill="none" stroke="#FFD500" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="239"
                initial={{ strokeDashoffset: 239 }}
                animate={{ strokeDashoffset: phase >= 4 ? 60 : 239 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
              <motion.circle
                cx="50" cy="50" r="38" fill="none" stroke="#005BBB" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="239"
                strokeDashoffset={60}
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 4 ? 0.6 : 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-black text-[2.6vw] text-white leading-none">75%</div>
              <div className="text-[0.75vw] font-bold text-[#FFD500] uppercase tracking-wide">open</div>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col gap-2"
            animate={{ opacity: phase >= 4 ? 1 : 0, x: phase >= 4 ? 0 : 20 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#FFD500] animate-pulse" />
              <span className="text-[0.9vw] font-bold text-white">LIVE</span>
            </div>
            <div className="text-[0.8vw]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              3 campaigns running
            </div>
            <div className="text-[0.8vw]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              4 workers active
            </div>
          </motion.div>
        </div>
      </div>

      {/* Vertical divider */}
      <motion.div
        className="absolute top-[12%] bottom-[12%] w-[1px]"
        style={{
          left: '45%',
          background: 'linear-gradient(180deg, transparent, rgba(255,213,0,0.4), rgba(0,91,187,0.4), transparent)',
        }}
        animate={{ scaleY: phase >= 2 ? 1 : 0, opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style2={{ transformOrigin: 'top' }}
      />
    </motion.div>
  );
}
