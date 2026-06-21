import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-24 h-24 mb-10 rounded-3xl bg-gradient-to-tr from-[#00ff88] to-[#0088ff] flex items-center justify-center shadow-[0_0_80px_rgba(0,255,136,0.4)]"
      >
        <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </motion.div>

      <motion.h1 
        className="text-6xl font-black text-white tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        PROMO-Fuel
      </motion.h1>

      <motion.div 
        className="mt-8 px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white/70 text-sm tracking-widest uppercase"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        The Engine for Telegram Growth
      </motion.div>
    </motion.div>
  );
}
