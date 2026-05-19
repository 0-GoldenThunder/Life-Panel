import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  type?: 'quote' | 'bento' | 'card';
}

export const ZeroStateSkeleton: React.FC<SkeletonProps> = ({ className, type = 'quote' }) => {
  if (type === 'quote') {
    return (
      <div className={cn("flex flex-col items-center justify-center space-y-3 w-full h-full min-h-[120px]", className)}>
        {/* Subtle, languid pulse for the text skeleton */}
        <div className="h-4 w-3/4 skeleton rounded-md" />
        <div className="h-4 w-1/2 skeleton rounded-md" />
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={cn("p-4 border border-[#222] rounded-lg w-full", className)}>
        <div className="h-5 w-1/3 skeleton rounded-md mb-4" />
        <div className="space-y-2">
          <div className="h-4 w-full skeleton rounded-md" />
          <div className="h-4 w-5/6 skeleton rounded-md" />
        </div>
      </div>
    );
  }

  // default bento
  return (
    <div className={cn("p-6 border border-[#222] rounded-xl w-full h-full", className)}>
      <div className="h-6 w-1/4 skeleton rounded-md mb-6" />
      <div className="space-y-3">
        <div className="h-4 w-full skeleton rounded-md" />
        <div className="h-4 w-full skeleton rounded-md" />
        <div className="h-4 w-3/4 skeleton rounded-md" />
      </div>
    </div>
  );
};
