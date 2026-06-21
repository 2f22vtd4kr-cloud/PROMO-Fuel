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
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#050B14]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.5, rotateY: 90 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="text-[8vw] mb-4"
      >
        ⛽
      </motion.div>

      <motion.h1 
        className="text-[7vw] font-black text-white tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        PROMO-Fuel
      </motion.h1>

      <motion.div 
        className="mt-6 px-8 py-3 rounded-full border border-[#2de897]/30 bg-[#2de897]/10 text-[#2de897] text-[1.5vw] tracking-widest uppercase font-bold"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        Двигатель роста для вашей АЗС
      </motion.div>
    </motion.div>
  );
}
