import React from 'react';
import { useStore } from '@nanostores/react';
import { $personalBalance, $businessBalance, $totalBalance, $activeCurrency, $isSyncing, $isDbReady } from '../../stores/lifeStore';
import { cn } from '../../lib/utils';
import { Icon } from '../ui/Icon';
import { ArrowRightLeft, Globe, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NetBalanceCard: React.FC = () => {
  const personal = useStore($personalBalance);
  const business = useStore($businessBalance);
  const total = useStore($totalBalance);
  const currency = useStore($activeCurrency);
  const isSyncing = useStore($isSyncing);
  const isDbReady = useStore($isDbReady);

  const [mode, setMode] = React.useState<'combined' | 'personal' | 'business'>('combined');

  const getDisplayValue = () => {
    switch (mode) {
      case 'personal': return personal;
      case 'business': return business;
      case 'combined': return total;
    }
  };

  const val = getDisplayValue();

  const handleCurrencySwitch = () => {
    const next = currency === 'MYR' ? 'USD' : currency === 'USD' ? 'IDR' : 'MYR';
    $activeCurrency.set(next);
  };

  return (
    <div className={cn(
      "flex flex-col p-6 cursor-pointer rounded-2xl bg-[#0A0A0A]/50 border backdrop-blur-xl h-full group hover:border-luxury-gold/30 hover:shadow-[0_0_25px_rgba(212,175,55,0.05)] transition-all duration-500 relative",
      isSyncing
        ? "border-luxury-gold/25 shadow-[0_0_20px_rgba(197,160,89,0.08)] animate-[sync-pulse_2s_ease-in-out_infinite]"
        : "border-[#222]"
    )}>
      <div className="absolute top-0 right-0 p-4 flex gap-2 items-center">
        {/* Syncing micro-indicator */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              title="Syncing data…"
              className="flex items-center gap-1 mr-1"
            >
              <Icon
                icon={RefreshCw}
                className="w-3 h-3 text-luxury-gold/60 animate-spin"
                style={{ animationDuration: '1.5s' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={handleCurrencySwitch}
          className="p-2 rounded-full bg-[#1A1A1A] hover:bg-[#222] text-platinum/50 hover:text-luxury-gold transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-luxury-gold"
          title={`Switch Currency (Current: ${currency})`}
        >
          <Icon icon={Globe} className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setMode(m => m === 'combined' ? 'personal' : m === 'personal' ? 'business' : 'combined')}
          className="p-2 rounded-full bg-[#1A1A1A] hover:bg-[#222] text-platinum/50 hover:text-luxury-gold transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-luxury-gold"
          title={`Switch view (Current: ${mode})`}
        >
          <Icon icon={ArrowRightLeft} className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.span 
          key={mode}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.2 }}
          className="text-xs font-semibold tracking-widest text-platinum/40 uppercase group-hover:text-platinum transition-colors mb-4 mt-0 block"
        >
          Net Balance • {mode}
        </motion.span>
      </AnimatePresence>
      
      <div className="mt-auto flex items-baseline gap-3 mb-2">
        <AnimatePresence mode="wait">
          <motion.span 
            key={currency}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="text-2xl font-serif font-medium text-platinum truncate tabular-nums"
          >
            {currency}
          </motion.span>
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          <motion.span 
            key={`${mode}-${val}`}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.3 }}
            className={cn(
              "text-3xl md:text-6xl font-sans font-semibold overflow-visible tracking-tight truncate tabular-nums",
              val < 0 ? "text-soft-crimson glow-error" : "text-luxury-gold glow-gold"
            )}
          >
            {Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};
