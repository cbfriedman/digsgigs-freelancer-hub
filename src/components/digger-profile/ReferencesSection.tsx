import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, Quote } from "lucide-react";

interface Reference {
  id: string;
  reference_name: string;
  project_description: string | null;
  is_verified: boolean;
}

interface ReferencesSectionProps {
  references: Reference[];
  /** Optional class for the wrapper */
  className?: string;
}

export const ReferencesSection = ({ references, className }: ReferencesSectionProps) => {
  if (!references || references.length === 0) return null;

  const verifiedCount = references.filter((r) => r.is_verified).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5 text-primary" />
          Client References
          {verifiedCount > 0 && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:bg-green-900/30 dark:text-green-400 ml-auto text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {verifiedCount} Verified
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-0.5">
          Past clients and Giggers who recommend this professional.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {references.map((ref) => (
            <div
              key={ref.id}
              className="relative p-4 rounded-lg border bg-accent/20 hover:bg-accent/30 transition-colors overflow-hidden min-w-0"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Quote className="h-5 w-5 text-primary/50 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap mb-1 min-w-0">
                    <span className="font-semibold text-foreground truncate">{ref.reference_name}</span>
                    {ref.is_verified && (
                      <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {ref.project_description && (
                    <p className="text-sm text-muted-foreground leading-relaxed break-all">
                      {ref.project_description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
