import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-left"
      expand={false}
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast border shadow-lg rounded-xl backdrop-blur-sm px-4 py-3 transition-colors duration-200 " +
            "bg-white/95 text-slate-900 border-slate-200 " +
            "dark:bg-slate-950/95 dark:text-slate-100 dark:border-slate-800",
          title: "font-semibold",
          description: "text-slate-600 dark:text-slate-300",
          actionButton:
            "bg-primary text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "bg-muted text-muted-foreground hover:bg-muted/80",
          success:
            "border-emerald-300 bg-emerald-50 text-emerald-900 " +
            "dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
          error:
            "border-rose-300 bg-rose-50 text-rose-900 " +
            "dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100",
          warning:
            "border-amber-300 bg-amber-50 text-amber-900 " +
            "dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
          info:
            "border-sky-300 bg-sky-50 text-sky-900 " +
            "dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
