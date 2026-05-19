import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $isDbReady, $isSyncing, $syncError } from '../stores/lifeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { initDatabase } from '../db';
import { Wifi, AlertTriangle } from 'lucide-react';
import { Icon } from './ui/Icon';

export const BootSequence: React.FC = () => {
  const isSyncing = useStore($isSyncing);
  const syncError = useStore($syncError);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        await initDatabase();
      } catch (err) {
        console.error("Failed to initialize database:", err);
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="fixed top-6 right-6 hidden md:flex items-center gap-2 z-40 bg-[#0A0A0A]/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#222]">
      {syncError === 'sync_stalled' ? (
        <>
          <Icon icon={AlertTriangle} className="w-4 h-4 text-muted-amber" />
          <span className="text-xs font-medium text-muted-amber">Sync Stalled</span>
        </>
      ) : isSyncing ? (
        <>
          <Icon icon={Wifi} className="w-4 h-4 text-luxury-gold" />
          <span className="text-xs font-medium text-luxury-gold">Syncing</span>
        </>
      ) : (
        <>
          <Icon icon={Wifi} className="w-4 h-4 text-platinum/30" />
          <span className="text-xs font-medium text-platinum/30">Offline Ready</span>
        </>
      )}
    </div>
  );
};
