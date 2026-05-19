import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Briefcase, 
  ArrowRightLeft, 
  TrendingUp, 
  Calendar, 
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  CreditCard
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { $isSyncing, $syncError } from '../stores/lifeStore';
import { Icon } from './ui/Icon';
import { cn } from '../lib/utils';

interface SidebarItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

interface SidebarGroup {
  name: string;
  items: SidebarItem[];
}

const navigation: SidebarGroup[] = [
  {
    name: 'FINANCE',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Personal', href: '/personal', icon: Wallet },
      { name: 'Business', href: '/business', icon: Briefcase },
      { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
      { name: 'Inflows', href: '/inflows', icon: Download },
      { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
      { name: 'Growth', href: '/growth', icon: TrendingUp },
    ],
  },
  {
    name: 'PLANNING',
    items: [
      { name: 'Events & Goals', href: '/events', icon: Calendar },
    ],
  },
  {
    name: 'SYSTEM',
    items: [
      { name: 'AI Advisor', href: '/ai', icon: Sparkles, badge: 'BETA' },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export const AppSidebar: React.FC<{ currentPath: string }> = ({ currentPath }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isSyncing = useStore($isSyncing);
  const syncError = useStore($syncError);

  let syncIndicatorClass = "bg-transparent";
  if (syncError === 'sync_stalled') {
    syncIndicatorClass = "bg-muted-amber glow-warning";
  } else if (isSyncing) {
    syncIndicatorClass = "bg-luxury-gold glow-gold";
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 h-screen z-50 transition-all duration-300 border-r border-[#222] bg-obsidian",
        collapsed ? "w-[80px]" : "w-[240px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#222]">
        {!collapsed && (
          <span className="font-serif text-lg font-semibold tracking-wide text-platinum">
            Life Panel
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 text-platinum/50 hover:text-platinum rounded-md hover:bg-[#1A1A1A] transition-colors focus:outline-none",
            collapsed && "mx-auto"
          )}
        >
          <Icon icon={collapsed ? ChevronRight : ChevronLeft} className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8 scrollbar-hide">
        {navigation.map((group) => (
          <div key={group.name} className="px-3">
            {!collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold tracking-widest text-platinum/40">
                {group.name}
              </h3>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      onClick={(e) => {
                        if (isActive) e.preventDefault();
                      }}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                        isActive
                          ? "bg-[#1A1A1A] text-platinum"
                          : "text-platinum/60 hover:bg-[#111] hover:text-platinum"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-luxury-gold rounded-r-full glow-gold" />
                      )}
                      <Icon
                        icon={item.icon}
                        className={cn(
                          "w-5 h-5 shrink-0 transition-colors",
                          isActive ? "text-luxury-gold" : "group-hover:text-platinum"
                        )}
                      />
                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between min-w-0">
                          <span className="text-sm font-medium truncate">
                            {item.name}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-luxury-gold/10 text-luxury-gold font-semibold border border-luxury-gold/20">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer Sync Status */}
      <div className="p-4 border-t border-[#222]">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}
          title={isSyncing ? 'Syncing...' : syncError ? 'Sync Stalled' : 'Synced'}
        >
          <div className="relative flex items-center justify-center">
            <Icon icon={RefreshCw} className={cn("w-4 h-4 text-platinum/40", isSyncing && "animate-spin")} />
            <span className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full", syncIndicatorClass)} />
          </div>
          {!collapsed && (
            <span className="text-xs font-medium text-platinum/40">
              {isSyncing ? 'Syncing...' : syncError ? 'Sync Stalled' : 'System Synced'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
