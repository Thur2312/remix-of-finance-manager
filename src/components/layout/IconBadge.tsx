import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconBadgeVariant = 'brand' | 'success' | 'warning' | 'danger' | 'gold';

const VARIANT_CLASSES: Record<IconBadgeVariant, string> = {
  brand: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  // Reservado pra marco/conquista (onboarding concluído, delta positivo em
  // destaque) — não confundir com "success": gold é celebração, não status.
  gold: 'bg-accent-gold/10 text-accent-gold',
};

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
} as const;

const ICON_SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
} as const;

interface IconBadgeProps {
  icon: LucideIcon;
  variant?: IconBadgeVariant;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

// Ponto único pro padrão "ícone em caixinha colorida" que antes era
// reinventado por página (cada uma com sua própria cor/opacidade/gradiente).
export function IconBadge({ icon: Icon, variant = 'brand', size = 'md', className }: IconBadgeProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className
      )}
    >
      <Icon className={ICON_SIZE_CLASSES[size]} strokeWidth={2} />
    </div>
  );
}
