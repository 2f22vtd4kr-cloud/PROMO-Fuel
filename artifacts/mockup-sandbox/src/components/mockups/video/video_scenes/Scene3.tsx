import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: '10vh' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div 
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        <h2 className="text-5xl font-bold text-white mb-4">Precision Campaigns</h2>
        <p className="text-xl text-[#00ff88]">Multi-worker Task Queue</p>
      </motion.div>

      <div className="flex gap-8 relative z-10">
        {['Segment', 'Spintax', 'Broadcast'].map((text, i) => (
          <motion.div
            key={text}
            className="w-64 h-80 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden"
            initial={{ opacity: 0, y: 50, rotateY: 30 }}
            animate={phase >= 2 + i ? { opacity: 1, y: 0, rotateY: 0 } : { opacity: 0, y: 50, rotateY: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Glass highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            
            <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center shadow-lg
              ${i === 0 ? 'bg-purple-500/20 text-purple-400' : 
                i === 1 ? 'bg-blue-500/20 text-blue-400' : 
                'bg-[#00ff88]/20 text-[#00ff88]'}`}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {i === 0 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
                {i === 1 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}
                {i === 2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{text}</h3>
            <div className="w-full h-2 bg-white/10 rounded-full mt-auto overflow-hidden">
              <motion.div 
                className={`h-full ${i === 0 ? 'bg-purple-500' : i === 1 ? 'bg-blue-500' : 'bg-[#00ff88]'}`}
                initial={{ width: 0 }}
                animate={phase >= 3 + i ? { width: '100%' } : { width: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
