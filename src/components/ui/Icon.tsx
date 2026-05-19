import type { LucideProps } from 'lucide-react';
import type { ElementType } from 'react';

interface IconProps extends LucideProps {
  icon: ElementType<LucideProps>;
}

export const Icon = ({ icon: LucideIcon, strokeWidth = 1.25, ...props }: IconProps) => {
  return <LucideIcon strokeWidth={strokeWidth} {...props} />;
};
