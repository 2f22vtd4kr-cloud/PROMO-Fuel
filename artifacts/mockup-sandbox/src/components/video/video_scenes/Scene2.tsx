import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center px-[10vw]"
      initial={{ opacity: 0, y: '10vh' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-1/2 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="inline-block px-6 py-2 border border-[#2de897]/30 rounded-full bg-[#2de897]/10 text-[#2de897] font-medium tracking-widest text-[1vw] uppercase mb-8"
        >
          Решение
        </motion.div>

        <motion.h2 
          className="text-[5vw] font-black text-white leading-tight"
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <span className="text-[#2de897]">PROMO-Fuel</span><br />
          в Telegram
        </motion.h2>
        
        <motion.p 
          className="text-[2vw] text-white/60 mt-8 max-w-xl leading-relaxed"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          Прямой доступ к водителям через Telegram Mini App.
        </motion.p>
      </div>

      <div className="w-1/2 relative h-full flex items-center justify-center">
        {/* Mockup visual */}
        <motion.div
          className="w-[20vw] h-[40vw] bg-[#050B14]/80 backdrop-blur-xl border-4 border-[#2de897]/40 rounded-[3vw] relative shadow-[0_0_80px_rgba(45,232,151,0.2)]"
          initial={{ opacity: 0, y: 100, rotateY: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, rotateY: -10 } : { opacity: 0, y: 100, rotateY: 30 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
        >
          <div className="absolute top-[2vw] left-1/2 -translate-x-1/2 w-[30%] h-1 bg-white/20 rounded-full" />
          <div className="p-6 h-full flex flex-col pt-12">
            <div className="flex justify-between items-center mb-8">
              <div className="w-10 h-10 rounded-full bg-[#2de897]/20" />
              <div className="w-24 h-4 bg-white/10 rounded" />
            </div>
            <div className="w-full h-32 rounded-xl bg-gradient-to-tr from-[#2de897]/20 to-[#6ba8e5]/20 mb-6" />
            <div className="w-3/4 h-6 bg-white/20 rounded mb-4" />
            <div className="w-1/2 h-6 bg-white/10 rounded mb-8" />
            <div className="mt-auto w-full h-12 bg-[#2de897] rounded-xl flex items-center justify-center text-black font-bold">
              ⛽ Активировать Промо
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
