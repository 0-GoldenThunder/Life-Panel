import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $isDbReady, $isSyncing, $syncError, $userSession, $userId } from '../stores/lifeStore';
import { initDatabase } from '../db';
import { supabase } from '../lib/supabase';
import { Wifi, AlertTriangle } from 'lucide-react';
import { Icon } from './ui/Icon';

export const BootSequence: React.FC = () => {
  const isSyncing = useStore($isSyncing);
  const syncError = useStore($syncError);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const boot = async () => {
      // 1. Fetch current session first
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          $userSession.set(session);
          $userId.set(session?.user?.id || 'default_user');
        }
      } catch (err) {
        console.warn('[BootSequence] Failed to retrieve session from Supabase:', err);
      }

      // 2. Set up live auth state listener
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (mounted) {
            $userSession.set(newSession);
            $userId.set(newSession?.user?.id || 'default_user');
          }
        });
        authSubscription = subscription;
      } catch (err) {
        console.warn('[BootSequence] Failed to bind auth state change listener:', err);
      }

      // 3. Initialize dynamic local database
      try {
        await initDatabase();
      } catch (err) {
        console.error("[BootSequence] Failed to initialize database:", err);
      }
    };

    boot();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
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

