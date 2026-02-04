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
}

export const ReferencesSection = ({ references }: ReferencesSectionProps) => {
  if (!references || references.length === 0) return null;

  const verifiedCount = references.filter(r => r.is_verified).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Client References
          {verifiedCount > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ml-auto">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {verifiedCount} Verified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {references.map((ref) => (
            <div 
              key={ref.id} 
              className="relative p-4 rounded-lg border bg-accent/20 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Quote className="h-5 w-5 text-primary/50 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{ref.reference_name}</span>
                    {ref.is_verified && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Verified
                      </Badge>
                    )}
                  </div>
                  {ref.project_description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
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
