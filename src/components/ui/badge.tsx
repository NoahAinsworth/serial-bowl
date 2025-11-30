import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 border-border px-3 py-1 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-ring shadow-[2px_2px_0px_rgba(0,0,0,0.1)]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:-translate-y-0.5",
        secondary: "bg-secondary text-secondary-foreground hover:shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:-translate-y-0.5",
        outline: "bg-background text-foreground hover:shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:-translate-y-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
