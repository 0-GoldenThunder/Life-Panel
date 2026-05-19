import React, { useState, useEffect } from 'react';
import { getZeroStateQuote } from '../../lib/zeroStateQuotes';
import { ZeroStateSkeleton } from './ZeroStateSkeleton';
import { cn } from '../../lib/utils';

interface DeliberateVoidProps {
  className?: string;
  type?: 'quote' | 'bento' | 'card';
}

export const DeliberateVoid: React.FC<DeliberateVoidProps> = ({ className, type = 'quote' }) => {
  // Skeleton is the default render state to prevent hydration flicker
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    // Client-side execution guarantees correct local timezone
    setQuote(getZeroStateQuote());
  }, []);

  if (!quote) {
    return <ZeroStateSkeleton className={className} type={type} />;
  }

  // Display the quote with 15% Platinum opacity and Playfair Display italic
  return (
    <div className={cn("flex items-center justify-center w-full h-full min-h-[120px] p-6 text-center", className)}>
      <p className="font-serif italic text-platinum/15 text-lg leading-relaxed">
        "{quote}"
      </p>
    </div>
  );
};
