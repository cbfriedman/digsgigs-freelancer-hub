import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Phone } from "lucide-react";

interface PhoneCallCardProps {
  phoneE164: string;
  displayPhone: string;
  title?: string;
  subtitle?: string;
  onCallClick?: () => void;
}

async function copyToClipboard(text: string) {
  // Try async clipboard first
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function PhoneCallCard({
  phoneE164,
  displayPhone,
  title = "Call Us Directly",
  subtitle = "Speak to Morgan now",
  onCallClick,
}: PhoneCallCardProps) {
  const digitsOnly = phoneE164.replace(/\D/g, "");

  const handleCopy = async () => {
    try {
      await copyToClipboard(digitsOnly);
      toast.success("Phone number copied", { description: digitsOnly });
    } catch {
      toast.error("Couldn't copy number. Please select and copy manually.");
    }
  };

  return (
    <Card className="p-5 border-2 border-border/50 hover:border-success/50 transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
          <Phone className="h-5 w-5 text-success" />
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="font-mono text-xl font-bold text-success text-center py-2">
        {displayPhone}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          Copy
        </Button>
        <Button asChild type="button" size="sm" className="bg-gradient-primary" onClick={onCallClick}>
          <a href={`tel:${phoneE164}`}>Call</a>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Note: Desktop browsers may not place calls; copying the number is the most reliable option.
      </p>
    </Card>
  );
}
