import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkSamplesGalleryProps {
  photos: string[];
  businessName: string;
}

export const WorkSamplesGallery = ({ photos, businessName }: WorkSamplesGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const handlePrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5 text-primary" />
          Work Samples
          <span className="text-muted-foreground font-normal text-sm">({photos.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, idx) => (
            <Dialog key={idx} open={selectedIndex === idx} onOpenChange={(open) => setSelectedIndex(open ? idx : null)}>
              <DialogTrigger asChild>
                <div className="relative aspect-square rounded-lg overflow-hidden border border-border cursor-pointer group">
                  <OptimizedImage
                    src={photo}
                    alt={`Work sample ${idx + 1} by ${businessName}`}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm">
                      View
                    </span>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                    onClick={() => setSelectedIndex(null)}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                  
                  {photos.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                        onClick={handlePrevious}
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                        onClick={handleNext}
                      >
                        <ChevronRight className="h-8 w-8" />
                      </Button>
                    </>
                  )}
                  
                  <img
                    src={photos[selectedIndex ?? 0]}
                    alt={`Work sample ${(selectedIndex ?? 0) + 1} by ${businessName}`}
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                    {(selectedIndex ?? 0) + 1} / {photos.length}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
