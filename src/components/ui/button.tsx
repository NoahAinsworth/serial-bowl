import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-3 border-border active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[4px_4px_0px_rgba(0,0,0,0.15)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.2)] hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[4px_4px_0px_rgba(0,0,0,0.15)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.2)] hover:-translate-y-0.5",
        outline:
          "border-3 border-border bg-background text-foreground shadow-[3px_3px_0px_rgba(0,0,0,0.12)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.18)] hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[4px_4px_0px_rgba(0,0,0,0.15)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.2)] hover:-translate-y-0.5",
        ghost: "border-0 shadow-none hover:bg-accent/20",
        link: "border-0 shadow-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
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
