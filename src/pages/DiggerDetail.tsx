import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Star, DollarSign, Briefcase, Globe, Mail } from "lucide-react";

interface Reference {
  id: string;
  reference_name: string;
  reference_email: string;
  reference_phone: string | null;
  project_description: string | null;
  is_verified: boolean;
}

interface Digger {
  id: string;
  user_id: string;
  profession: string;
  bio: string | null;
  hourly_rate: number | null;
  years_experience: number | null;
  average_rating: number;
  total_ratings: number;
  profile_image_url: string | null;
  portfolio_url: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
  digger_categories: {
    categories: {
      name: string;
      description: string | null;
    };
  }[];
}

const DiggerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [digger, setDigger] = useState<Digger | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user || null);

    const { data: diggerData, error: diggerError } = await supabase
      .from("digger_profiles")
      .select(`
        *,
        profiles!digger_profiles_user_id_fkey (full_name, email),
        digger_categories (
          categories (name, description)
        )
      `)
      .eq("id", id)
      .single();

    if (diggerError || !diggerData) {
      toast.error("Digger not found");
      navigate("/browse-diggers");
      return;
    }

    setDigger(diggerData);

    const { data: referencesData } = await supabase
      .from("references")
      .select("*")
      .eq("digger_id", id);

    setReferences(referencesData || []);
    setLoading(false);
  };

  const handleContactDigger = async () => {
    if (!currentUser) {
      toast.error("Please sign in to contact this digger");
      navigate("/auth");
      return;
    }

    if (!digger) return;

    toast.success("Contact information will be available after purchasing this lead");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "DG";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <h1 
              className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate("/")}
            >
              digsandgiggs
            </h1>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!digger) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgiggs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/browse-diggers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Browse
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-start gap-6 mb-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={digger.profile_image_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {getInitials(digger.profiles?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">
                      {digger.profiles?.full_name || "Anonymous"}
                    </h1>
                    <p className="text-xl text-muted-foreground mb-4">{digger.profession}</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-accent text-accent" />
                        <span className="font-semibold text-lg">{digger.average_rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({digger.total_ratings} reviews)</span>
                      </div>
                      {digger.hourly_rate && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">${digger.hourly_rate}/hr</span>
                        </div>
                      )}
                      {digger.years_experience && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                          <span>{digger.years_experience} years experience</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {digger.bio && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">About</h2>
                      <p className="text-muted-foreground whitespace-pre-wrap">{digger.bio}</p>
                    </div>
                  </>
                )}

                {digger.digger_categories.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Skills & Expertise</h2>
                      <div className="flex flex-wrap gap-2">
                        {digger.digger_categories.map((dc, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                            {dc.categories.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {digger.portfolio_url && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Portfolio</h2>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span className="blur-sm select-none">{digger.portfolio_url}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Portfolio available after posting a gig</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {references.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Client References</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {references.map((ref) => (
                    <div key={ref.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{ref.reference_name}</h3>
                          <p className="text-sm text-muted-foreground">Contact hidden for privacy</p>
                        </div>
                        {ref.is_verified && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                            Verified
                          </Badge>
                        )}
                      </div>
                      {ref.project_description && (
                        <p className="text-sm text-muted-foreground mt-2">{ref.project_description}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <Button 
                  className="w-full mb-4" 
                  size="lg"
                  onClick={() => navigate("/post-gig")}
                >
                  Post a Gig to Connect
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Post your project and this digger can contact you by purchasing your lead
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiggerDetail;