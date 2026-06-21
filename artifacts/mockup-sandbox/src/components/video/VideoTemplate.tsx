import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

// Total: 45 seconds
const SCENE_DURATIONS = {
  open: 7000,
  solution: 7000,
  features: 9000,
  market: 8000,
  business: 6000,
  close: 8000
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050B14] font-sans selection:bg-white/20">
      <style>{`
        :root {
          --color-brand-green: #2de897;
          --color-brand-blue: #6ba8e5;
          --color-bg-dark: #050B14;
        }
      `}</style>

      {/* Persistent Background */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: \`url('\${import.meta.env.BASE_URL}images/promo-bg-1.png')\` }}
          animate={{ scale: [1.1, 1, 1.05, 1.1] }}
          transition={{ duration: 45, ease: "linear" }}
        />
        <motion.div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: \`url('\${import.meta.env.BASE_URL}images/promo-bg-2.png')\` }}
          animate={{ opacity: currentScene === 2 || currentScene === 3 ? 0.6 : 0, scale: [1, 1.1] }}
          transition={{ duration: 45, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-transparent to-[#050B14]/80" />
      </div>

      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

      {/* Scene Content */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="scene-open" />}
        {currentScene === 1 && <Scene2 key="scene-solution" />}
        {currentScene === 2 && <Scene3 key="scene-features" />}
        {currentScene === 3 && <Scene4 key="scene-market" />}
        {currentScene === 4 && <Scene5 key="scene-business" />}
        {currentScene === 5 && <Scene6 key="scene-close" />}
      </AnimatePresence>
    </div>
  );
}
