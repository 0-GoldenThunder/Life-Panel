import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
// If using virtual:pwa-register/react
// import { useRegisterSW } from 'virtual:pwa-register/react';

export const UpdateToast: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    // In a real PWA setup with vite-plugin-pwa, this is usually driven by the `useRegisterSW` hook.
    // For manual implementation matching the spec:
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // SW took control, time to reload
        window.location.reload();
      });

      // Simple listener for demonstration, typically you'd bind to the vite-plugin-pwa update event.
      // E.g. workbox.addEventListener('waiting', () => setNeedRefresh(true));
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setNeedRefresh(true);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    // Signal the waiting SW to skip waiting and take control immediately
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Fallback reload
        window.location.reload();
      }
    });
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
      <div className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-full",
        "bg-[#0A0A0A]/80 backdrop-blur-xl border border-platinum/20",
        "shadow-[0_0_10px_0_var(--color-luxury-gold)] update-toast" // Glow and luxury-pulse
      )}>
        <span className="text-sm font-medium text-platinum">A refinement is ready.</span>
        <button
          onClick={handleUpdate}
          className="text-sm font-semibold text-luxury-gold hover:text-white transition-colors"
        >
          [Apply Now]
        </button>
      </div>
    </div>
  );
};
