import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumIconProps extends React.SVGAttributes<SVGSVGElement> {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

export function PremiumIcon({ icon: Icon, className, size = 20, ...props }: PremiumIconProps) {
  return (
    <Icon
      className={cn(className)}
      size={size}
      strokeWidth={2.5}
      {...props}
    />
  );
}
