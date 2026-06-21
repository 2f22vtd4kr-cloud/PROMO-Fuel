import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

// Total: 36 seconds
const SCENE_DURATIONS = {
  open: 4000,
  problem: 5000,
  solution: 8000,
  dashboard: 7000,
  scale: 6000,
  close: 6000
};

const bgColors = [
  'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)', // open
  'radial-gradient(circle at 80% 20%, #2d1b11 0%, #050505 100%)', // problem (orange hint)
  'radial-gradient(circle at 20% 80%, #0d2b14 0%, #050505 100%)', // solution (green hint)
  'radial-gradient(circle at 50% 50%, #1a1025 0%, #020202 100%)', // dashboard (purple hint)
  'radial-gradient(circle at 50% 0%, #141b2d 0%, #000000 100%)', // scale (blue hint)
  'radial-gradient(circle at 50% 50%, #0a0a0a 0%, #000000 100%)', // close
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans selection:bg-white/20">
      <style>{`
        :root {
          --color-brand-green: #00ff88;
          --color-brand-orange: #ff5500;
          --color-brand-purple: #9d00ff;
          --color-glass-border: rgba(255, 255, 255, 0.08);
          --color-glass-bg: rgba(20, 20, 20, 0.4);
        }
      `}</style>

      {/* Persistent Background */}
      <motion.div 
        className="absolute inset-0 transition-colors duration-1000"
        style={{ background: bgColors[currentScene] }}
      />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

      {/* Persistent Animated Orbs */}
      <motion.div
        className="absolute rounded-full blur-[100px] opacity-30 mix-blend-screen"
        animate={{
          x: ['-10vw', '40vw', '80vw', '10vw', '50vw', '50vw'][currentScene],
          y: ['20vh', '80vh', '10vh', '60vh', '20vh', '50vh'][currentScene],
          width: ['40vw', '30vw', '50vw', '25vw', '60vw', '40vw'][currentScene],
          height: ['40vw', '30vw', '50vw', '25vw', '60vw', '40vw'][currentScene],
          backgroundColor: ['#ffffff', '#ff5500', '#00ff88', '#9d00ff', '#00ff88', '#ffffff'][currentScene],
        }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        style={{ transform: 'translate(-50%, -50%)' }}
      />

      {/* Scene Content */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="scene-open" />}
        {currentScene === 1 && <Scene2 key="scene-problem" />}
        {currentScene === 2 && <Scene3 key="scene-solution" />}
        {currentScene === 3 && <Scene4 key="scene-dashboard" />}
        {currentScene === 4 && <Scene5 key="scene-scale" />}
        {currentScene === 5 && <Scene6 key="scene-close" />}
      </AnimatePresence>
    </div>
  );
}
