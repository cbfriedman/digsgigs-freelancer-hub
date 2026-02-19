import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Star,
  MessageSquare,
  Clock,
  DollarSign,
  MapPin,
  CheckCircle2,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Pin,
  PinOff,
} from "lucide-react";
import { ConfirmHireDialog } from "@/components/ConfirmHireDialog";
import { CompleteWorkDialog } from "@/components/CompleteWorkDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRealName, getDiggerProfileUrl } from "@/pages/DiggerDetail/utils";
import { getCodeForCountryName } from "@/config/regionOptions";
import { cn } from "@/lib/utils";

/** User-friendly status label, tooltip, and optional next-step reminder for Giggers. */
const BID_STATUS_CONFIG: Record<
  string,
  { label: string; tooltip: string; variant: "default" | "secondary" | "destructive" | "outline"; reminder?: string }
> = {
  pending: {
    label: "Under review",
    tooltip: "Awaiting your decision. Chat to clarify, then Award when ready.",
    variant: "secondary",
  },
  accepted: {
    label: "Accepted",
    tooltip: "You awarded this bid. Confirm hire to start, or mark work complete when done.",
    variant: "default",
  },
  rejected: {
    label: "Declined",
    tooltip: "This bid was not selected for this gig.",
    variant: "destructive",
  },
  withdrawn: {
    label: "Withdrawn",
    tooltip: "The freelancer withdrew this bid.",
    variant: "outline",
  },
  completed: {
    label: "Completed",
    tooltip: "Work has been marked complete.",
    variant: "default",
  },
};

const PROPOSAL_PREVIEW_LENGTH = 280;

interface DiggerProposalCardProps {
  bid: {
    id: string;
    amount: number;
    amount_min?: number;
    amount_max?: number;
    timeline: string;
    proposal: string;
    status: string;
    created_at: string;
    awarded?: boolean;
    pricing_model?: string;
  };
  gigTitle: string;
  gigId: string;
  diggerProfile: {
    id: string;
    handle: string | null;
    business_name?: string;
    profession?: string;
    profile_image_url: string | null;
    average_rating?: number | null;
    total_ratings?: number | null;
    years_experience?: number | null;
    completion_rate?: number | null;
    response_time_hours?: number | null;
    verified?: boolean | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    custom_occupation_title?: string | null;
    profile_name?: string | null;
    profiles?: { full_name: string | null } | null;
  };
  referenceCount?: number;
  isOwner: boolean;
  isFixedPrice?: boolean;
  isOnline?: boolean;
  /** When true, show "Chatting" / In progress badge (conversation exists for this gig + digger). */
  hasActiveChat?: boolean;
  /** When true, card is pinned to top by Gigger. */
  isPinned?: boolean;
  /** Callback to toggle pin (Gigger only). */
  onPinToggle?: () => void;
  onAccept?: () => void;
  onConfirmHire?: () => void;
  onCompleteWork?: () => void;
  acceptingId?: string | null;
}

