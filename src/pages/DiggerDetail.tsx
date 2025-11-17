import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Star, DollarSign, Briefcase, Globe, Mail, MessageSquare } from "lucide-react";
import { RatingsList } from "@/components/RatingsList";
import { Navigation } from "@/components/Navigation";

interface Reference {
  id: string;
  reference_name: string;
  reference_email: string;
  reference_phone: string | null;
  project_description: string | null;
  is_verified: boolean;
}

interface ReferenceRequest {
  id: string;
  status: string;
}

interface Digger {
  id: string;
  user_id: string;
  handle: string | null;
  profession: string;
  bio: string | null;
  hourly_rate: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  years_experience: number | null;
  average_rating: number;
  total_ratings: number;
  profile_image_url: string | null;
  portfolio_url: string | null;
  work_photos: string[] | null;
  completion_rate: number | null;
  response_time_hours: number | null;
  is_insured: boolean;
  is_bonded: boolean;
  is_licensed: string;
  sic_code: string | null;
  naics_code: string | null;
  custom_occupation_title: string | null;
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
  const [referenceRequests, setReferenceRequests] = useState<Record<string, ReferenceRequest>>({});
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

    // Load reference contact requests if user is logged in
    if (session?.user) {
      const { data: requestsData } = await supabase
        .from("reference_contact_requests")
        .select("id, reference_id, status")
        .eq("consumer_id", session.user.id);
      
      if (requestsData) {
        const requestsMap: Record<string, ReferenceRequest> = {};
        requestsData.forEach((req: any) => {
          requestsMap[req.reference_id] = { id: req.id, status: req.status };
        });
        setReferenceRequests(requestsMap);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error("Please sign in to send messages");
      navigate("/auth");
      return;
    }

    if (!digger) return;

    try {
      // Check if conversation already exists with this digger
      const { data: existingConv } = await supabase
        .from("conversations" as any)
        .select("id")
        .eq("digger_id", digger.id)
        .eq("consumer_id", currentUser.id)
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages?conversation=${(existingConv as any).id}`);
        return;
      }

      // Create new conversation without a specific gig
      const { data: newConv, error } = await supabase
        .from("conversations" as any)
        .insert({
          digger_id: digger.id,
          consumer_id: currentUser.id,
          gig_id: null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("Conversation started!");
      navigate(`/messages?conversation=${(newConv as any).id}`);
    } catch (error: any) {
      toast.error("Error starting conversation: " + error.message);
    }
  };

  const handleRequestReferenceContact = async (referenceId: string) => {
    if (!currentUser) {
      toast.error("Please sign in to request reference contact");
      navigate("/auth");
      return;
    }

    if (!digger) return;

    try {
      const { error } = await supabase
        .from("reference_contact_requests")
        .insert({
          reference_id: referenceId,
          consumer_id: currentUser.id,
          digger_id: digger.id,
        });

      if (error) throw error;

      toast.success("Request sent! The digger will be notified.");
      
      // Reload data to update request status
      loadData();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("You've already requested this reference contact");
      } else {
        toast.error("Failed to send request");
      }
    }
  };

  const getInitials = (handle: string | null) => {
    if (!handle) return "DG";
    return handle.slice(0, 2).toUpperCase();
  };

  const formatHourlyRate = () => {
    if (digger?.hourly_rate_min && digger?.hourly_rate_max) {
      return `$${digger.hourly_rate_min}-${digger.hourly_rate_max}/hr`;
    }
    if (digger?.hourly_rate) {
      return `$${digger.hourly_rate}/hr`;
    }
    return null;
  };

  const getDisplayProfession = () => {
    if (digger?.custom_occupation_title) {
      return digger.custom_occupation_title;
    }
    return digger?.profession || "";
  };

  const getOccupationBadge = () => {
    if (digger?.sic_code) {
      return { label: "SIC Code", value: digger.sic_code };
    }
    if (digger?.naics_code) {
      return { label: "NAICS Code", value: digger.naics_code };
    }
    return null;
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
              digsandgigs
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
            digsandgigs
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
                      {getInitials(digger.handle)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">
                      @{digger.handle || "anonymous"}
                    </h1>
                    <div className="mb-4">
                      <p className="text-xl text-muted-foreground">{getDisplayProfession()}</p>
                      {getOccupationBadge() && (
                        <Badge variant="outline" className="mt-2">
                          {getOccupationBadge()?.label}: {getOccupationBadge()?.value}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-accent text-accent" />
                        <span className="font-semibold text-lg">{digger.average_rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({digger.total_ratings} reviews)</span>
                      </div>
                      {formatHourlyRate() && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">{formatHourlyRate()}</span>
                        </div>
                      )}
                      {digger.years_experience && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                          <span>{digger.years_experience} years experience</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {digger.is_insured && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                          ✓ Insured
                        </Badge>
                      )}
                      {digger.is_bonded && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                          ✓ Bonded
                        </Badge>
                      )}
                      {digger.is_licensed === 'yes' && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                          ✓ Licensed
                        </Badge>
                      )}
                      {digger.is_licensed === 'no' && (
                        <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                          Not Licensed
                        </Badge>
                      )}
                      {digger.completion_rate !== null && (
                        <Badge variant="secondary">
                          {digger.completion_rate}% Completion Rate
                        </Badge>
                      )}
                      {digger.response_time_hours !== null && (
                        <Badge variant="secondary">
                          Responds in {digger.response_time_hours}h
                        </Badge>
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

                {digger.work_photos && digger.work_photos.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Past Work</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {digger.work_photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Work sample ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-border"
                          />
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
                      <a 
                        href={digger.portfolio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Globe className="h-4 w-4" />
                        View Portfolio
                      </a>
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
                  {references.map((ref) => {
                    const request = referenceRequests[ref.id];
                    const canShowContact = request?.status === 'approved';
                    
                    return (
                      <div key={ref.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold">{ref.reference_name}</h3>
                            <p className="text-sm text-muted-foreground italic">Reference verified by platform</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ref.is_verified && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        {ref.project_description && (
                          <p className="text-sm text-muted-foreground mt-2">{ref.project_description}</p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Reviews & Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <RatingsList diggerId={id!} isDigger={currentUser?.id === digger.user_id} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <Button 
                  className="w-full mb-4" 
                  size="lg"
                  onClick={handleSendMessage}
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Send Message
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Start a conversation to discuss your project with this digger
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