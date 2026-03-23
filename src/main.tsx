import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-fullscreen when launched from home screen (PWA)
function requestFullscreen() {
  const el = document.documentElement as any;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (req) {
    req.call(el).catch(() => {});
  }
}

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as any).standalone === true;

if (isStandalone) {
  // Try immediately
  requestFullscreen();
  // Also on first user interaction (required by most browsers)
  const handler = () => {
    requestFullscreen();
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('click', handler);
  };
  document.addEventListener('touchstart', handler, { once: true });
  document.addEventListener('click', handler, { once: true });
}

createRoot(document.getElementById("root")!).render(<App />);
