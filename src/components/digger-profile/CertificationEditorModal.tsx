import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, FileText, Upload, Award, ArrowLeft } from "lucide-react";
import type { DiggerCertification } from "./CertificationsSection";

interface CertificationEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diggerProfileId: string;
  certifications: DiggerCertification[];
  onSaved: () => void;
  scrollToCertificationId?: string | null;
}

interface CertForm {
  id?: string;
  name: string;
  issuer: string;
  credential_id: string;
  verification_url: string;
  issue_date: string;
  expiry_date: string;
  description: string;
  evidence_file?: File | null;
  evidence_path?: string | null;
}

const emptyForm: CertForm = {
  name: "",
  issuer: "",
  credential_id: "",
  verification_url: "",
  issue_date: "",
  expiry_date: "",
  description: "",
  evidence_file: null,
  evidence_path: null,
};

function getEvidenceUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("certification-evidence").getPublicUrl(path);
  return data.publicUrl;
}

function isImagePath(path: string | null | undefined): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return /\.(jpg|jpeg|png|webp)$/.test(lower);
}

function EvidenceThumbnail({ path, className }: { path: string | null | undefined; className?: string }) {
  if (!path) return null;
  const url = getEvidenceUrl(path);
  if (!url) return null;
  const isImage = isImagePath(path);

  if (isImage) {
    return (
      <div className={`h-14 w-14 rounded-lg overflow-hidden border border-border/60 bg-muted/30 shrink-0 flex items-center justify-center ${className ?? ""}`}>
        <img
          src={url}
          alt="Evidence"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  // PDF document thumbnail - platform-styled
  return (
    <div className={`h-14 w-14 rounded-lg border border-border/60 bg-primary/5 flex flex-col items-center justify-center shrink-0 ${className ?? ""}`}>
      <FileText className="h-6 w-6 text-primary" />
      <span className="text-[10px] font-semibold text-primary uppercase tracking-tight">PDF</span>
    </div>
  );
}

export const CertificationEditorModal = ({
  open,
  onOpenChange,
  diggerProfileId,
  certifications,
  onSaved,
  scrollToCertificationId,
}: CertificationEditorModalProps) => {
  const [items, setItems] = useState<CertForm[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<CertForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(
        certifications.length > 0
          ? certifications.map((c) => ({
              id: c.id,
              name: c.name,
              issuer: c.issuer || "",
              credential_id: c.credential_id || "",
              verification_url: c.verification_url || "",
              issue_date: c.issue_date ? c.issue_date.slice(0, 10) : "",
              expiry_date: c.expiry_date ? c.expiry_date.slice(0, 10) : "",
              description: c.description || "",
              evidence_path: c.evidence_path,
            }))
          : []
      );
      if (scrollToCertificationId) {
        const cert = certifications.find((c) => c.id === scrollToCertificationId);
        if (cert) {
          setDraft({
            id: cert.id,
            name: cert.name,
            issuer: cert.issuer || "",
            credential_id: cert.credential_id || "",
            verification_url: cert.verification_url || "",
            issue_date: cert.issue_date ? cert.issue_date.slice(0, 10) : "",
            expiry_date: cert.expiry_date ? cert.expiry_date.slice(0, 10) : "",
            description: cert.description || "",
            evidence_path: cert.evidence_path,
          });
          setEditingId(cert.id);
        } else {
          setEditingId(null);
        }
      } else {
        setEditingId(null);
      }
    }
  }, [open, certifications, scrollToCertificationId]);

  const startAdd = () => {
    setDraft({ ...emptyForm });
    setEditingId("new");
  };

  const startEdit = (item: CertForm) => {
    setDraft({
      ...item,
      evidence_file: null,
    });
    setEditingId(item.id ?? "new");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const removeItem = (id: string) => {
    if (!window.confirm("Remove this certification? You can add it again later.")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
    toast.success("Removed. Click Save certifications to apply.");
  };

  const updateDraft = (field: keyof CertForm, value: string | File | null | undefined) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const uploadEvidence = async (file: File): Promise<string | null> => {
    const path = `${diggerProfileId}/${crypto.randomUUID()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage
      .from("certification-evidence")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) {
      toast.error(error.message || "Failed to upload file");
      return null;
    }
    return path;
  };

  const saveDraftAsItem = async () => {
    if (!draft.name.trim()) {
      toast.error("Certification name is required");
      return;
    }
    let evidencePath = draft.evidence_path;
    if (draft.evidence_file) {
      const path = await uploadEvidence(draft.evidence_file);
      if (path) evidencePath = path;
    }
    if (editingId === "new" || !draft.id) {
      const newItem: CertForm = {
        id: `draft-${crypto.randomUUID()}`,
        name: draft.name.trim(),
        issuer: draft.issuer.trim() || "",
        credential_id: draft.credential_id.trim() || "",
        verification_url: draft.verification_url.trim() || "",
        issue_date: draft.issue_date || "",
        expiry_date: draft.expiry_date || "",
        description: draft.description.trim() || "",
        evidence_path: evidencePath || null,
      };
      setItems((prev) => [...prev, newItem].sort((a, b) => 0));
      toast.success("Certification added. Click Save certifications to apply.");
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === draft.id
            ? {
                ...i,
                name: draft.name.trim(),
                issuer: draft.issuer.trim() || "",
                credential_id: draft.credential_id.trim() || "",
                verification_url: draft.verification_url.trim() || "",
                issue_date: draft.issue_date || "",
                expiry_date: draft.expiry_date || "",
                description: draft.description.trim() || "",
                evidence_path: evidencePath || i.evidence_path,
              }
            : i
        )
      );
      toast.success("Certification updated. Click Save certifications to apply.");
    }
    setEditingId(null);
  };

  const handleSave = async () => {
    const valid = items.filter((i) => i.name.trim());
    if (valid.length === 0) {
      toast.error("Add at least one certification with a name");
      return;
    }
    setSaving(true);
    try {
      const existingIds = new Set(certifications.map((c) => c.id));
      const toDelete = certifications.filter((c) => !valid.some((v) => v.id === c.id));

      for (const id of toDelete.map((c) => c.id)) {
        const cert = certifications.find((c) => c.id === id);
        if (cert?.evidence_path) {
          await supabase.storage.from("certification-evidence").remove([cert.evidence_path]);
        }
        await supabase.from("digger_certifications").delete().eq("id", id);
      }

      for (let i = 0; i < valid.length; i++) {
        const item = valid[i];
        let evidencePath = item.evidence_path;
        if (item.evidence_file) {
          const path = await uploadEvidence(item.evidence_file);
          if (path) evidencePath = path;
        }
        const payload = {
          name: item.name.trim(),
          issuer: item.issuer.trim() || null,
          credential_id: item.credential_id.trim() || null,
          verification_url: item.verification_url.trim() || null,
          evidence_path: evidencePath || null,
          issue_date: item.issue_date || null,
          expiry_date: item.expiry_date || null,
          description: item.description.trim() || null,
          sort_order: i,
        };
        if (item.id && !item.id.startsWith("draft-") && existingIds.has(item.id)) {
          await supabase.from("digger_certifications").update(payload).eq("id", item.id);
        } else {
          await supabase.from("digger_certifications").insert({
            digger_profile_id: diggerProfileId,
            ...payload,
          });
        }
      }
      toast.success("Certifications saved");
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save certifications");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = editingId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Edit Certifications</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6 space-y-4">
          {!isEditing && (
            <>
              <p className="text-sm text-muted-foreground">
                Add certifications with evidence (PDF or image). Click a card to view and edit, or add a new one.
              </p>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => startEdit(item)}
                    onKeyDown={(e) => e.key === "Enter" && startEdit(item)}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer text-left"
                  >
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      {item.issuer && (
                        <p className="text-xs text-muted-foreground truncate">{item.issuer}</p>
                      )}
                    </div>
                    <EvidenceThumbnail path={item.evidence_path} />
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" type="button" onClick={() => startEdit(item)} title="View & edit">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (item.id) removeItem(item.id);
                        }}
                        title="Remove"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full mt-2" onClick={startAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add certification
                </Button>
              </div>
            </>
          )}

          {isEditing && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <Button variant="ghost" size="sm" onClick={cancelEdit} className="gap-1.5 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to list
                </Button>
                <span className="font-medium">{editingId === "new" ? "New certification" : "Certification details"}</span>
                <span className="w-20" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Certification name *</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => updateDraft("name", e.target.value)}
                      placeholder="e.g. AWS Solutions Architect"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuer</Label>
                    <Input
                      value={draft.issuer}
                      onChange={(e) => updateDraft("issuer", e.target.value)}
                      placeholder="e.g. Amazon Web Services"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Credential ID</Label>
                    <Input
                      value={draft.credential_id}
                      onChange={(e) => updateDraft("credential_id", e.target.value)}
                      placeholder="For online verification"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verification URL</Label>
                    <Input
                      value={draft.verification_url}
                      onChange={(e) => updateDraft("verification_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Issue date</Label>
                    <Input
                      type="date"
                      value={draft.issue_date}
                      onChange={(e) => updateDraft("issue_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={draft.expiry_date}
                      onChange={(e) => updateDraft("expiry_date", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Evidence (PDF or image) *</Label>
                  <p className="text-xs text-muted-foreground">Upload proof (certificate PDF, screenshot, etc.)</p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) updateDraft("evidence_file", file);
                      }}
                      className="max-w-xs"
                    />
                    {draft.evidence_path && !draft.evidence_file && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Evidence on file
                      </span>
                    )}
                    {draft.evidence_file && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {draft.evidence_file.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => updateDraft("description", e.target.value)}
                    placeholder="Brief notes"
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveDraftAsItem}>Save this certification</Button>
                  <Button variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save certifications
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
