import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, WifiOff, Eye, EyeOff, Settings, ChevronLeft } from 'lucide-react';
import { Icon } from './ui/Icon';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

// ── Guard: detect unconfigured placeholder credentials ──────────
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

const isUnconfigured =
  !SUPABASE_URL ||
  !SUPABASE_KEY ||
  SUPABASE_URL.includes('placeholder') ||
  SUPABASE_KEY.includes('placeholder');

// ── Animation variants ───────────────────────────────────────────
const passwordVariants: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    // clip so content doesn't bleed during collapse
  },
  visible: {
    opacity: 1,
    height: 'auto',
    marginTop: 24, // matches space-y-6 (1.5rem)
    transition: {
      height: { duration: 0.38, ease: [0.32, 0.72, 0, 1] },
      marginTop: { duration: 0.38, ease: [0.32, 0.72, 0, 1] },
      opacity: { duration: 0.25, delay: 0.15, ease: 'easeOut' },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    transition: {
      opacity: { duration: 0.12, ease: 'easeIn' },
      height: { duration: 0.3, ease: [0.32, 0.72, 0, 1], delay: 0.05 },
      marginTop: { duration: 0.3, ease: [0.32, 0.72, 0, 1], delay: 0.05 },
    },
  },
};

const errorVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } },
};

export const LoginIsland: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setStep('password');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Guard: unconfigured Supabase ─────────────────────────────
    if (isUnconfigured) {
      setError(
        'Supabase is not configured. Open .env and replace the placeholder values with your project URL and anon key.'
      );
      return;
    }

    if (isOffline) {
      setError('Initial login requires an active internet connection.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: authError, data } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsLoading(false);

    if (authError) {
      setError(authError.message);
    } else if (mode === 'signup' && data?.user?.identities?.length === 0) {
      setError('An account with this email already exists.');
    } else if (mode === 'signup' && data?.session === null) {
      setError('Registration successful! Please check your email to verify your account.');
    } else {
      window.location.href = '/dashboard';
    }
  };

  // Determine the error/banner to show
  const configError = isUnconfigured
    ? 'Supabase not configured — replace the placeholder values in your .env file to enable auth.'
    : null;
  const offlineError = isOffline
    ? 'You are offline. The Secure Gateway requires an internet connection.'
    : null;
  const displayError = error || offlineError || configError;

  const isConfigWarning = !!configError && !error;
  const isOfflineWarning = !!offlineError && !error && !configError;
  const isErrorState = !isConfigWarning && !isOfflineWarning && !!displayError;

  const bannerClass = cn(
    'mb-6 p-3 rounded-lg flex items-start gap-3 border text-sm',
    isConfigWarning && 'border-amber-500/40 bg-amber-500/5 text-amber-300',
    isOfflineWarning && 'border-warning glow-warning text-muted-amber',
    isErrorState && 'border-error glow-error text-soft-crimson'
  );

  const bannerIcon = isConfigWarning ? Settings : isOfflineWarning ? WifiOff : AlertCircle;

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl border border-[#222] bg-[#0A0A0A]/50 backdrop-blur-xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-serif text-luxury-gold tracking-wide">
          {mode === 'login' ? 'Secure Gateway' : 'New Commander'}
        </h2>
        <p className="text-platinum/60 text-sm mt-2">
          {mode === 'login'
            ? 'Enter your credentials to access the Life Manager.'
            : 'Initialize your personal command center.'}
        </p>
      </div>

      {/* Error / Status Banner */}
      <AnimatePresence mode="wait">
        {displayError && (
          <motion.div
            key={displayError}
            variants={errorVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={bannerClass}
          >
            <Icon icon={bannerIcon} className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={step === 'email' ? handleEmailSubmit : handleLoginSubmit}
        className="space-y-0"
      >
        {/* Email field */}
        <div className="space-y-2">
          <label className="text-sm text-platinum/80 flex items-center gap-2">
            <Icon icon={Mail} className="w-4 h-4" /> Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={step === 'password'}
            className={cn(
              'w-full bg-transparent border-b border-[#333] py-2 px-1 outline-none text-platinum transition-colors placeholder:text-[#444]',
              'focus:border-luxury-gold focus:glow-gold',
              step === 'password' && 'text-platinum/40 border-transparent'
            )}
            placeholder="ceo@example.com"
          />
        </div>

        {/* Password field — smooth height + opacity expansion */}
        <AnimatePresence initial={false}>
          {step === 'password' && (
            <motion.div
              key="password-block"
              variants={passwordVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ overflow: 'hidden' }}
              onAnimationComplete={() => {
                // Only focus when entering, not exiting
                if (step === 'password') passwordRef.current?.focus();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm text-platinum/80 flex items-center gap-2">
                  <Icon icon={Lock} className="w-4 h-4" /> Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-[#333] py-2 px-1 outline-none text-platinum transition-colors placeholder:text-[#444] focus:border-luxury-gold focus:glow-gold pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-platinum/40 hover:text-platinum/80 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon icon={showPassword ? EyeOff : Eye} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button row — splits into back + submit on password step */}
        <div style={{ marginTop: 32 }}>
          <AnimatePresence initial={false} mode="wait">
            {step === 'email' ? (
              /* ── Email step: full-width Continue ── */
              <motion.button
                key="btn-email"
                layout
                type="submit"
                disabled={isLoading || isOffline}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-platinum text-obsidian font-medium transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue <Icon icon={ArrowRight} className="w-4 h-4" />
              </motion.button>
            ) : (
              /* ── Password step: split — back | submit ── */
              <motion.div
                key="btn-password"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex rounded-lg overflow-hidden"
              >
                {/* Back half */}
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setPassword('');
                    setError(null);
                  }}
                  className="flex items-center justify-center w-1/4 py-3 px-4 bg-platinum text-obsidian font-medium transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold border-r border-obsidian/20"
                  aria-label="Back to email"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Submit half */}
                <button
                  type="submit"
                  disabled={isLoading || isOffline}
                  className="flex items-center justify-center gap-2 w-3/4 py-3 px-4 bg-platinum text-obsidian font-medium transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="skeleton w-16 h-5 rounded-md" />
                  ) : (
                    mode === 'login' ? 'Login' : 'Create Account'
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mode toggle — always centered, never shifts */}
        <div className="mt-6 text-center text-sm text-platinum/60">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setStep('email');
              setPassword('');
              setError(null);
            }}
            className="text-luxury-gold hover:text-luxury-gold/80 hover:underline focus:outline-none transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </form>
    </div>
  );
};
