import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#17212b");
  tg.setBackgroundColor("#17212b");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
