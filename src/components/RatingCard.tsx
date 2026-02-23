import { Star, User, BadgeCheck, MapPin, Briefcase, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { getCountryCodeForDisplay, findCountryByNameOrCode } from "@/config/regionOptions";

interface RatingCardProps {
  rating: {
    id: string;
    rating: number;
    review_text: string | null;
    digger_response: string | null;
    responded_at: string | null;
    created_at: string;
    gig_id?: string | null;
    profiles: {
      full_name: string | null;
      avatar_url?: string | null;
      country?: string | null;
    };
    gigs?: {
      id: string;
      title: string | null;
      location?: string | null;
      category_id?: string | null;
      categories?: { name: string | null } | null;
    } | null;
    projectTotalBudget?: number | null;
  };
}

export const RatingCard = ({ rating }: RatingCardProps) => {
  const clientName = rating.profiles?.full_name?.trim() || "Client";
  const clientAvatar = rating.profiles?.avatar_url?.trim() || null;
  const clientCountry = rating.profiles?.country?.trim() || null;
  const projectTitle = rating.gigs?.title?.trim() || null;
  const projectLocation = rating.gigs?.location?.trim() || null;
  const categoryName = rating.gigs?.categories?.name?.trim() || null;
  const skills = categoryName ? [categoryName] : [];
  const budget = rating.projectTotalBudget != null && rating.projectTotalBudget > 0 ? rating.projectTotalBudget : null;
  const countryCode = getCountryCodeForDisplay(clientCountry, projectLocation ?? undefined);
  const clientCountryName = clientCountry ? (findCountryByNameOrCode(clientCountry)?.name ?? clientCountry) : null;
  const hasVerifiedProject = !!rating.gig_id;

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Client info: photo, name, verified, location, date */}
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-12 w-12 shrink-0 border-2 border-background shadow">
              <AvatarImage src={clientAvatar || undefined} alt={clientName} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {clientName.slice(0, 2).toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground truncate">{clientName}</p>
                {hasVerifiedProject && (
                  <Badge variant="secondary" className="gap-1 text-xs font-normal shrink-0">
                    <BadgeCheck className="h-3 w-3 text-primary" />
                    Verified project
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {(clientCountryName || projectLocation) && (
                  <span className="flex items-center gap-1 truncate">
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
                    <span className="truncate">
                      {clientCountryName ?? projectLocation}
                      {clientCountryName && projectLocation && projectLocation !== clientCountryName ? ` · ${projectLocation}` : ""}
                    </span>
                  </span>
                )}
                <span className="shrink-0">{format(new Date(rating.created_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          {/* Star rating */}
          <div className="flex items-center gap-1.5 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < rating.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                }`}
              />
            ))}
            <span className="text-sm font-medium text-foreground ml-0.5">{rating.rating}/5</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Project name, skills, budget */}
        {(projectTitle || skills.length > 0 || budget != null) && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            {projectTitle && (
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project</p>
                  {rating.gig_id && rating.gigs?.id ? (
                    <Link
                      to={`/gig/${rating.gigs.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 truncate block"
                    >
                      {projectTitle}
                    </Link>
                  ) : (
                    <p className="font-medium text-foreground">{projectTitle}</p>
                  )}
                </div>
              </div>
            )}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal rounded-md">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {budget != null && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <DollarSign className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid total budget</p>
                  <p className="text-lg font-bold text-primary">${Number(budget).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review comment */}
        {rating.review_text && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Review</p>
            <p className="text-sm text-foreground leading-relaxed">{rating.review_text}</p>
          </div>
        )}

        {/* Digger response */}
        {rating.digger_response && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium text-foreground mb-1">Response from professional</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{rating.digger_response}</p>
            {rating.responded_at && (
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(rating.responded_at), "MMM d, yyyy")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
