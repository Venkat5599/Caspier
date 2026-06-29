import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-24 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
