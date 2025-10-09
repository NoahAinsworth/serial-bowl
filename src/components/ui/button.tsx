import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold tracking-[0.01em] transition-all focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--sb-accent-dark))] text-white border border-[hsl(var(--sb-accent-dark)/0.8)] rounded-[var(--btn-shape)] shadow-[0_8px_22px_hsl(var(--sb-accent)/0.24)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_hsl(var(--sb-accent)/0.30)] active:translate-y-0 active:shadow-[0_4px_12px_hsl(var(--sb-accent)/0.18)] focus-visible:outline-[3px] focus-visible:outline-[hsl(var(--sb-accent)/0.4)] focus-visible:outline-offset-2",
        destructive: "bg-destructive text-destructive-foreground rounded-[var(--btn-shape)] hover:-translate-y-0.5 active:translate-y-0 border border-destructive/80",
        outline: "bg-white text-[hsl(var(--sb-text))] border border-[hsl(var(--sb-accent)/0.22)] rounded-[var(--btn-shape)] hover:border-[hsl(var(--sb-accent)/0.40)] hover:shadow-[0_0_0_2px_hsl(var(--sb-accent)/0.24)]",
        secondary: "bg-[hsl(var(--sb-accent)/0.12)] text-[hsl(var(--sb-text))] border border-[hsl(var(--sb-accent)/0.26)] rounded-[var(--btn-shape)] hover:bg-[hsl(var(--sb-accent)/0.18)] hover:border-[hsl(var(--sb-accent)/0.32)]",
        ghost: "hover:bg-muted/50 rounded-[16px]",
        link: "text-[hsl(var(--sb-accent))] underline-offset-4 hover:underline",
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
