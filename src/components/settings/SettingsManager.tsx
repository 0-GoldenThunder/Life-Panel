import React from 'react';
import { useStore } from '@nanostores/react';
import { $activeCurrency, $userSession, signOutUser } from '../../stores/lifeStore';
import { Icon } from '../ui/Icon';
import { Globe, User, Palette, Download, Shield, LogOut } from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const activeCurrency = useStore($activeCurrency);
  const userSession = useStore($userSession);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    $activeCurrency.set(e.target.value);
    // Ideally, we'd also save this to a user profile in the DB, 
    // but for now setting the store is enough for the MVP.
  };

  const email = userSession?.user?.email || 'offline@lifepanel.app';
  const displayName = userSession?.user?.user_metadata?.full_name || email.split('@')[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      
      {/* Profile Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-platinum/60 uppercase tracking-widest flex items-center gap-2">
          <Icon icon={User} className="w-4 h-4" />
          Profile
        </h2>
        <div className="bg-[#0A0A0A]/50 border border-[#222] rounded-xl p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-full bg-luxury-gold/20 flex items-center justify-center text-luxury-gold text-2xl font-bold font-sans">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-platinum capitalize">{displayName}</span>
              <span className="text-platinum/50 text-sm">{email}</span>
            </div>
          </div>
          <button 
            onClick={signOutUser}
            className="flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#222] border border-luxury-gold/20 hover:border-luxury-gold/50 text-luxury-gold hover:glow-gold px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm cursor-pointer"
          >
            <Icon icon={LogOut} className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </section>


      {/* Preferences Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-platinum/60 uppercase tracking-widest flex items-center gap-2">
          <Icon icon={Globe} className="w-4 h-4" />
          Preferences
        </h2>
        <div className="bg-[#0A0A0A]/50 border border-[#222] rounded-xl backdrop-blur-xl divide-y divide-[#222]">
          
          <div className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-platinum font-medium">Default Currency</span>
              <span className="text-platinum/50 text-xs">Used as the base currency for total balances and dashboards.</span>
            </div>
            <select 
              value={activeCurrency} 
              onChange={handleCurrencyChange}
              className="bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-2 text-platinum focus:border-luxury-gold outline-none w-32"
            >
              <option value="USD">USD ($)</option>
              <option value="MYR">MYR (RM)</option>
              <option value="IDR">IDR (Rp)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-platinum font-medium">Theme Aesthetic</span>
              <span className="text-platinum/50 text-xs">Choose the visual style of your platform.</span>
            </div>
            <div className="flex items-center gap-2 bg-[#1A1A1A] p-1 rounded-lg border border-[#333]">
              <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#333] text-platinum transition-colors">Obsidian Gold</button>
              <button disabled className="px-3 py-1.5 rounded-md text-xs font-medium text-platinum/30 cursor-not-allowed">Light (Coming Soon)</button>
            </div>
          </div>
          
        </div>
      </section>

      {/* Data & Security Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-platinum/60 uppercase tracking-widest flex items-center gap-2">
          <Icon icon={Shield} className="w-4 h-4" />
          Data & Security
        </h2>
        <div className="bg-[#0A0A0A]/50 border border-[#222] rounded-xl backdrop-blur-xl divide-y divide-[#222]">
          
          <div className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-platinum font-medium">Export Data</span>
              <span className="text-platinum/50 text-xs">Download all your financial and personal data as JSON.</span>
            </div>
            <button className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#222] border border-[#333] text-platinum px-4 py-2 rounded-lg font-medium transition-colors text-sm">
              <Icon icon={Download} className="w-4 h-4" />
              Export JSON
            </button>
          </div>
          
        </div>
      </section>

    </div>
  );
};
