import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIDescriptionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  problemLabel?: string;
  clarifyingLabel?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  id?: string;
}

export function AIDescriptionTextarea({
  value,
  onChange,
  problemLabel,
  clarifyingLabel,
  placeholder = "No technical terms needed. Just explain the goal...",
  rows = 4,
  required,
  id,
}: AIDescriptionTextareaProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!value.trim()) {
      toast.error("Please write something first, then click to enhance");
      return;
    }

    if (value.trim().length < 10) {
      toast.error("Please write a bit more before enhancing");
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-gig-description", {
        body: {
          description: value.trim(),
          problemLabel,
          clarifyingLabel,
        },
      });

      if (error) {
        console.error("Enhancement error:", error);
        toast.error("Failed to enhance. Please try again.");
        return;
      }

      if (data?.enhancedDescription) {
        onChange(data.enhancedDescription);
        toast.success("Description enhanced!");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error("Enhancement error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          No technical terms needed. Just explain the goal.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleEnhance}
          disabled={isEnhancing || !value.trim()}
          className="gap-1.5"
        >
          {isEnhancing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Enhancing...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Enhance with AI
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
