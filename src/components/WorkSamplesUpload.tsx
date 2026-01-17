import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";

interface WorkSamplesUploadProps {
  currentPhotos: string[];
  onPhotosChange: (urls: string[]) => void;
  maxPhotos?: number;
}

export const WorkSamplesUpload = ({ 
  currentPhotos, 
  onPhotosChange, 
  maxPhotos = 10 
}: WorkSamplesUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const files = Array.from(event.target.files);
      const remainingSlots = maxPhotos - currentPhotos.length;
      
      if (files.length > remainingSlots) {
        toast.error(`You can only upload ${remainingSlots} more photo(s)`);
        return;
      }

      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('work-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('work-photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        onPhotosChange([...currentPhotos, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} photo(s) uploaded successfully`);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error("Failed to upload photos. Please try again.");
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const newPhotos = currentPhotos.filter((_, index) => index !== indexToRemove);
    onPhotosChange(newPhotos);
    toast.success("Photo removed");
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          id="work-samples-upload"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          disabled={uploading || currentPhotos.length >= maxPhotos}
          className="hidden"
        />
        <label
          htmlFor="work-samples-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading 
              ? 'Uploading...' 
              : currentPhotos.length >= maxPhotos
                ? `Maximum ${maxPhotos} photos reached`
                : `Click to upload (${currentPhotos.length}/${maxPhotos})`
            }
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG or GIF. Max 5MB each.
          </span>
        </label>
      </div>

      {/* Photo Grid */}
      {currentPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentPhotos.map((photo, index) => (
            <div 
              key={index} 
              className="relative aspect-square rounded-lg overflow-hidden border border-border group"
            >
              <img
                src={photo}
                alt={`Work sample ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(index)}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Progress indicator */}
      {currentPhotos.length > 0 && currentPhotos.length < 3 && (
        <p className="text-sm text-amber-600">
          Add {3 - currentPhotos.length} more photo(s) to complete this section
        </p>
      )}
    </div>
  );
};
