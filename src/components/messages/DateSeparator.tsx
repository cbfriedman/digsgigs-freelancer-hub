import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface DateSeparatorProps {
  date: string;
  className?: string;
}

export function DateSeparator({ date, className }: DateSeparatorProps) {
  const dateObj = new Date(date);
  
  let label: string;
  if (isToday(dateObj)) {
    label = "Today";
  } else if (isYesterday(dateObj)) {
    label = "Yesterday";
  } else {
    label = format(dateObj, "EEEE, MMMM d");
  }

  return (
    <div className={cn("flex items-center justify-center py-3", className)}>
      <div className="flex-1 h-px bg-border/50" />
      <span className="px-3 text-xs font-medium text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full border border-border/50 shadow-sm">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

export default DateSeparator;
