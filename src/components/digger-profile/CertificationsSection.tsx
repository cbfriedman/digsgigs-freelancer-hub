import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, FileText, ExternalLink, ShieldCheck, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface DiggerCertification {
  id: string;
  name: string;
  issuer: string | null;
  credential_id: string | null;
  verification_url: string | null;
  evidence_path: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  description: string | null;
}

interface CertificationsSectionProps {
  certifications: DiggerCertification[];
  isOwnProfile?: boolean;
  onEdit?: () => void;
  /** When set, owner can edit a specific certification; called with that cert */
  onEditItem?: (cert: DiggerCertification) => void;
  className?: string;
}

function getEvidenceUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("certification-evidence").getPublicUrl(path);
  return data.publicUrl;
}

function getEvidenceLabel(path: string | null): string {
  if (!path) return "View evidence";
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "View PDF";
  if (lower.match(/\.(jpg|jpeg|png|webp)$/)) return "View image";
  return "View evidence";
}

export const CertificationsSection = ({
  certifications,
  isOwnProfile,
  onEdit,
  onEditItem,
  className,
}: CertificationsSectionProps) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Award className="h-5 w-5 text-primary" />
            Certifications
            {certifications.length > 0 && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:bg-green-900/30 dark:text-green-400 ml-auto text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Evidence on file
              </Badge>
            )}
          </CardTitle>
          {isOwnProfile && (
            certifications.length > 0 ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit Certifications">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Add certification">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Uploaded certifications with proof (PDF, images). Giggers can review evidence to verify.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {certifications.length > 0 ? (
          <div className="space-y-4">
            {certifications.map((cert) => {
              const evidenceUrl = getEvidenceUrl(cert.evidence_path);
              return (
                <div
                  key={cert.id}
                  className={cn(
                    "p-4 rounded-lg border bg-accent/20 hover:bg-accent/30 transition-colors overflow-hidden min-w-0",
                    isOwnProfile && (onEditItem || onEdit) && "group"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{cert.name}</p>
                      {cert.issuer && (
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {cert.issue_date && (
                          <span>Issued: {format(new Date(cert.issue_date), "MMM yyyy")}</span>
                        )}
                        {cert.expiry_date && (
                          <span>Expires: {format(new Date(cert.expiry_date), "MMM yyyy")}</span>
                        )}
                        {cert.credential_id && (
                          <span>ID: {cert.credential_id}</span>
                        )}
                      </div>
                      {cert.description && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{cert.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      {isOwnProfile && (onEditItem || onEdit) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-70 group-hover:opacity-100"
                          onClick={() => (onEditItem ? onEditItem(cert) : onEdit?.())}
                          aria-label={`Edit ${cert.name}`}
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {evidenceUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {getEvidenceLabel(cert.evidence_path)}
                          </a>
                        </Button>
                      )}
                      {cert.verification_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={cert.verification_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Verify online
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-6 text-center">
            <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No certifications yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add certifications with proof (PDF or image) so Giggers can verify your credentials.
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
