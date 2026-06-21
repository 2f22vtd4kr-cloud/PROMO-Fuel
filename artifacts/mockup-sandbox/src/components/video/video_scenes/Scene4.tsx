import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-10vh' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-[80vw] h-[70vh] bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top bar */}
        <div className="h-16 border-b border-white/5 flex items-center px-8">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <motion.div 
            className="mx-auto text-white/40 font-mono text-sm tracking-widest"
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          >
            ANALYTICS_DASHBOARD
          </motion.div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 flex gap-8">
          {/* Main Chart */}
          <motion.div 
            className="flex-[2] bg-white/5 rounded-2xl border border-white/5 p-6 relative overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <h3 className="text-white/60 mb-6 font-medium">Conversion Rate</h3>
            <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end px-6 gap-2">
              {[40, 55, 45, 70, 65, 85, 95].map((h, i) => (
                <motion.div 
                  key={i}
                  className="flex-1 bg-gradient-to-t from-[#9d00ff]/20 to-[#9d00ff] rounded-t-sm"
                  initial={{ height: 0 }}
                  animate={phase >= 3 ? { height: `${h}%` } : { height: 0 }}
                  transition={{ duration: 1, delay: i * 0.1, type: "spring" }}
                />
              ))}
            </div>
          </motion.div>

          {/* Stats Sidebar */}
          <div className="flex-1 flex flex-col gap-6">
            {[
              { label: 'Active Senders', val: '24', color: 'text-[#00ff88]' },
              { label: 'Messages Sent', val: '142K', color: 'text-white' },
              { label: 'Redemption Rate', val: '12.4%', color: 'text-[#ff5500]' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                className="flex-1 bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col justify-center"
                initial={{ opacity: 0, x: 20 }}
                animate={phase >= 3 + i * 0.5 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                transition={{ type: "spring" }}
              >
                <div className="text-white/50 text-sm uppercase tracking-wider mb-2">{stat.label}</div>
                <div className={`text-5xl font-bold ${stat.color}`}>{stat.val}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
