import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-auto w-full items-center justify-center rounded-[20px] bg-white border border-[hsl(var(--sb-border))] p-1.5 text-muted-foreground gap-2 shadow-sm",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-[18px] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] transition-all",
      "data-[state=inactive]:bg-[#F3F3F3] data-[state=inactive]:border data-[state=inactive]:border-[#E6E6E6] data-[state=inactive]:text-[hsl(var(--sb-text))]",
      "data-[state=active]:bg-[hsl(var(--sb-accent)/0.18)] data-[state=active]:border data-[state=active]:border-[hsl(var(--sb-accent)/0.32)] data-[state=active]:text-[hsl(var(--sb-text))] data-[state=active]:shadow-sm",
      "focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50",
      "font-[family-name:var(--sb-font-accent)]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
