import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation font-display",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-3 border-border rounded-[25px] hover:translate-y-[-2px] active:translate-y-[0px]",
        destructive: "bg-destructive text-destructive-foreground border-3 border-border rounded-[25px] hover:translate-y-[-2px] active:translate-y-[0px]",
        outline: "border-3 border-border bg-card text-foreground rounded-[25px] hover:translate-y-[-2px] active:translate-y-[0px]",
        secondary: "bg-secondary text-secondary-foreground border-3 border-border rounded-[25px] hover:translate-y-[-2px] active:translate-y-[0px]",
        ghost: "hover:bg-muted rounded-[20px]",
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
