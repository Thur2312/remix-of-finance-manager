import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed border-2", className)}>
      <CardContent className="py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-6">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
        {action && (
          action.href ? (
            <Button asChild>
              <Link to={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
