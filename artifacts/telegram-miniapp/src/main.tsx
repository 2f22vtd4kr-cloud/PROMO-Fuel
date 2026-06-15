import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const tg = (window as any).Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root {
    margin: 0; padding: 0; height: 100%; width: 100%;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif;
  }
  body { background: #080c15; color: #eef2ff; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  input, textarea, button, select { font-family: inherit; -webkit-tap-highlight-color: transparent; }
  input::placeholder, textarea::placeholder { color: rgba(160,185,220,0.4); }

  @keyframes spin      { to { transform: rotate(360deg); } }
  @keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scaleIn   { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
  @keyframes slideUp   { from { transform:translateY(108%); opacity:0; } to { transform:translateY(0); opacity:1; } }
  @keyframes floatOrb  { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(24px,-18px) scale(1.06); } 66% { transform:translate(-16px,22px) scale(0.95); } }
  @keyframes floatOrb2 { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(-20px,16px) scale(1.04); } 66% { transform:translate(18px,-20px) scale(0.97); } }
  @keyframes toastIn   { from { opacity:0; transform:translateX(-50%) translateY(-16px) scale(0.9); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
  @keyframes pulse     { 0%,100%{opacity:1;} 50%{opacity:0.45;} }
  @keyframes shimmer   { 0%{background-position:-300px 0} 100%{background-position:300px 0} }
  @keyframes blink     { 0%,49%{opacity:1} 50%,100%{opacity:0} }

  .fade-up  { animation: fadeUp  0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .scale-in { animation: scaleIn 0.38s cubic-bezier(0.16,1,0.3,1) both; }
  .slide-up { animation: slideUp 0.44s cubic-bezier(0.16,1,0.3,1) both; }

  .tap { transition: transform 0.11s ease, opacity 0.11s ease; cursor: pointer; }
  .tap:active { transform: scale(0.945); opacity: 0.78; }

  .glass-card {
    background: rgba(255,255,255,0.055);
    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 22px;
    position: relative; overflow: hidden;
  }
  .glass-card::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%);
    border-radius: inherit;
    z-index: 0;
  }
  .glass-card > * { position: relative; z-index: 1; }

  .stagger-item:nth-child(1)  { animation-delay: 0ms; }
  .stagger-item:nth-child(2)  { animation-delay: 55ms; }
  .stagger-item:nth-child(3)  { animation-delay: 110ms; }
  .stagger-item:nth-child(4)  { animation-delay: 165ms; }
  .stagger-item:nth-child(5)  { animation-delay: 220ms; }
  .stagger-item:nth-child(6)  { animation-delay: 275ms; }
  .stagger-item:nth-child(7)  { animation-delay: 330ms; }
  .stagger-item:nth-child(8)  { animation-delay: 385ms; }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
