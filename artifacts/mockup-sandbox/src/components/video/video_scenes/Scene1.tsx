import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
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
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: '-10vh', filter: 'blur(10px)' }}
      transition={{ duration: 1 }}
    >
      <div className="relative z-10 w-full max-w-6xl px-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="inline-block px-6 py-2 border border-[#6ba8e5]/30 rounded-full bg-[#6ba8e5]/10 text-[#6ba8e5] font-medium tracking-widest text-[1.2vw] uppercase mb-8"
        >
          Проблема
        </motion.div>

        <motion.h1 
          className="text-[6vw] font-black text-white leading-[1.1] tracking-tight"
          initial={{ opacity: 0, y: 40, rotateX: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 40, rotateX: 20 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          АЗС теряют клиентов
        </motion.h1>

        <motion.p
          className="text-[2.5vw] text-white/60 mt-8 font-light"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 3 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 1 }}
        >
          Без цифровой программы лояльности <span className="text-white">нет возвратов</span>.
        </motion.p>
      </div>
      
      {/* Background industrial element */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] border border-white/5 rounded-full pointer-events-none"
        animate={{ scale: [1, 1.2, 1], rotate: 180 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}
