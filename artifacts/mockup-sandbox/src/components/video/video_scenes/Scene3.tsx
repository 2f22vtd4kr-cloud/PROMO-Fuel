import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { title: "Промо-кампании", color: "bg-[#2de897]" },
    { title: "Аккаунты", color: "bg-[#6ba8e5]" },
    { title: "Аналитика", color: "bg-white" },
    { title: "Рассылки", color: "bg-[#2de897]" },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: '10vh' }}
      transition={{ duration: 1 }}
    >
      <motion.div 
        className="text-center mb-[8vh]"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        <h2 className="text-[4vw] font-bold text-white tracking-tight">Всё под контролем</h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-[2vw] w-[60vw]">
        {features.map((feat, i) => (
          <motion.div
            key={feat.title}
            className="h-[20vh] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-[2vw] flex flex-col justify-center relative overflow-hidden"
            initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40, scale: 0.9 }}
            animate={phase >= 2 + i ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: i % 2 === 0 ? -40 : 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${feat.color}`} />
            <div className="text-[2.2vw] font-medium text-white mb-2">{feat.title}</div>
            <motion.div 
              className="w-1/2 h-[0.5vh] bg-white/10 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={phase >= 2 + i ? { opacity: 1 } : { opacity: 0 }}
            >
              <motion.div 
                className={`h-full ${feat.color}`}
                initial={{ width: 0 }}
                animate={phase >= 3 + i ? { width: '100%' } : { width: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
