import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// App version — bump this to force PWA cache refresh
export const APP_VERSION = '2.13.55';

// Force PWA service worker update check on load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.update().catch(() => {});
      // Listen for waiting worker and activate immediately
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              // Reload to get latest version
              window.location.reload();
            }
          });
        }
      });
    });
  });
}

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
  requestFullscreen();
  const handler = () => {
    requestFullscreen();
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('click', handler);
  };
  document.addEventListener('touchstart', handler, { once: true });
  document.addEventListener('click', handler, { once: true });
}

createRoot(document.getElementById("root")!).render(<App />);
