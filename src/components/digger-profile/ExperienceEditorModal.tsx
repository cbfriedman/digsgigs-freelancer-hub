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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Building2, ArrowLeft, Pencil } from "lucide-react";
import type { DiggerExperience } from "./ExperienceSection";

const EMPLOYMENT_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
  { value: "self-employed", label: "Self-employed" },
];

interface ExperienceEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diggerProfileId: string;
  experiences: DiggerExperience[];
  onSaved: () => void;
  scrollToExperienceId?: string | null;
}

interface ExpForm {
  id?: string;
  company_name: string;
  role_title: string;
  employment_type: string;
  location: string;
  description: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const emptyForm: ExpForm = {
  company_name: "",
  role_title: "",
  employment_type: "",
  location: "",
  description: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export const ExperienceEditorModal = ({
  open,
  onOpenChange,
  diggerProfileId,
  experiences,
  onSaved,
  scrollToExperienceId,
}: ExperienceEditorModalProps) => {
  const [items, setItems] = useState<ExpForm[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<ExpForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(
        experiences.length > 0
          ? experiences.map((e) => ({
              id: e.id,
              company_name: e.company_name,
              role_title: e.role_title,
              employment_type: e.employment_type || "",
              location: e.location || "",
              description: e.description || "",
              start_date: e.start_date ? e.start_date.slice(0, 10) : "",
              end_date: e.end_date ? e.end_date.slice(0, 10) : "",
              is_current: e.is_current,
            }))
          : []
      );
      if (scrollToExperienceId) {
        const exp = experiences.find((e) => e.id === scrollToExperienceId);
        if (exp) {
          setDraft({
            id: exp.id,
            company_name: exp.company_name,
            role_title: exp.role_title,
            employment_type: exp.employment_type || "",
            location: exp.location || "",
            description: exp.description || "",
            start_date: exp.start_date ? exp.start_date.slice(0, 10) : "",
            end_date: exp.end_date ? exp.end_date.slice(0, 10) : "",
            is_current: exp.is_current,
          });
          setEditingId(exp.id);
        } else {
          setEditingId(null);
        }
      } else {
        setEditingId(null);
      }
    }
  }, [open, experiences, scrollToExperienceId]);

  const startAdd = () => {
    setDraft({ ...emptyForm });
    setEditingId("new");
  };

  const startEdit = (item: ExpForm) => {
    setDraft({ ...item });
    setEditingId(item.id ?? "new");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const removeItem = (id: string) => {
    if (!window.confirm("Remove this experience? You can add it again later.")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
    toast.success("Removed. Click Save experience to apply.");
  };

  const updateDraft = (field: keyof ExpForm, value: string | boolean | undefined) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveDraftAsItem = () => {
    if (!draft.company_name.trim() || !draft.role_title.trim()) {
      toast.error("Company and role are required");
      return;
    }
    if (editingId === "new" || !draft.id) {
      const newItem: ExpForm = {
        id: `draft-${crypto.randomUUID()}`,
        company_name: draft.company_name.trim(),
        role_title: draft.role_title.trim(),
        employment_type: draft.employment_type || "",
        location: draft.location || "",
        description: draft.description.trim() || "",
        start_date: draft.start_date || "",
        end_date: draft.end_date || "",
        is_current: draft.is_current,
      };
      setItems((prev) => [...prev, newItem]);
      toast.success("Experience added. Click Save experience to apply.");
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === draft.id
            ? {
                ...i,
                company_name: draft.company_name.trim(),
                role_title: draft.role_title.trim(),
                employment_type: draft.employment_type || "",
                location: draft.location || "",
                description: draft.description.trim() || "",
                start_date: draft.start_date || "",
                end_date: draft.end_date || "",
                is_current: draft.is_current,
              }
            : i
        )
      );
      toast.success("Experience updated. Click Save experience to apply.");
    }
    setEditingId(null);
  };

  const handleSave = async () => {
    const valid = items.filter((i) => i.company_name.trim() && i.role_title.trim());
    if (valid.length === 0) {
      toast.error("Add at least one experience with company and role");
      return;
    }
    setSaving(true);
    try {
      const existingIds = new Set(experiences.map((e) => e.id));
      const toDelete = experiences.filter((e) => !valid.some((v) => v.id === e.id));

      for (const id of toDelete.map((e) => e.id)) {
        await supabase.from("digger_experience").delete().eq("id", id);
      }

      for (let i = 0; i < valid.length; i++) {
        const item = valid[i];
        const payload = {
          company_name: item.company_name.trim(),
          role_title: item.role_title.trim(),
          employment_type: item.employment_type.trim() || null,
          location: item.location.trim() || null,
          description: item.description.trim() || null,
          start_date: item.start_date || null,
          end_date: item.is_current ? null : (item.end_date || null),
          is_current: item.is_current,
          sort_order: i,
        };
        if (item.id && !item.id.startsWith("draft-") && existingIds.has(item.id)) {
          await supabase.from("digger_experience").update(payload).eq("id", item.id);
        } else {
          await supabase.from("digger_experience").insert({
            digger_profile_id: diggerProfileId,
            ...payload,
          });
        }
      }
      toast.success("Experience saved");
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save experience");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = editingId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Edit Experience</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6 space-y-4">
          {!isEditing && (
            <>
              <p className="text-sm text-muted-foreground">
                Add work history (company, role, period). Click a card to view and edit, or add a new one.
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
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.role_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.company_name}</p>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" type="button" onClick={() => startEdit(item)} title="View & edit">
                        <Pencil className="h-4 w-4" />
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
                  Add experience
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
                <span className="font-medium">{editingId === "new" ? "New experience" : "Experience details"}</span>
                <span className="w-20" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company / Business name *</Label>
                    <Input
                      value={draft.company_name}
                      onChange={(e) => updateDraft("company_name", e.target.value)}
                      placeholder="e.g. Acme Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role / Job title *</Label>
                    <Input
                      value={draft.role_title}
                      onChange={(e) => updateDraft("role_title", e.target.value)}
                      placeholder="e.g. Senior Developer"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Employment type</Label>
                    <Select
                      value={draft.employment_type || "none"}
                      onValueChange={(v) => updateDraft("employment_type", v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {EMPLOYMENT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={draft.location}
                      onChange={(e) => updateDraft("location", e.target.value)}
                      placeholder="e.g. Remote, New York, USA"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input
                      type="date"
                      value={draft.start_date}
                      onChange={(e) => updateDraft("start_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="exp-current"
                        checked={draft.is_current}
                        onCheckedChange={(checked) => updateDraft("is_current", !!checked)}
                      />
                      <Label htmlFor="exp-current" className="font-normal cursor-pointer">
                        I currently work here
                      </Label>
                    </div>
                    {!draft.is_current && (
                      <Input
                        type="date"
                        value={draft.end_date}
                        onChange={(e) => updateDraft("end_date", e.target.value)}
                        placeholder="End date"
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => updateDraft("description", e.target.value)}
                    placeholder="Key responsibilities, achievements, technologies used..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveDraftAsItem}>Save this experience</Button>
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
              Save experience
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
