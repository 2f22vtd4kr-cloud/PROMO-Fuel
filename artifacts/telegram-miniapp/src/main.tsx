import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#0b0f1a");
  tg.setBackgroundColor("#0b0f1a");
}

const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root {
    margin: 0; padding: 0;
    height: 100%; width: 100%;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif;
  }
  body { background: #0b0f1a; color: #f0f4ff; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  input, textarea, button, select { font-family: inherit; -webkit-tap-highlight-color: transparent; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { transform: translateY(110%); opacity:0; } to { transform: translateY(0); opacity:1; } }
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes glowPulse {
    0%,100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.08); }
  }
  @keyframes toastIn {
    from { opacity:0; transform: translateX(-50%) translateY(-12px) scale(0.92); }
    to   { opacity:1; transform: translateX(-50%) translateY(0) scale(1); }
  }

  .fade-up { animation: fadeUp 0.38s cubic-bezier(0.16,1,0.3,1) both; }
  .slide-up { animation: slideUp 0.42s cubic-bezier(0.16,1,0.3,1) both; }
  .tap { transition: transform 0.1s ease, opacity 0.1s ease; -webkit-tap-highlight-color: transparent; }
  .tap:active { transform: scale(0.96); opacity: 0.8; }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
