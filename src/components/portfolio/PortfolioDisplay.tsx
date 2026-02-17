import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Image as ImageIcon, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { DiggerPortfolioItem, PortfolioMediaItem } from "@/types/portfolio";

const INITIAL_VISIBLE = 4;
const LOAD_MORE_STEP = 4;
const CARD_SLIDESHOW_INTERVAL_MS = 4000;

interface PortfolioDisplayProps {
  items: DiggerPortfolioItem[];
  /** Optional legacy single portfolio URL to show if no items */
  legacyPortfolioUrl?: string | null;
  className?: string;
}

export function PortfolioDisplay({ items, legacyPortfolioUrl, className }: PortfolioDisplayProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [detailItem, setDetailItem] = useState<DiggerPortfolioItem | null>(null);
  const [fullscreenMediaList, setFullscreenMediaList] = useState<PortfolioMediaItem[] | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [cardSlideIndices, setCardSlideIndices] = useState<Record<string, number>>({});

  const fullscreenMedia = fullscreenMediaList?.[fullscreenIndex] ?? null;
  const fullscreenCount = fullscreenMediaList?.length ?? 0;
  const canGoPrev = fullscreenCount > 1;
  const canGoNext = fullscreenCount > 1;

  const openFullscreen = (list: PortfolioMediaItem[], index: number) => {
    setFullscreenMediaList(list);
    setFullscreenIndex(index);
  };
  const closeFullscreen = () => {
    setFullscreenMediaList(null);
  };
  const goPrev = () => {
    if (!fullscreenMediaList) return;
    setFullscreenIndex((i) => (i - 1 + fullscreenMediaList.length) % fullscreenMediaList.length);
  };
  const goNext = () => {
    if (!fullscreenMediaList) return;
    setFullscreenIndex((i) => (i + 1) % fullscreenMediaList.length);
  };

  const hasMore = items.length > INITIAL_VISIBLE;
  const showingAll = visibleCount >= items.length;
  const visibleItems = items.slice(0, visibleCount);
  const remainingCount = items.length - visibleCount;

  // Auto-advance thumbnail slideshow for cards with multiple media
  useEffect(() => {
    const multiMediaItems = visibleItems.filter((item) => item.media && item.media.length > 1);
    if (multiMediaItems.length === 0) return;
    const interval = setInterval(() => {
      setCardSlideIndices((prev) => {
        const next = { ...prev };
        multiMediaItems.forEach((item) => {
          const len = item.media!.length;
          const current = prev[item.id] ?? 0;
          next[item.id] = (current + 1) % len;
        });
        return next;
      });
    }, CARD_SLIDESHOW_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visibleCount, items]);

  if (items.length === 0 && !legacyPortfolioUrl) return null;

  if (items.length === 0 && legacyPortfolioUrl) {
    return (
      <div className={className}>
        <a
          href={legacyPortfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
        >
          <ExternalLink className="h-4 w-4" />
          View portfolio
        </a>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {visibleItems.map((item) => {
          const mediaCount = item.media?.length ?? 0;
          const slideIndex = mediaCount > 1 ? (cardSlideIndices[item.id] ?? 0) % mediaCount : 0;
          const primaryMedia = item.media?.[slideIndex];
          const description = item.description?.trim();
          const showMore = description && description.length > 120;

          return (
            <Card
              key={item.id}
              className="overflow-hidden flex flex-col cursor-pointer transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none"
              tabIndex={0}
              role="button"
              onClick={() => setDetailItem(item)}
              onKeyDown={(e) => e.key === "Enter" && setDetailItem(item)}
            >
              {/* Thumbnail / primary media — auto-rotates when multiple; prev/next when >1 */}
              {primaryMedia ? (
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {primaryMedia.type === "video" ? (
                    <video
                      key={primaryMedia.url}
                      src={primaryMedia.url}
                      className="w-full h-full object-cover animate-in fade-in duration-300"
                      muted
                      playsInline
                      controls={false}
                      preload="metadata"
                    />
                  ) : (
                    <img
                      key={primaryMedia.url}
                      src={primaryMedia.url}
                      alt=""
                      className="w-full h-full object-cover animate-in fade-in duration-300"
                    />
                  )}
                  {mediaCount > 1 && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardSlideIndices((prev) => ({
                            ...prev,
                            [item.id]: (slideIndex - 1 + mediaCount) % mediaCount,
                          }));
                        }}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardSlideIndices((prev) => ({
                            ...prev,
                            [item.id]: (slideIndex + 1) % mediaCount,
                          }));
                        }}
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                      <span className="absolute bottom-2 right-2 rounded bg-black/60 text-white text-xs px-2 py-0.5 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        +{mediaCount - 1}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12" />
                </div>
              )}

              <CardHeader className="pb-2 pt-3 px-4">
                <h3 className="font-semibold text-foreground leading-tight">{item.title}</h3>
                {item.category && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col px-4 pb-4 pt-0">
                {description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {showMore ? `${description.slice(0, 120)}…` : description}
                  </p>
                ) : null}
                {showMore && (
                  <span className="text-sm text-primary mt-1 inline-block">Read more</span>
                )}

                {item.skills && item.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.skills.slice(0, 5).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs font-normal">
                        {skill}
                      </Badge>
                    ))}
                    {item.skills.length > 5 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{item.skills.length - 5}
                      </Badge>
                    )}
                  </div>
                )}

                {item.project_url && (
                  <a
                    href={item.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3 font-medium"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    View project
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() =>
              showingAll
                ? setVisibleCount(INITIAL_VISIBLE)
                : setVisibleCount((n) => Math.min(n + LOAD_MORE_STEP, items.length))
            }
            className="gap-2"
          >
            {showingAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Load more{remainingCount > 0 ? ` (${remainingCount} more)` : ""}
              </>
            )}
          </Button>
        </div>
      )}

      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle className="pr-8">
              {detailItem?.title}
              {detailItem?.category && (
                <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                  {detailItem.category}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6 space-y-4">
            {detailItem?.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {detailItem.description}
              </p>
            )}
            {detailItem?.media && detailItem.media.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Media</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {detailItem.media.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openFullscreen(detailItem.media, idx)}
                      className="rounded-lg overflow-hidden bg-muted text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {m.type === "video" ? (
                        <video
                          src={m.url}
                          className="w-full aspect-video object-contain pointer-events-none"
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={m.url}
                          alt=""
                          className="w-full h-auto max-h-64 object-contain"
                        />
                      )}
                      <span className="sr-only">View full size</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {detailItem?.skills && detailItem.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {detailItem.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            {detailItem?.project_url && (
              <a
                href={detailItem.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                View project
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen media viewer — above detail dialog */}
      <Dialog open={fullscreenMediaList !== null} onOpenChange={(open) => !open && closeFullscreen()}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] w-fit h-fit p-0 gap-0 border-0 bg-black/95 overflow-hidden z-[220] [&>button]:hidden"
          onPointerDownOutside={closeFullscreen}
          onEscapeKeyDown={closeFullscreen}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              goPrev();
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              goNext();
            }
          }}
        >
          <div className="relative flex items-center justify-center min-w-[280px] min-h-[200px] max-w-[95vw] max-h-[95vh] p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
              onClick={closeFullscreen}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
            {canGoPrev && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                onClick={goPrev}
                aria-label="Previous"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {canGoNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                onClick={goNext}
                aria-label="Next"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
            {fullscreenMedia?.type === "video" ? (
              <video
                key={fullscreenMedia.url}
                src={fullscreenMedia.url}
                className="max-w-full max-h-[85vh] w-auto h-auto rounded"
                controls
                autoPlay
                playsInline
                preload="auto"
              />
            ) : fullscreenMedia ? (
              <img
                key={fullscreenMedia.url}
                src={fullscreenMedia.url}
                alt=""
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded"
              />
            ) : null}
            {fullscreenCount > 1 && (
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/50 text-white text-sm px-3 py-1">
                {fullscreenIndex + 1} / {fullscreenCount}
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
