import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENE_DURATIONS = {
  intro: 6000,
  title: 7000,
  campaigns: 9000,
  broadcast: 8000,
  analytics: 10000,
  outro: 10000
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050B14] font-sans selection:bg-[#005BBB] selection:text-white">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
          style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/bg-tech-navy.png')` }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Dynamic Image Overlay driven by scene */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center mix-blend-lighten"
          style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/fuel-network.png')` }}
          animate={{ opacity: currentScene === 3 ? 0.6 : 0, scale: currentScene === 3 ? 1.1 : 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute inset-0 bg-cover bg-center mix-blend-lighten"
          style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/abstract-dashboard.png')` }}
          animate={{ opacity: currentScene === 4 ? 0.7 : 0, y: currentScene === 4 ? [20, 0] : 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-transparent to-[#050B14]/80" />
      </div>

      {/* Persistent motifs - Ukrainian flag split lines */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <motion.div 
          className="absolute left-0 top-[10vh] h-[2px] bg-[#005BBB]"
          animate={{ 
            width: ['0%', '30%', '10%', '60%', '20%', '100%'][currentScene] || '0%',
            opacity: [0, 1, 0.5, 1, 0.8, 1][currentScene] || 0
          }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div 
          className="absolute right-0 bottom-[10vh] h-[2px] bg-[#FFD500]"
          animate={{ 
            width: ['0%', '40%', '20%', '80%', '40%', '100%'][currentScene] || '0%',
            opacity: [0, 1, 0.5, 1, 0.8, 1][currentScene] || 0
          }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Scenes */}
      <div className="relative z-20 w-full h-full">
        <AnimatePresence mode="popLayout">
          {currentScene === 0 && <Scene1 key="intro" />}
          {currentScene === 1 && <Scene2 key="title" />}
          {currentScene === 2 && <Scene3 key="campaigns" />}
          {currentScene === 3 && <Scene4 key="broadcast" />}
          {currentScene === 4 && <Scene5 key="analytics" />}
          {currentScene === 5 && <Scene6 key="outro" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
