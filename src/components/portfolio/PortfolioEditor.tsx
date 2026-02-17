import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Pencil, Trash2, ImagePlus, Loader2, Link2, X, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DiggerPortfolioItem, DiggerPortfolioItemDraft, PortfolioMediaItem } from "@/types/portfolio";

const PORTFOLIO_MEDIA_BUCKET = "portfolio-media";
const ACCEPT_MEDIA = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm";

interface PortfolioEditorProps {
  diggerProfileId: string;
  items: DiggerPortfolioItem[];
  onSave: (items: DiggerPortfolioItemDraft[]) => Promise<void>;
  onCancel?: () => void;
}

export function PortfolioEditor({ diggerProfileId, items: initialItems, onSave, onCancel }: PortfolioEditorProps) {
  const [items, setItems] = useState<DiggerPortfolioItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DiggerPortfolioItemDraft>({
    title: "",
    description: "",
    project_url: "",
    skills: [],
    category: "",
    media: [],
    sort_order: 0,
  });
  const [skillsInput, setSkillsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState("");

  const startAdd = () => {
    setDraft({
      title: "",
      description: "",
      project_url: "",
      skills: [],
      category: "",
      media: [],
      sort_order: items.length,
    });
    setSkillsInput("");
    setEditingId("new");
  };

  const startEdit = (item: DiggerPortfolioItem) => {
    setDraft({
      title: item.title,
      description: item.description || "",
      project_url: item.project_url || "",
      skills: item.skills || [],
      category: item.category || "",
      media: item.media || [],
      sort_order: item.sort_order,
    });
    setSkillsInput((item.skills || []).join(", "));
    setEditingId(item.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const removeItem = (id: string) => {
    if (!window.confirm("Remove this project from your portfolio? You can add it again later.")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
    toast.success("Project removed. Click Save portfolio to apply.");
  };

  const handleUploadMedia = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length === 0) return;
      setUploading(true);
      const added: PortfolioMediaItem[] = [];
      try {
        for (const file of files) {
          const ext = file.name.split(".").pop() || "bin";
          const path = `${diggerProfileId}/${itemId}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from(PORTFOLIO_MEDIA_BUCKET).upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });
          if (error) throw error;
          const { data } = supabase.storage.from(PORTFOLIO_MEDIA_BUCKET).getPublicUrl(path);
          const type = file.type.startsWith("video/") ? "video" : "image";
          added.push({ type, url: data.publicUrl });
        }
        setDraft((prev) => ({
          ...prev,
          media: [...(prev.media || []), ...added],
        }));
        toast.success(added.length === 1 ? "File added" : `${added.length} files added`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [diggerProfileId]
  );

  const addMediaUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const type: "image" | "video" = /\.(mp4|webm|mov)(\?|$)/i.test(trimmed) ? "video" : "image";
    setDraft((prev) => ({
      ...prev,
      media: [...(prev.media || []), { type, url: trimmed }],
    }));
    setMediaUrlInput("");
    toast.success("Link added");
  }, []);

  const removeMedia = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      media: (prev.media || []).filter((_, i) => i !== index),
    }));
  };

  const saveDraftAsItem = () => {
    const title = draft.title.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const newItem: DiggerPortfolioItem = {
      id: editingId === "new" ? `draft-${crypto.randomUUID()}` : editingId!,
      digger_profile_id: diggerProfileId,
      title,
      description: draft.description?.trim() || null,
      project_url: draft.project_url?.trim() || null,
      skills,
      category: draft.category?.trim() || null,
      media: draft.media || [],
      sort_order: draft.sort_order,
    };
    if (editingId === "new") {
      setItems((prev) => [...prev, newItem].sort((a, b) => a.sort_order - b.sort_order));
    } else {
      setItems((prev) => prev.map((i) => (i.id === editingId ? newItem : i)));
    }
    setEditingId(null);
    toast.success(editingId === "new" ? "Project added" : "Project updated");
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const toSave: DiggerPortfolioItemDraft[] = items.map((i) => ({
        id: i.id.startsWith("draft-") ? undefined : i.id,
        digger_profile_id: diggerProfileId,
        title: i.title,
        description: i.description || null,
        project_url: i.project_url || null,
        skills: i.skills || [],
        category: i.category || null,
        media: i.media || [],
        sort_order: i.sort_order,
      }));
      await onSave(toSave);
      if (onCancel) onCancel();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save portfolio");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = editingId !== null;
  const itemIdForUpload = isEditing ? (editingId === "new" ? `new-${crypto.randomUUID()}` : editingId) : "";

  return (
    <div className="space-y-6">
      {/* List view: show only when not editing a single item */}
      {!isEditing && (
        <>
          <p className="text-sm text-muted-foreground">
            Add work samples so Giggers can see your experience. Click a project to view and edit details, or add a new one.
          </p>
          <div className="space-y-2">
            {items.map((item) => {
              const primaryMedia = item.media?.[0];
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => startEdit(item)}
                  onKeyDown={(e) => e.key === "Enter" && startEdit(item)}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer text-left"
                >
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {primaryMedia ? (
                      primaryMedia.type === "video" ? (
                        <video src={primaryMedia.url} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={primaryMedia.url} alt="" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    {item.category && <p className="text-xs text-muted-foreground truncate">{item.category}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)} title="View & edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} title="Remove" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="outline" className="w-full mt-2" onClick={startAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add project
            </Button>
          </div>
        </>
      )}

      {/* Detail view: one item at a time — full form to view and edit */}
      {isEditing && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <Button variant="ghost" size="sm" onClick={cancelEdit} className="gap-1.5 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            <span className="font-medium">{editingId === "new" ? "New project" : "Project details"}</span>
            <span className="w-20" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project title *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., E-commerce redesign for Brand X"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={draft.description || ""}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="What you did, results, and your role..."
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-4 w-4" />
                Project link
              </Label>
              <Input
                type="url"
                value={draft.project_url || ""}
                onChange={(e) => setDraft((p) => ({ ...p, project_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Skills used (comma-separated)</Label>
              <Input
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="e.g., React, Figma, SEO"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={draft.category || ""}
                onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                placeholder="e.g., Web Development, Branding"
              />
            </div>
            <div className="space-y-2">
              <Label>Images or video</Label>
              <p className="text-xs text-muted-foreground">Upload multiple images (incl. GIF) or videos, or paste a link.</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload files"}
                  <input
                    type="file"
                    accept={ACCEPT_MEDIA}
                    multiple
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => itemIdForUpload && handleUploadMedia(e, itemIdForUpload)}
                  />
                </label>
                <div className="flex gap-1">
                  <Input
                    className="flex-1 min-w-0"
                    placeholder="Paste image or video URL"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMediaUrl(mediaUrlInput);
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => addMediaUrl(mediaUrlInput)}>
                    Add link
                  </Button>
                </div>
              </div>
              {(draft.media?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {draft.media.map((m, idx) => (
                    <div key={idx} className="relative group rounded overflow-hidden border w-20 h-20 bg-muted">
                      {m.type === "video" ? (
                        <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveDraftAsItem}>Save this project</Button>
              <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSaveAll} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save portfolio"}
        </Button>
      </div>
    </div>
  );
}
