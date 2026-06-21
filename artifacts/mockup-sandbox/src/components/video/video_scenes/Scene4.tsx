import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-[80vw] flex items-center justify-between">
        <motion.div 
          className="flex-1"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div className="text-[1.5vw] text-[#6ba8e5] uppercase tracking-widest font-bold mb-4">Рынок</div>
          <div className="text-[7vw] font-black text-white leading-none">25,000</div>
          <div className="text-[2.5vw] text-white/60">АЗС в России</div>
        </motion.div>

        <motion.div 
          className="flex-1 border-l border-white/10 pl-[5vw]"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div className="text-[1.5vw] text-[#2de897] uppercase tracking-widest font-bold mb-4">Аудитория</div>
          <div className="text-[7vw] font-black text-white leading-none">900M</div>
          <div className="text-[2.5vw] text-white/60">Пользователей Telegram</div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-[10vh] text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        <div className="text-[2vw] text-white tracking-wide border border-white/20 rounded-full px-8 py-3 bg-white/5 backdrop-blur">
          Огромный потенциал роста
        </div>
      </motion.div>
    </motion.div>
  );
}
