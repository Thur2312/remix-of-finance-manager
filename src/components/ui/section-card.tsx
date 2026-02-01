import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function SectionCard({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  className,
  headerClassName,
  contentClassName,
  noPadding
}: SectionCardProps) {
  return (
    <Card className={cn("border-0 shadow-md", className)}>
      <CardHeader className={cn("pb-4", headerClassName)}>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn(noPadding && "p-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
