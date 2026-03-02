import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Building2, Pencil, Plus, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface DiggerExperience {
  id: string;
  company_name: string;
  role_title: string;
  employment_type: string | null;
  location: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  "contract": "Contract",
  "freelance": "Freelance",
  "internship": "Internship",
  "self-employed": "Self-employed",
};

function formatPeriod(start: string | null, end: string | null, isCurrent: boolean): string {
  if (!start) return "";
  const startStr = format(new Date(start), "MMM yyyy");
  if (isCurrent || !end) return `${startStr} – Present`;
  return `${startStr} – ${format(new Date(end), "MMM yyyy")}`;
}

interface ExperienceSectionProps {
  experiences: DiggerExperience[];
  isOwnProfile?: boolean;
  onEdit?: () => void;
  /** When set, owner can edit a specific item; called with that experience (e.g. open modal focused on it) */
  onEditItem?: (exp: DiggerExperience) => void;
  className?: string;
}

export const ExperienceSection = ({
  experiences,
  isOwnProfile,
  onEdit,
  onEditItem,
  className,
}: ExperienceSectionProps) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Briefcase className="h-5 w-5 text-primary" />
            Experience
            {experiences.length > 0 && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 ml-auto text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {experiences.length} {experiences.length === 1 ? "role" : "roles"}
              </Badge>
            )}
          </CardTitle>
          {isOwnProfile && (
            experiences.length > 0 ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit Experience">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Add experience">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Work history and roles so Giggers can see your real experience.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {experiences.length > 0 ? (
          <div className="space-y-4">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className={cn(
                  "p-4 rounded-lg border bg-accent/20 hover:bg-accent/30 transition-colors overflow-hidden min-w-0",
                  isOwnProfile && onEditItem && "group"
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{exp.role_title}</p>
                    <p className="text-sm text-muted-foreground">{exp.company_name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatPeriod(exp.start_date, exp.end_date, exp.is_current)}
                      </span>
                      {exp.employment_type && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {EMPLOYMENT_LABELS[exp.employment_type] ?? exp.employment_type}
                        </Badge>
                      )}
                      {exp.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {exp.location}
                        </span>
                      )}
                    </div>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                        {exp.description}
                      </p>
                    )}
                  </div>
                  {isOwnProfile && (onEditItem || onEdit) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-70 group-hover:opacity-100"
                      onClick={() => (onEditItem ? onEditItem(exp) : onEdit?.())}
                      aria-label={`Edit ${exp.role_title} at ${exp.company_name}`}
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-6 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No experience added yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your work history (company, role, period) so Giggers can trust your experience.
            </p>
            {isOwnProfile && onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs text-muted-foreground hover:text-foreground h-8">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
