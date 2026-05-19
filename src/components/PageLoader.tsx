import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type LoaderPhase = 'idle' | 'loading' | 'done';

/**
 * Game-style navigation loader — bottom-right, non-intrusive, luxury aesthetic.
 * Listens to Astro View Transition events: astro:before-preparation → astro:page-load
 */
export const PageLoader: React.FC = () => {
  const [phase, setPhase] = useState<LoaderPhase>('idle');
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (doneTimerRef.current) { clearTimeout(doneTimerRef.current); doneTimerRef.current = null; }
  };

  useEffect(() => {
    const onStart = () => {
      clearTimers();
      setProgress(0);
      setPhase('loading');

      // Simulate progress — trickle from 0 → 85%, rest snaps on complete
      let p = 0;
      intervalRef.current = setInterval(() => {
        // Non-linear easing: fast at first, slows down near 85%
        const delta = (85 - p) * 0.04 + 0.5;
        p = Math.min(p + delta, 85);
        setProgress(p);
      }, 60);
    };

    const onComplete = () => {
      clearTimers();
      setProgress(100);
      setPhase('done');
      // Hide after the fill animation completes
      doneTimerRef.current = setTimeout(() => {
        setPhase('idle');
        setProgress(0);
      }, 700);
    };

    document.addEventListener('astro:before-preparation', onStart);
    document.addEventListener('astro:page-load', onComplete);

    return () => {
      clearTimers();
      document.removeEventListener('astro:before-preparation', onStart);
      document.removeEventListener('astro:page-load', onComplete);
    };
  }, []);

  return (
    <AnimatePresence>
      {phase !== 'idle' && (
        <motion.div
          key="page-loader"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          aria-label="Page loading"
        >
          {/* HUD-style container */}
          <div className="bg-[#080808]/80 border border-[#2a2a2a] backdrop-blur-xl rounded-xl px-4 py-3 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            
            {/* Animated gold orb */}
            <div className="relative flex-shrink-0">
              <motion.div
                className="w-2 h-2 rounded-full bg-luxury-gold"
                animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
                style={{ boxShadow: '0 0 6px rgba(197,160,89,0.8), 0 0 14px rgba(197,160,89,0.4)' }}
              />
            </div>

            {/* Progress bar track */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold tracking-[0.18em] text-platinum/40 uppercase leading-none">
                {phase === 'done' ? 'READY' : 'LOADING'}
              </span>
              <div className="w-[120px] h-[2px] bg-[#1f1f1f] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #a07830 0%, #C5A059 60%, #e8cc88 100%)',
                    boxShadow: '0 0 6px rgba(197,160,89,0.7)',
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={{
                    duration: phase === 'done' ? 0.25 : 0.1,
                    ease: phase === 'done' ? [0.4, 0, 0.2, 1] : 'linear',
                  }}
                />
              </div>
            </div>

            {/* Percentage readout */}
            <motion.span
              key={Math.round(progress)}
              className="text-[10px] font-mono text-luxury-gold/60 min-w-[28px] text-right leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(progress)}%
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
