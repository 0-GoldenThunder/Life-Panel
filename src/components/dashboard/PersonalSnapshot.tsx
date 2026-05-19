import React from 'react';
import { useStore } from '@nanostores/react';
import { $personalBalance, $activeCurrency } from '../../stores/lifeStore';
import { Icon } from '../ui/Icon';
import { Wallet, ArrowRight } from 'lucide-react';

export const PersonalSnapshot: React.FC = () => {
  const balance = useStore($personalBalance);
  const currency = useStore($activeCurrency);

  return (
    <a 
      href="/personal"
      className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl h-full group hover:border-luxury-gold/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-500 relative overflow-hidden cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon={Wallet} className="w-4 h-4 text-platinum/40 group-hover:text-luxury-gold transition-colors" />
          <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase group-hover:text-platinum transition-colors">
            Personal Finance
          </span>
        </div>
        <Icon icon={ArrowRight} className="w-4 h-4 text-platinum/20 group-hover:text-luxury-gold transition-colors translate-x-0 group-hover:translate-x-1" />
      </div>
      
      <div className="mt-auto">
        <div className="text-xs text-platinum/40 mb-1">Net Balance</div>
        <div className="text-2xl font-sans text-platinum truncate"><span className="font-serif mr-1">{currency}</span><span className="font-sans tabular-nums">{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </a>
  );
};
