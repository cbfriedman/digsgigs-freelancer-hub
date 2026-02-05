import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";

export const LogoGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const logoPrompt = `Create a modern, professional logo icon on a pure white background. 
The design features an abstract monogram combining the letters "D" and "G" interlocking elegantly. 
Use a bold gradient from purple-violet (#6d28d9) to vibrant orange (#f97316), flowing diagonally across the letters. 
The letters should be stylized, geometric, and seamlessly connected - the "D" flowing into the "G" as one unified mark. 
Style: Flat design, minimalist, suitable for web and app use. 
No additional text or words, just the D+G monogram icon. Vector-style with clean edges.
Ultra high resolution. 1:1 aspect ratio.`;

  const generateLogo = async () => {
    setIsGenerating(true);
    try {
      const data = await invokeEdgeFunction<{ imageUrl?: string; error?: string }>(supabase, "generate-step-image", {
        body: { prompt: logoPrompt },
      });

      if (data?.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        toast.success("Logo generated successfully!");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.error("No image was generated. Please try again.");
      }
    } catch (err: any) {
      console.error("Error:", err);
      toast.error(err?.message || "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLogo = () => {
    if (!generatedImageUrl) return;

    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = "digsandgigs-logo.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Logo downloaded!");
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Digs and Gigs Logo Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2"><strong>Logo Concept:</strong></p>
          <p>Modern, professional shovel + gear icon in deep blue (#1e3a8a), representing skilled trades and marketplace technology.</p>
        </div>

        {!generatedImageUrl && (
          <Button 
            onClick={generateLogo} 
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Logo...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Logo
              </>
            )}
          </Button>
        )}

        {generatedImageUrl && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-white flex items-center justify-center">
              <img 
                src={generatedImageUrl} 
                alt="Generated Digs and Gigs Logo" 
                className="max-w-full max-h-80 object-contain"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={downloadLogo} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download Logo
              </Button>
              <Button 
                onClick={generateLogo} 
                variant="outline" 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Click refresh to generate a new variation
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
