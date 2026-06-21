import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";
import { Scene6 } from "./scenes/Scene6";

const DURATIONS = {
  intro:     6000,
  title:     7000,
  campaigns: 9000,
  broadcast: 8000,
  analytics: 10000,
  outro:     10000,
};

const KEYS = Object.keys(DURATIONS) as (keyof typeof DURATIONS)[];

export function VideoPlayer() {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;

    function advance() {
      idx = (idx + 1) % KEYS.length;
      setScene(idx);
      timer = setTimeout(advance, DURATIONS[KEYS[idx]]);
    }

    timer = setTimeout(advance, DURATIONS[KEYS[0]]);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#050B14",
      overflow: "hidden",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;900&display=swap');
      `}</style>

      {/* Persistent background gradient */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,40,100,0.35) 0%, transparent 70%)" }} />

      {/* Noise texture */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* Persistent accent lines that shift per scene */}
      <motion.div
        style={{ position: "absolute", top: "10%", left: 0, height: 2, background: "#005BBB", opacity: 0.5 }}
        animate={{ width: ["0%","30%","10%","60%","20%","100%"][scene] || "0%" }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        style={{ position: "absolute", bottom: "10%", right: 0, height: 2, background: "#FFD500", opacity: 0.5 }}
        animate={{ width: ["0%","40%","20%","80%","40%","100%"][scene] || "0%" }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Scenes */}
      <AnimatePresence mode="popLayout">
        {scene === 0 && <Scene1 key="intro" />}
        {scene === 1 && <Scene2 key="title" />}
        {scene === 2 && <Scene3 key="campaigns" />}
        {scene === 3 && <Scene4 key="broadcast" />}
        {scene === 4 && <Scene5 key="analytics" />}
        {scene === 5 && <Scene6 key="outro" />}
      </AnimatePresence>

      {/* Scene progress dots */}
      <div style={{
        position: "absolute", bottom: "2.5vh", left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: "0.5rem", zIndex: 50,
      }}>
        {KEYS.map((_, i) => (
          <motion.div key={i}
            style={{ height: 3, borderRadius: 2 }}
            animate={{ width: i === scene ? "2rem" : "0.4rem", background: i === scene ? "#FFD500" : "rgba(255,255,255,0.25)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
    </div>
  );
}
