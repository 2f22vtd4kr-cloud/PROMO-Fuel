import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 1 }}
    >
      <div className="text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          className="text-[#6ba8e5] text-[1.5vw] font-bold tracking-[0.2em] uppercase mb-6"
        >
          Бизнес-модель
        </motion.div>

        <motion.h2
          className="text-[6vw] font-black text-white leading-none tracking-tight mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          SaaS Подписка
        </motion.h2>

        <motion.p
          className="text-[2vw] text-white/70 font-light"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          Стабильный и предсказуемый доход
        </motion.p>
      </div>

      {/* Abstract background data visualization */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <motion.div 
          className="w-[80vw] h-[40vw] border-b border-l border-[#6ba8e5]/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            <motion.path
              d="M0 50 Q 20 40 40 20 T 60 15 T 80 5 T 100 0"
              fill="none"
              stroke="#2de897"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={phase >= 2 ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </motion.svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