export function DiggerProposalCard({
  bid,
  gigTitle,
  gigId,
  diggerProfile,
  referenceCount = 0,
  isOwner,
  isFixedPrice = false,
  isOnline = false,
  hasActiveChat = false,
  isPinned = false,
  onPinToggle,
  onAccept,
  onConfirmHire,
  onCompleteWork,
  acceptingId,
}: DiggerProposalCardProps) {
  const navigate = useNavigate();
  const [showFullProposal, setShowFullProposal] = useState(false);
  const truncated = bid.proposal.length > PROPOSAL_PREVIEW_LENGTH;
  const displayProposal = showFullProposal || !truncated
    ? bid.proposal
    : bid.proposal.slice(0, PROPOSAL_PREVIEW_LENGTH) + "...";

  const realName = formatRealName(diggerProfile.profiles?.full_name);
  const handle = diggerProfile.handle ? `@${String(diggerProfile.handle).replace(/^@/, "")}` : "";
  const displayName = realName || diggerProfile.business_name || diggerProfile.profession || "Professional";
  const diggerProfileUrl = getDiggerProfileUrl({ id: diggerProfile.id, handle: diggerProfile.handle });
  const professionalHeadline =
    diggerProfile.custom_occupation_title?.trim() ||
    diggerProfile.profile_name?.trim() ||
    diggerProfile.profession?.trim() ||
    null;
  const hasRange = bid.amount_min != null && bid.amount_max != null;
  const priceLabel = hasRange
    ? `$${(bid.amount_min ?? bid.amount).toLocaleString()} – $${(bid.amount_max ?? bid.amount).toLocaleString()}`
    : `$${bid.amount.toLocaleString()}`;
  const rating = diggerProfile.average_rating ?? 0;
  const reviews = diggerProfile.total_ratings ?? 0;
  const completionRate = diggerProfile.completion_rate ?? 0;
  const responseTime =
    diggerProfile.response_time_hours != null
      ? diggerProfile.response_time_hours <= 2
        ? "within a few hours"
        : `within ${Math.round(diggerProfile.response_time_hours)} hours`
      : null;
  const countryCode = diggerProfile.country ? getCodeForCountryName(diggerProfile.country.trim()) : "";
  const locationParts = [diggerProfile.state, diggerProfile.country].filter(Boolean);
  const locationDisplay =
    locationParts.length > 0 ? (countryCode ? `${countryCode} ` : "") + locationParts.join(", ") : null;

  const handleChat = () => {
    navigate(`/messages?gig=${gigId}&digger=${diggerProfile.id}`);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-shadow",
        isPinned && "border-l-4 border-l-primary"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Digger info — bigger avatar with online/offline, real name + username, headline, location + flag */}
          <div className="flex gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20 rounded-xl border-2 border-border/50">
                {diggerProfile.profile_image_url ? (
                  <img
                    src={diggerProfile.profile_image_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background",
                  isOnline ? "bg-green-500" : "bg-muted-foreground/50"
                )}
                aria-label={isOnline ? "Online" : "Offline"}
                title={isOnline ? "Online" : "Offline"}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                {realName && <span className="font-semibold text-foreground">{realName}</span>}
                {handle ? (
                  <Link
                    to={diggerProfileUrl}
                    className="text-sm text-primary hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {handle}
                  </Link>
                ) : (
                  <Link
                    to={diggerProfileUrl}
                    className="text-sm text-primary hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View profile
                  </Link>
                )}
                {!realName && !handle && (
                  <span className="font-semibold text-foreground">{displayName}</span>
                )}
                {diggerProfile.verified && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                )}
                {bid.pricing_model === "success_based" && (
                  <Badge variant="outline" className="text-xs">Exclusive</Badge>
                )}
              </div>
              {professionalHeadline && (
                <p className="mt-1 font-medium text-foreground/90 text-sm leading-tight">
                  {professionalHeadline}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {locationDisplay && (
                  <span className="flex items-center gap-1.5">
                    {countryCode ? (
                      <img
                        src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
                        alt=""
                        className="h-4 w-5 object-cover rounded-sm shrink-0"
                        width={20}
                        height={15}
                      />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{locationDisplay}</span>
                  </span>
                )}
                {rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)}
                  </span>
                )}
                {reviews > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {reviews}
                  </span>
                )}
                {completionRate > 0 && (
                  <span>{completionRate}% completion</span>
                )}
              </div>
            </div>
          </div>
          {/* Right: Price & delivery */}
          <div className="flex flex-col items-end gap-1 sm:shrink-0">
            <div className="flex items-center gap-1">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold text-foreground">{priceLabel}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {bid.timeline}
            </div>
            {responseTime && (
              <p className="text-xs text-muted-foreground">Replies {responseTime}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Project title (gig title) */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project</p>
          <p className="font-medium text-foreground">{gigTitle}</p>
        </div>

        {/* Cover letter with View more / View less */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cover letter</p>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {displayProposal}
          </p>
          {truncated && (
            <button
              type="button"
              onClick={() => setShowFullProposal(!showFullProposal)}
              className="mt-2 inline-flex items-center gap-1 text-primary hover:underline font-medium text-sm"
            >
              {showFullProposal ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  View less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  View more
                </>
              )}
            </button>
          )}
        </div>

        {/* Status & actions — clear labels, tooltips, reminders, and Chatting indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {isPinned && (
                <Badge variant="outline" className="gap-1 border-primary/50 text-primary font-medium">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-default">
                    <Badge
                      variant={
                        bid.status === "accepted" && bid.awarded
                          ? "default"
                          : (BID_STATUS_CONFIG[bid.status]?.variant ?? "secondary")
                      }
                      className={cn(
                        bid.status === "accepted" && bid.awarded && "bg-green-600 hover:bg-green-600"
                      )}
                    >
                      {bid.awarded ? "Hired ✓" : (BID_STATUS_CONFIG[bid.status]?.label ?? bid.status)}
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p className="text-xs">
                    {bid.awarded
                      ? "Freelancer is hired. Mark work complete when done."
                      : BID_STATUS_CONFIG[bid.status]?.tooltip ?? `Status: ${bid.status}`}
                  </p>
                </TooltipContent>
              </Tooltip>
              {bid.status === "pending" && hasActiveChat && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-default">
                      <Badge variant="outline" className="gap-1 border-primary/50 text-primary font-medium">
                        <MessageSquare className="h-3 w-3" />
                        Chatting
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="text-xs">You’re in conversation. Award when you’re ready to hire.</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {isOwner &&
              (bid.status === "pending" && hasActiveChat ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  In conversation — award when ready.
                </p>
              ) : bid.status === "accepted" && !bid.awarded ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Next: Confirm hire to start the project.
                </p>
              ) : bid.status === "accepted" && bid.awarded && !isFixedPrice ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Mark work complete when the job is done.
                </p>
              ) : null)}
          </div>
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2">
              {onPinToggle && (
                <Button
                  variant={isPinned ? "secondary" : "ghost"}
                  size="sm"
                  onClick={onPinToggle}
                  className={cn("gap-1.5", isPinned && "bg-primary/10 text-primary hover:bg-primary/20")}
                  title={isPinned ? "Unpin from top" : "Pin to top"}
                >
                  {isPinned ? (
                    <>
                      <PinOff className="h-4 w-4" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4" />
                      Pin
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleChat} className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Chat
              </Button>
              {bid.status === "pending" && onAccept && (
                <Button
                  size="sm"
                  onClick={onAccept}
                  disabled={acceptingId === bid.id}
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                >
                  {acceptingId === bid.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    "Award"
                  )}
                </Button>
              )}
              {bid.status === "accepted" && !bid.awarded && onConfirmHire && (
                <ConfirmHireDialog
                  bidId={bid.id}
                  gigId={gigId}
                  diggerId={diggerProfile.id}
                  diggerName={displayName}
                  bidAmount={bid.amount}
                  gigTitle={gigTitle}
                  pricingModel={bid.pricing_model}
                  onConfirm={onConfirmHire}
                />
              )}
              {bid.status === "accepted" && bid.awarded && !isFixedPrice && onCompleteWork && (
                <CompleteWorkDialog
                  bidId={bid.id}
                  bidAmount={bid.amount}
                  diggerId={diggerProfile.id}
                  gigTitle={gigTitle}
                  onComplete={onCompleteWork}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
