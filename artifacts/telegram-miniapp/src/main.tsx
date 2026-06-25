import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initTelegram } from "./lib/twa";
import "./index.css";

initTelegram();

const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root {
    margin: 0; padding: 0; height: 100%; width: 100%;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif;
  }
  body { background: #07090f; color: #eef2ff; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  input, textarea, button, select { font-family: inherit; -webkit-tap-highlight-color: transparent; }
  input::placeholder, textarea::placeholder { color: rgba(160,190,230,0.32); }
  button { cursor: pointer; user-select: none; -webkit-user-select: none; }

  /* ── Keyframes ── */
  @keyframes spin       { to { transform: rotate(360deg); } }
  @keyframes fadeUp     { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scaleIn    { from { opacity:0; transform:scale(0.84); } to { opacity:1; transform:scale(1); } }
  @keyframes slideUp    { from { transform:translateY(112%); opacity:0; } to { transform:translateY(0); opacity:1; } }
  @keyframes floatOrb   { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(30px,-24px) scale(1.08);} 66%{transform:translate(-20px,28px) scale(0.93);} }
  @keyframes floatOrb2  { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(-24px,20px) scale(1.06);} 66%{transform:translate(22px,-24px) scale(0.95);} }
  @keyframes floatOrb3  { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(16px,32px) scale(1.04);} }
  @keyframes toastIn    { from { opacity:0; transform:translateX(-50%) translateY(-20px) scale(0.86); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
  @keyframes pulse      { 0%,100%{opacity:1;} 50%{opacity:0.34;} }
  @keyframes pulseSoft  { 0%,100%{opacity:0.6;} 50%{opacity:1;} }
  @keyframes shimmerX   { 0%{transform:translateX(-180%) skewX(-18deg);} 100%{transform:translateX(400%) skewX(-18deg);} }
  @keyframes blink      { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes navPop     { 0%{transform:scale(0.78) translateY(4px);opacity:0;} 65%{transform:scale(1.10) translateY(-1px);} 100%{transform:scale(1) translateY(0);opacity:1;} }
  @keyframes liquidFloat{ 0%,100%{border-radius:62% 38% 54% 46%/46% 54% 38% 62%;} 33%{border-radius:46% 54% 38% 62%/62% 38% 54% 46%;} 66%{border-radius:54% 46% 62% 38%/38% 62% 46% 54%;} }
  @keyframes orbPulse   { 0%,100%{transform:scale(1);opacity:0.9;} 50%{transform:scale(1.15);opacity:1;} }
  @keyframes countUp    { from{transform:translateY(8px);opacity:0;} to{transform:translateY(0);opacity:1;} }
  @keyframes geo-ping   { 0%{transform:scale(0.6);opacity:0.8;} 100%{transform:scale(2.0);opacity:0;} }

  /* ── Animation helpers ── */
  .fade-up   { animation: fadeUp  0.44s cubic-bezier(0.16,1,0.3,1) both; }
  .scale-in  { animation: scaleIn 0.40s cubic-bezier(0.16,1,0.3,1) both; }
  .slide-up  { animation: slideUp 0.48s cubic-bezier(0.16,1,0.3,1) both; }
  .tab-content { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }

  .stagger-item:nth-child(1)  { animation-delay: 0ms; }
  .stagger-item:nth-child(2)  { animation-delay: 65ms; }
  .stagger-item:nth-child(3)  { animation-delay: 130ms; }
  .stagger-item:nth-child(4)  { animation-delay: 195ms; }
  .stagger-item:nth-child(5)  { animation-delay: 260ms; }
  .stagger-item:nth-child(6)  { animation-delay: 325ms; }
  .stagger-item:nth-child(7)  { animation-delay: 390ms; }
  .stagger-item:nth-child(8)  { animation-delay: 455ms; }

  /* ── Tap feedback ── */
  .tap { transition: transform 0.13s ease, opacity 0.13s ease; }
  .tap:active { transform: scale(0.92); opacity: 0.70; }

  /* ──────────────────────────────────────────
     LIQUID GLASS — 3-layer material system
  ────────────────────────────────────────── */

  /* Layer 1: Outer glass card */
  .lg {
    background: linear-gradient(145deg,
      rgba(255,255,255,0.115) 0%,
      rgba(255,255,255,0.038) 45%,
      rgba(255,255,255,0.085) 100%
    );
    backdrop-filter: blur(44px) saturate(180%) brightness(1.04);
    -webkit-backdrop-filter: blur(44px) saturate(180%) brightness(1.04);
    border: 1px solid rgba(255,255,255,0.175);
    border-radius: 26px;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 2px 0 rgba(255,255,255,0.12) inset,
      0 -1px 0 rgba(0,0,0,0.14) inset,
      0 12px 40px rgba(0,0,0,0.32),
      0 2px 8px rgba(0,0,0,0.18);
  }
  /* Layer 2: Top specular highlight — the "edge" of the glass */
  .lg::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg,
      transparent 2%,
      rgba(255,255,255,0.55) 30%,
      rgba(255,255,255,0.72) 50%,
      rgba(255,255,255,0.55) 70%,
      transparent 98%
    );
    pointer-events: none; z-index: 3;
  }
  /* Layer 3: Prismatic color shift overlay */
  .lg::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg,
      rgba(130,185,255,0.07) 0%,
      rgba(255,135,210,0.045) 30%,
      rgba(100,255,175,0.04) 60%,
      rgba(195,140,255,0.065) 100%
    );
    pointer-events: none; z-index: 1; border-radius: inherit;
  }
  .lg > * { position: relative; z-index: 2; }

  /* Inner top-half shine (for icon wrappers, buttons, etc.) */
  .lg-shine::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 55%;
    background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%);
    pointer-events: none; z-index: 1; border-radius: inherit;
  }

  /* Floating glass pill (for buttons) */
  .lg-pill {
    background: linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.20);
    border-radius: 100px;
    box-shadow: 0 2px 0 rgba(255,255,255,0.14) inset, 0 4px 16px rgba(0,0,0,0.24);
    position: relative; overflow: hidden;
  }
  .lg-pill::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.60) 50%, transparent);
    pointer-events: none;
  }

  /* Legacy compatibility */
  .glass-card {
    background: rgba(255,255,255,0.062);
    backdrop-filter: blur(40px) saturate(165%);
    -webkit-backdrop-filter: blur(40px) saturate(165%);
    border: 1px solid rgba(255,255,255,0.145);
    border-radius: 24px;
    position: relative; overflow: hidden;
    box-shadow: 0 8px 30px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.20);
  }
  .glass-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.44) 50%, transparent);
    pointer-events: none; z-index: 1;
  }
  .glass-card > * { position: relative; z-index: 2; }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
