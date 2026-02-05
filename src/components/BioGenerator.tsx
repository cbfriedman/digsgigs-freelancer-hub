import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Copy, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

interface BioGeneratorProps {
  profession: string;
  currentBio?: string;
  onBioGenerated: (bio: string) => void;
}

export const BioGenerator = ({ profession, currentBio, onBioGenerated }: BioGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBio, setGeneratedBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [tone, setTone] = useState("professional");
  const [showGenerator, setShowGenerator] = useState(false);

  const generateBio = async () => {
    if (!profession) {
      toast.error("Profession is required to generate a bio");
      return;
    }

    setIsGenerating(true);
    try {
      const data = await invokeEdgeFunction<{ bio?: string }>(supabase, "generate-bio", {
        body: {
          profession,
          yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
          skills: skills ? skills.split(",").map(s => s.trim()).filter(Boolean) : [],
          specialties: specialties || null,
          tone
        }
      });

      if (data?.bio) {
        setGeneratedBio(data.bio);
        toast.success("Bio generated successfully!");
      }
    } catch (error: any) {
      console.error("Error generating bio:", error);
      const msg = error?.message ?? "";
      if (msg.includes("Rate limit")) {
        toast.error("Please wait a moment before generating again");
      } else if (msg.includes("credits")) {
        toast.error("AI credits exhausted. Please contact support.");
      } else {
        toast.error(msg || "Failed to generate bio. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseBio = () => {
    onBioGenerated(generatedBio);
    setShowGenerator(false);
    toast.success("Bio applied to your profile!");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedBio);
    toast.success("Bio copied to clipboard!");
  };

  if (!showGenerator) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowGenerator(true)}
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate Bio with AI
      </Button>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Bio Generator
        </CardTitle>
        <CardDescription>
          Let AI help you write a compelling service description that attracts clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="years-experience">Years of Experience (optional)</Label>
          <Input
            id="years-experience"
            type="number"
            placeholder="e.g., 10"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            min="0"
            max="50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="skills">Key Skills (optional, comma-separated)</Label>
          <Input
            id="skills"
            placeholder="e.g., residential remodeling, project management"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialties">Specialties (optional)</Label>
          <Input
            id="specialties"
            placeholder="e.g., historic home restoration, eco-friendly building"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone">Writing Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger id="tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional & Trustworthy</SelectItem>
              <SelectItem value="friendly">Friendly & Approachable</SelectItem>
              <SelectItem value="confident">Confident & Authoritative</SelectItem>
              <SelectItem value="creative">Creative & Innovative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={generateBio}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Bio
            </>
          )}
        </Button>

        {generatedBio && (
          <div className="space-y-3 pt-4 border-t">
            <Label>Generated Bio</Label>
            <Textarea
              value={generatedBio}
              onChange={(e) => setGeneratedBio(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder="Your generated bio will appear here..."
            />
            <div className="flex gap-2">
              <Button
                onClick={handleUseBio}
                className="flex-1"
              >
                Use This Bio
              </Button>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="icon"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                onClick={generateBio}
                variant="outline"
                size="icon"
                disabled={isGenerating}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <Button
          onClick={() => setShowGenerator(false)}
          variant="ghost"
          className="w-full"
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};
