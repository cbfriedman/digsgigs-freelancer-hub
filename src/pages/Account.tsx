import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/layout/PageLayout";

export default function Account() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/register");
      return;
    }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (!error && data?.avatar_url) setAvatarUrl(data.avatar_url);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (url: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(url);
      toast({
        title: "Profile photo updated",
        description: "Your photo will appear in messages and across the site.",
      });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save photo.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Update your profile photo. It will appear in messages and anywhere your account is shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
            ) : (
              <ProfilePhotoUpload
                currentPhotoUrl={avatarUrl ?? undefined}
                onPhotoChange={handlePhotoChange}
              />
            )}
            <div className="text-sm text-muted-foreground border-t pt-4">
              <p>Signed in as <strong className="text-foreground">{user.email}</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
