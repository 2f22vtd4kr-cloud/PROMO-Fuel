import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center px-32"
      initial={{ opacity: 0, x: '10vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-10vw', filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-1/2 relative z-10">
        <motion.h2 
          className="text-6xl font-black text-white leading-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Your Audience<br />
          <span className="text-[#ff5500]">Is Already Here.</span>
        </motion.h2>
        
        <motion.p 
          className="text-xl text-white/50 mt-8 max-w-md leading-relaxed"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          Stop waiting for customers to drive by. Reach them directly on Telegram with targeted promos.
        </motion.p>
      </div>

      <div className="w-1/2 relative h-full flex items-center justify-center">
        {/* Abstract Telegram bubbles */}
        {phase >= 2 && [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.8, y: 50, x: i === 1 ? -40 : i === 2 ? 40 : 0 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: [i * 30 - 40, i * 30 - 50, i * 30 - 40],
              x: i === 1 ? -60 : i === 2 ? 60 : 0
            }}
            transition={{ 
              y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: i },
              default: { duration: 0.8, delay: i * 0.2, type: "spring" }
            }}
            style={{ zIndex: 10 - i }}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 mb-4" />
            <div className="w-32 h-3 bg-white/20 rounded-full mb-2" />
            <div className="w-24 h-3 bg-white/10 rounded-full" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
