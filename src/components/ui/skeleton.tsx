import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse bg-primary/10 border-2 border-primary/30", className)} {...props} />;
}

export { Skeleton };
