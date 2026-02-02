import { useTheme } from "next-themes";
import { Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Moon className="h-4 w-4 text-muted-foreground" />
        <Switch disabled className="opacity-50" />
        <span className="text-sm text-muted-foreground">Dark Mode</span>
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Moon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        Dark Mode
      </span>
    </div>
  );
}
