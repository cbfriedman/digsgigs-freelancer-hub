import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { ConfirmHireDialog } from "@/components/ConfirmHireDialog";
import { CompleteWorkDialog } from "@/components/CompleteWorkDialog";

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
  };
  referenceCount?: number;
  isOwner: boolean;
  isFixedPrice?: boolean;
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

  const displayName = diggerProfile.business_name || diggerProfile.profession || "Professional";
  const handle = diggerProfile.handle ? `@${diggerProfile.handle}` : "";
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
  const location = [diggerProfile.city, diggerProfile.state].filter(Boolean).join(", ") || null;

  const handleChat = () => {
    navigate(`/messages?gig=${gigId}&digger=${diggerProfile.id}`);
  };

  return (
    <Card className="overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Digger info */}
          <div className="flex gap-4">
            <Avatar className="h-14 w-14 rounded-xl border-2 border-border/50">
              {diggerProfile.profile_image_url ? (
                <img
                  src={diggerProfile.profile_image_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{displayName}</span>
                {handle && (
                  <span className="text-sm text-muted-foreground">{handle}</span>
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
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </span>
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

        {/* Bid description */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Bid</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {displayProposal}
            {truncated && !showFullProposal && (
              <button
                type="button"
                onClick={() => setShowFullProposal(true)}
                className="ml-1 text-primary hover:underline font-medium"
              >
                more
              </button>
            )}
          </p>
        </div>

        {/* Status & actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                bid.status === "accepted"
                  ? "default"
                  : bid.status === "rejected"
                    ? "destructive"
                    : bid.status === "withdrawn"
                      ? "outline"
                      : "secondary"
              }
            >
              {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
            </Badge>
            {bid.awarded && (
              <Badge className="bg-green-600">Hired ✓</Badge>
            )}
          </div>
          {isOwner && (
            <div className="flex gap-2">
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
