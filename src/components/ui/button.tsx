import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold letter-spacing-[0.01em] transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation tracking-wide focus-accent",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--sb-brand-green-dark))] text-white rounded-[16px] border border-[hsl(var(--sb-brand-green-dark)/0.8)] shadow-[0_8px_22px_hsl(var(--sb-accent)/0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-transform",
        destructive: "bg-destructive text-destructive-foreground rounded-[16px] border border-destructive/80 shadow-[0_8px_22px_hsl(var(--destructive)/0.25)] hover:-translate-y-0.5 active:translate-y-0",
        outline: "bg-white text-[hsl(var(--sb-text))] rounded-[16px] border border-[hsl(var(--sb-accent)/0.22)] hover:border-[hsl(var(--sb-accent)/0.4)] hover:shadow-[0_0_0_2px_hsl(var(--sb-accent)/0.2)]",
        secondary: "bg-[hsl(var(--sb-accent)/0.12)] text-[hsl(var(--sb-text))] rounded-[16px] border border-[hsl(var(--sb-accent)/0.25)] hover:bg-[hsl(var(--sb-accent)/0.18)] hover:border-[hsl(var(--sb-accent)/0.35)]",
        ghost: "hover:bg-muted/50 rounded-[16px]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 min-h-[44px]",
        sm: "h-9 px-3 min-h-[36px] text-xs font-semibold",
        lg: "h-14 px-5 min-h-[48px] text-base font-bold",
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
