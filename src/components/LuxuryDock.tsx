import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Calendar, TrendingUp, Settings } from 'lucide-react';
import { Icon } from './ui/Icon';
import { cn } from '../lib/utils';
import { useStore } from '@nanostores/react';
import { $syncError, $isSyncing } from '../stores/lifeStore';

interface LuxuryDockProps {
  currentPath?: string;
}

export const LuxuryDock: React.FC<LuxuryDockProps> = ({ currentPath }) => {
  const syncError = useStore($syncError);
  const isSyncing = useStore($isSyncing);

  // Sync indicator state
  let syncIndicatorClass = "bg-transparent";
  if (syncError === 'sync_stalled') {
    syncIndicatorClass = "bg-muted-amber glow-warning";
  } else if (isSyncing) {
    syncIndicatorClass = "bg-luxury-gold glow-gold";
  }

  const navItems = [
    { name: 'CORE', href: '/dashboard', icon: LayoutDashboard },
    { name: 'TXS', href: '/transactions', icon: ArrowRightLeft },
    { name: 'EVENTS', href: '/events', icon: Calendar },
    { name: 'GROWTH', href: '/growth', icon: TrendingUp },
  ];

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-[#222]",
        // Safe area inset applied
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(item => {
          const isActive = currentPath === item.href;
          return (
            <a 
              key={item.name}
              href={item.href}
              onClick={(e) => {
                if (isActive) e.preventDefault();
              }}
              className={cn(
                "flex flex-col items-center gap-1 p-2 focus:outline-none rounded-lg focus-visible:ring-1 focus-visible:ring-luxury-gold transition-colors",
                isActive ? "text-luxury-gold" : "text-platinum/50 hover:text-platinum"
              )}
            >
              <Icon icon={item.icon} className="w-6 h-6" />
              <span className="text-[10px] font-medium tracking-wider">{item.name}</span>
            </a>
          );
        })}
        
        {/* Settings + Sync Indicator */}
        <a 
          href="/settings"
          onClick={(e) => {
            if (currentPath === '/settings') e.preventDefault();
          }}
          className={cn(
            "relative flex flex-col items-center gap-1 p-2 focus:outline-none rounded-lg focus-visible:ring-1 focus-visible:ring-luxury-gold transition-colors",
            currentPath === '/settings' ? "text-luxury-gold" : "text-platinum/50 hover:text-platinum"
          )}
        >
          <Icon icon={Settings} className="w-6 h-6" />
          <span className="text-[10px] font-medium tracking-wider">SYS</span>
          
          {/* Sync status dot */}
          <span className={cn("absolute top-2 right-3 w-1.5 h-1.5 rounded-full", syncIndicatorClass)} />
        </a>
      </div>
    </nav>
  );
};
