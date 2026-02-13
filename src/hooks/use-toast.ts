import { toast as sonnerToast } from "sonner";
import type { ReactNode } from "react";

type Toast = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive" | "success" | "warning" | "error" | "info";
  duration?: number;
  className?: string;
};

function toast(props: Toast) {
  const { title, description, variant, duration, className } = props;
  const message = title ?? "";
  const options: Record<string, unknown> = {};
  if (description !== undefined) options.description = description;
  if (duration !== undefined) options.duration = duration;
  if (className) options.className = className;

  const id =
    variant === "destructive" || variant === "error"
      ? sonnerToast.error(message as any, options as any)
      : variant === "success"
        ? sonnerToast.success(message as any, options as any)
        : variant === "warning"
          ? sonnerToast.warning(message as any, options as any)
          : variant === "info"
            ? sonnerToast.info(message as any, options as any)
            : sonnerToast(message as any, options as any);

  return {
    id: String(id),
    dismiss: () => sonnerToast.dismiss(id),
    update: (next: Toast) => {
      sonnerToast.dismiss(id);
      return toast({ ...props, ...next });
    },
  };
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };
