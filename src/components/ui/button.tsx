import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground rounded-[20px] border-2 border-primary shadow-[0_0_15px_rgba(0,255,133,0.3)] hover:shadow-[0_0_25px_rgba(0,255,133,0.5)] hover:scale-[1.02] active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground rounded-[20px] border-2 border-destructive hover:scale-[1.02] active:scale-[0.98]",
        outline: "bg-card text-foreground rounded-[20px] border-2 border-transparent bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 bg-origin-border hover:from-primary hover:via-secondary hover:to-accent hover:text-white hover:shadow-[0_0_20px_rgba(0,255,133,0.4)] active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground rounded-[20px] border-2 border-secondary shadow-[0_0_15px_rgba(255,106,61,0.3)] hover:shadow-[0_0_25px_rgba(255,106,61,0.5)] hover:scale-[1.02] active:scale-[0.98]",
        ghost: "hover:bg-muted/50 rounded-[16px] hover:shadow-[0_0_10px_rgba(0,255,133,0.2)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2 min-h-[44px]",
        sm: "h-9 px-4 min-h-[36px] text-xs",
        lg: "h-14 px-8 min-h-[48px] text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
