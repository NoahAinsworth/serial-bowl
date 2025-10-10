import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const [activeRect, setActiveRect] = React.useState<DOMRect | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateIndicator = () => {
      const list = listRef.current;
      if (!list) {
        console.log('TabsList: no list ref');
        return;
      }
      
      const activeTab = list.querySelector('[data-state="active"]');
      console.log('TabsList: active tab found:', !!activeTab);
      
      if (activeTab) {
        const rect = activeTab.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        const newRect = {
          left: rect.left - listRect.left,
          top: rect.top - listRect.top,
          width: rect.width,
          height: rect.height,
        } as DOMRect;
        
        console.log('TabsList: setting activeRect:', newRect);
        setActiveRect(newRect);
      }
    };

    updateIndicator();
    const observer = new MutationObserver(updateIndicator);
    if (listRef.current) {
      observer.observe(listRef.current, { attributes: true, subtree: true, attributeFilter: ['data-state'] });
    }

    return () => observer.disconnect();
  }, [children]);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        listRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "relative inline-flex min-h-[44px] h-auto items-center justify-center rounded-3xl bg-muted p-1 text-muted-foreground gap-1 border-2 border-border",
        className,
      )}
      {...props}
    >
      {activeRect && (
        <div
          className="absolute bg-secondary rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out z-[1]"
          style={{
            left: `${activeRect.left}px`,
            top: `${activeRect.top}px`,
            width: `${activeRect.width}px`,
            height: `${activeRect.height}px`,
          }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2.5 min-h-[44px] text-sm font-bold relative z-10 transition-colors duration-200 data-[state=inactive]:text-muted-foreground data-[state=active]:text-secondary-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
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
      "mt-2 focus-visible:outline-none",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
