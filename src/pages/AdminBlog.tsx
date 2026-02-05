import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Loader2, Plus, X, Play, History } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminBlog = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to access the blog admin",
          variant: "destructive",
        });
        navigate("/register");
        return;
      }

      // Check if user is admin (using correct table: user_app_roles)
      const { data: roles, error: rolesError } = await supabase
        .from("user_app_roles")
        .select("app_role")
        .eq("user_id", user.id)
        .eq("app_role", "admin")
        .eq("is_active", true)
        .maybeSingle();

      if (rolesError) {
        console.error("Error checking admin status:", rolesError);
      }

      if (!roles) {
        toast({
          title: "Access denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast({
        title: "Error",
        description: "Failed to verify admin access",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load settings
      const { data: settingsData } = await supabase
        .from("blog_generation_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (settingsData) {
        setSettings(settingsData);
        setTopics(settingsData.topics || []);
      } else {
        // Create default settings
        const { data: newSettings } = await supabase
          .from("blog_generation_settings")
          .insert({
            user_id: user.id,
            topics: [],
            enabled: false,
          })
          .select()
          .single();
        
        setSettings(newSettings);
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name");
      setCategories(categoriesData || []);

      // Load tags
      const { data: tagsData } = await supabase
        .from("blog_tags")
        .select("*")
        .order("name");
      setTags(tagsData || []);

      // Load generation history
      const { data: historyData } = await supabase
        .from("blog_generation_history")
        .select("*, blog_posts(title, slug)")
        .order("generated_at", { ascending: false })
        .limit(10);
      setHistory(historyData || []);

    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("blog_generation_settings")
        .update({
          topics,
          enabled: settings.enabled,
          frequency: settings.frequency,
          target_categories: settings.target_categories,
          target_tags: settings.target_tags,
          tone: settings.tone,
          word_count: settings.word_count,
          include_images: settings.include_images,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const data = await invokeEdgeFunction<{ post?: { title?: string } }>(supabase, "generate-blog-post");

      toast({
        title: "Success",
        description: `Blog post "${data.post?.title}" generated successfully!`,
      });

      loadData(); // Reload to show new post in history
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Failed to generate post",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">AI Blog Generator</h1>
              <p className="text-muted-foreground">
                Automatically generate SEO-optimized blog posts daily
              </p>
            </div>
            <Button onClick={handleGenerateNow} disabled={generating}>
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Generate Now</>
              )}
            </Button>
          </div>

          {/* Main Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
              <CardDescription>
                Configure automatic blog post generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto-Generation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically generate blog posts on schedule
                  </p>
                </div>
                <Switch
                  checked={settings?.enabled || false}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={settings?.frequency || "daily"}
                  onValueChange={(value) =>
                    setSettings({ ...settings, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Blog Topics</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Add topics for AI to write about. The system will randomly select one each time.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., How to hire a plumber"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddTopic()}
                  />
                  <Button onClick={handleAddTopic} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="px-3 py-1">
                      {topic}
                      <button
                        onClick={() => handleRemoveTopic(topic)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={settings?.tone || "professional"}
                    onValueChange={(value) =>
                      setSettings({ ...settings, tone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Word Count</Label>
                  <Input
                    type="number"
                    value={settings?.word_count || 800}
                    onChange={(e) =>
                      setSettings({ ...settings, word_count: parseInt(e.target.value) })
                    }
                    min={300}
                    max={2000}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Generate Featured Images</Label>
                  <p className="text-sm text-muted-foreground">
                    Use AI to create featured images for posts
                  </p>
                </div>
                <Switch
                  checked={settings?.include_images !== false}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, include_images: checked })
                  }
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generation History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Generation History
              </CardTitle>
              <CardDescription>Recent automatically generated posts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead>Post Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No posts generated yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.topic}</TableCell>
                        <TableCell>
                          {item.blog_posts?.title || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === "success" ? "default" : "destructive"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(item.generated_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Cron Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Daily Automation</CardTitle>
              <CardDescription>
                Configure a cron job to run the blog generator daily
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                To enable automatic daily blog generation, you need to set up a cron job in your Supabase project.
                I'll help you with this in the next step.
              </p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">What happens daily:</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>System picks a random topic from your list</li>
                  <li>AI generates SEO-optimized content</li>
                  <li>Featured image is created automatically</li>
                  <li>Post is published to your blog</li>
                  <li>Categories and tags are assigned</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminBlog;
