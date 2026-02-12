import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Video, Calendar, MoreHorizontal, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  partnerName: string;
  subtitle: string;
  partnerProfileUrl?: string | null;
  projectTitle?: string | null;
  projectUrl?: string | null;
  onPartnerClick?: () => void;
  onProjectClick?: () => void;
  isOnline?: boolean;
  partnerAvatarUrl?: string | null;
  showBackButton?: boolean;
  onBack?: () => void;
  onMoreClick?: () => void;
  className?: string;
}

export function ChatHeader({
  partnerName,
  subtitle,
  partnerProfileUrl,
  projectTitle,
  projectUrl,
  onPartnerClick,
  onProjectClick,
  isOnline = false,
  partnerAvatarUrl,
  showBackButton = false,
  onBack,
  onMoreClick,
  className,
}: ChatHeaderProps) {
  const initial = partnerName[0]?.toUpperCase() || "?";

  return (
    <div className={cn(
      "shrink-0 flex items-center justify-between gap-3 px-4 py-3",
      "border-b border-border/50 bg-card/80 backdrop-blur-sm",
      className
    )}>
      {/* Left section */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 -ml-1"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Avatar: profile photo when available, otherwise initial */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-background shadow-sm">
            {partnerAvatarUrl && (
              <AvatarImage src={partnerAvatarUrl} alt="" className="object-cover" />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
              isOnline ? "bg-success" : "bg-muted-foreground/50"
            )}
            title={isOnline ? "Online" : "Offline"}
          />
        </div>

        {/* Name and subtitle */}
        <div className="min-w-0 flex-1">
          {partnerProfileUrl ? (
            <button
              type="button"
              className="font-semibold text-foreground truncate text-sm sm:text-base block text-left w-fit hover:underline focus:underline focus-visible:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onPartnerClick?.();
              }}
              title="View profile"
            >
              {partnerName}
            </button>
          ) : (
            <h2 className="font-semibold text-foreground truncate text-sm sm:text-base">
              {partnerName}
            </h2>
          )}
          <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
            {isOnline && (
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
            )}
            {projectUrl && projectTitle ? (
              <button
                type="button"
                className="truncate hover:underline text-left w-fit max-w-full focus:underline focus-visible:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onProjectClick?.();
                }}
                title="View project"
              >
                {projectTitle}
              </button>
            ) : (
              <span>{isOnline ? "Active now" : subtitle}</span>
            )}
          </p>
        </div>
      </div>

      {/* Right section - action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 hidden sm:flex text-muted-foreground hover:text-foreground"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voice call</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 hidden sm:flex text-muted-foreground hover:text-foreground"
              >
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Video call</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 hidden md:flex text-muted-foreground hover:text-foreground"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Schedule meeting</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={onMoreClick}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>More options</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default ChatHeader;
