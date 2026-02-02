import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const trendStyles = {
  up: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
  down: 'from-red-500/20 to-red-500/5 text-red-600 dark:text-red-400',
  neutral: 'from-primary/20 to-primary/5 text-primary',
};

const iconStyles = {
  up: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  down: 'bg-red-500/15 text-red-600 dark:text-red-400',
  neutral: 'bg-primary/15 text-primary',
};

export function StatCard({ title, value, subtitle, icon: Icon, trend = 'neutral', className }: StatCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300",
      "bg-gradient-to-br from-card to-card/80",
      className
    )}>
      {/* Gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-30",
        trendStyles[trend]
      )} />
      
      <CardContent className="relative pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconStyles[trend]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
