import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X } from "lucide-react";

interface CoverPhotoUploadProps {
  currentCoverUrl?: string | null;
  onCoverChange: (url: string) => void;
}

export const CoverPhotoUpload = ({ currentCoverUrl, onCoverChange }: CoverPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `cover-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
      onCoverChange(publicUrl);
      toast({ title: "Success", description: "Cover photo uploaded successfully" });
    } catch (error) {
      console.error("Error uploading cover photo:", error);
      toast({ title: "Error", description: "Failed to upload cover photo. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemove = () => {
    onCoverChange("");
    toast({ title: "Cover removed", description: "Cover photo has been removed." });
  };

  return (
    <div className="space-y-3">
      <Label>Cover Photo (Profile Banner)</Label>
      <p className="text-sm text-muted-foreground">
        This appears as the background behind your avatar. Recommended: 1200×400px or similar wide image.
      </p>
      <div className="relative aspect-[3/1] min-h-[120px] w-full rounded-xl overflow-hidden border border-border bg-muted/30">
        {currentCoverUrl ? (
          <>
            <img src={currentCoverUrl} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => document.getElementById("cover-photo-input")?.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "Replace"}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={handleRemove}>
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <label htmlFor="cover-photo-input" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
            <ImagePlus className="h-12 w-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to add cover photo</span>
          </label>
        )}
        <input
          id="cover-photo-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </div>
    </div>
  );
};
