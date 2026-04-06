import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[110px] w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-secondary focus:border-accent",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
