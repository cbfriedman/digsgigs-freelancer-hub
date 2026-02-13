import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Percent, 
  CreditCard, 
  Clock,
  DollarSign,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { AnonymizedDiggerCard } from "./AnonymizedDiggerCard";

const PROPOSAL_PREVIEW_LENGTH = 280;

interface AnonymizedBidCardProps {
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
  bidderNumber: number;
  diggerProfile: {
    id: string;
    handle?: string | null;
    business_name?: string | null;
    profile_image_url?: string | null;
    profession?: string;
    years_experience?: number;
    average_rating?: number;
    total_ratings?: number;
    completion_rate?: number;
    response_time_hours?: number;
    verified?: boolean;
    is_insured?: boolean;
    is_bonded?: boolean;
    is_licensed?: string;
    skills?: string[];
    certifications?: string[];
    city?: string;
    state?: string;
    offers_free_estimates?: boolean;
  };
  referenceCount?: number;
  isLowestBid?: boolean;
  isOwner: boolean;
  onAccept?: () => void;
  onConfirmHire?: () => void;
  onAskQuestion?: () => void;
  acceptingId?: string | null;
  children?: React.ReactNode;
}

export const AnonymizedBidCard = ({
  bid,
  bidderNumber,
  diggerProfile,
  referenceCount,
  isLowestBid,
  isOwner,
  onAccept,
  onConfirmHire,
  onAskQuestion,
  acceptingId,
  children,
}: AnonymizedBidCardProps) => {
  const [showFullProposal, setShowFullProposal] = useState(false);
  const hasRange = bid.amount_min && bid.amount_max;
  const displayMin = bid.amount_min || bid.amount;
  const displayMax = bid.amount_max || bid.amount;
  const displayName = (diggerProfile.business_name && diggerProfile.business_name.trim()) || (diggerProfile.handle ? `@${diggerProfile.handle}` : null) || undefined;
  const profileImageUrl = diggerProfile.profile_image_url ?? undefined;
  const proposalTruncated = bid.proposal.length > PROPOSAL_PREVIEW_LENGTH;
  const displayProposal = showFullProposal || !proposalTruncated
    ? bid.proposal
    : bid.proposal.slice(0, PROPOSAL_PREVIEW_LENGTH) + "...";

  return (
    <Card className={isLowestBid ? "border-primary border-2 shadow-lg" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Pricing Model Badge */}
          <div className="flex items-center gap-2">
            {bid.pricing_model === 'success_based' ? (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                <Percent className="w-3 h-3 mr-1" />
                Exclusive (2% fee)
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                <CreditCard className="w-3 h-3 mr-1" />
                Non-Exclusive
              </Badge>
            )}
            {isLowestBid && bid.status === 'pending' && (
              <Badge variant="default" className="bg-primary">
                Lowest Bid
              </Badge>
            )}
          </div>
          
          {/* Cost Display */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className={`text-2xl font-bold ${isLowestBid ? 'text-primary' : 'text-foreground'}`}>
                {hasRange 
                  ? `${displayMin.toLocaleString()} – ${displayMax.toLocaleString()}`
                  : bid.amount.toLocaleString()
                }
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end mt-1">
              <Clock className="w-3.5 h-3.5" />
              {bid.timeline}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Digger profile: real name & photo when available */}
        <AnonymizedDiggerCard
          bidderNumber={bidderNumber}
          displayName={displayName}
          profileImageUrl={profileImageUrl}
          showRealIdentity={!!displayName}
          profession={diggerProfile.profession}
          yearsExperience={diggerProfile.years_experience}
          averageRating={diggerProfile.average_rating}
          totalRatings={diggerProfile.total_ratings}
          completionRate={diggerProfile.completion_rate}
          responseTimeHours={diggerProfile.response_time_hours}
          isVerified={diggerProfile.verified}
          isInsured={diggerProfile.is_insured}
          isBonded={diggerProfile.is_bonded}
          isLicensed={diggerProfile.is_licensed}
          skills={diggerProfile.skills}
          certifications={diggerProfile.certifications}
          referenceCount={referenceCount}
          city={diggerProfile.city}
          state={diggerProfile.state}
          offersFreeBEstimates={diggerProfile.offers_free_estimates}
        />
        
        <Separator />
        
        {/* Cover letter / Proposal with View more */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <h4 className="font-semibold uppercase tracking-wide text-muted-foreground text-xs">Cover letter</h4>
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {displayProposal}
          </p>
          {proposalTruncated && (
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
        
        <Separator />
        
        {/* Status and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={
              bid.status === 'accepted' ? 'default' :
              bid.status === 'rejected' ? 'destructive' :
              bid.status === 'completed' ? 'default' :
              bid.status === 'withdrawn' ? 'outline' :
              'secondary'
            }>
              {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
            </Badge>
            
            {bid.awarded && (
              <Badge variant="default" className="bg-green-600">
                Hired ✓
              </Badge>
            )}
          </div>
          
          {/* Action Buttons (passed as children for flexibility) */}
          <div className="flex gap-2">
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
