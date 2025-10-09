import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-accent uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background rounded-[14px] border-[1.5px] border-foreground hover:bg-background hover:text-foreground active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground rounded-[14px] border-[1.5px] border-destructive hover:bg-background hover:text-destructive active:scale-[0.98]",
        outline: "bg-background text-foreground rounded-[14px] border-[1.5px] border-foreground hover:bg-foreground hover:text-background active:scale-[0.98]",
        secondary: "bg-primary text-primary-foreground rounded-[14px] border-[1.5px] border-primary hover:bg-background hover:text-primary active:scale-[0.98]",
        ghost: "hover:bg-muted/50 rounded-[14px] border-[1.5px] border-transparent hover:border-foreground/20",
        link: "text-primary underline-offset-4 hover:underline border-none",
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
