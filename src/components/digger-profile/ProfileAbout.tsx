import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Tag, Globe, ExternalLink } from "lucide-react";

interface ProfileAboutProps {
  bio?: string | null;
  skills?: string[] | null;
  categories?: { name: string; description?: string | null }[];
  portfolioUrl?: string | null;
  offersFreEstimates?: boolean | null;
}

export const ProfileAbout = ({
  bio,
  skills,
  categories,
  portfolioUrl,
  offersFreEstimates,
}: ProfileAboutProps) => {
  const hasCategories = categories && categories.length > 0;
  const hasSkills = skills && skills.length > 0;

  return (
    <div className="space-y-6">
      {/* Bio Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bio ? (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
          ) : (
            <p className="text-muted-foreground italic">No bio provided yet.</p>
          )}
          
          {offersFreEstimates && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-3 py-2 rounded-lg text-sm font-medium">
              ✓ Offers Free Estimates
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills & Expertise */}
      {(hasCategories || hasSkills) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-primary" />
              Skills & Expertise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasCategories && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Service Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat, idx) => (
                    <Badge 
                      key={idx} 
                      variant="default"
                      className="px-3 py-1.5 text-sm"
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {hasSkills && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Additional Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary"
                      className="px-3 py-1.5 text-sm"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Portfolio Link */}
      {portfolioUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a 
              href={portfolioUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              View External Portfolio
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
