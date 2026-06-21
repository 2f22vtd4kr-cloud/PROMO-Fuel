import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    >
      {/* Expanding rings */}
      {phase >= 1 && [1, 2, 3].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-white/10"
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: `${i * 40}vw`, height: `${i * 40}vw`, opacity: 0 }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.5, ease: "linear" }}
        />
      ))}

      <div className="relative z-10 text-center">
        <motion.h2
          className="text-8xl font-black text-white tracking-tighter"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          SCALE
        </motion.h2>
        
        <motion.div
          className="text-3xl text-white/50 mt-6 font-light"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          Thousands of accounts. Millions of messages.
        </motion.div>
      </div>
      
      {/* Floating sender avatars */}
      {phase >= 4 && Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
          initial={{ 
            opacity: 0, 
            x: 0, 
            y: 0 
          }}
          animate={{ 
            opacity: [0, 1, 0],
            x: (Math.random() - 0.5) * window.innerWidth * 0.8,
            y: (Math.random() - 0.5) * window.innerHeight * 0.8,
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
        />
      ))}
    </motion.div>
  );
}
