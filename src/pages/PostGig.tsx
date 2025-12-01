import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Briefcase, ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";
import { DynamicIntakeForm } from "@/components/DynamicIntakeForm";
import { geocodeAddress } from "@/utils/geocoding";

const PostGig = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detectingCategory, setDetectingCategory] = useState(false);
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  
  // Step 1 data
  const [professionDescription, setProfessionDescription] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Step 2 data
  const [detectedCategory, setDetectedCategory] = useState<{id: string, name: string, parentName: string} | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [serviceStart, setServiceStart] = useState("");
  const [duration, setDuration] = useState("");
  const [hourlyBasis, setHourlyBasis] = useState("");
  const [intakeResponses, setIntakeResponses] = useState<Record<string, any>>({});
  
  // Step 3 data
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to post a gig");
      navigate("/register");
      return;
    }
  };

  const handleStep1Submit = async () => {
    if (!professionDescription.trim() || !zipcode.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setDetectingCategory(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-categorize-gig", {
        body: {
          title: professionDescription,
          description: professionDescription,
        },
      });

      if (error) throw error;

      if (data.category_id) {
        setDetectedCategory({
          id: data.category_id,
          name: data.category_name,
          parentName: data.parent_category
        });
        toast.success(`Detected: ${data.parent_category} → ${data.category_name}`);
        setCurrentStep(2);
      } else {
        toast.error("Could not detect profession category. Please try describing it differently.");
      }
    } catch (error: any) {
      console.error("Category detection error:", error);
      toast.error("Failed to analyze profession. Please try again.");
    } finally {
      setDetectingCategory(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!projectTitle.trim() || !detailedDescription.trim()) {
      toast.error("Please fill in project title and description");
      return;
    }

    setGeneratingKeywords(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-keywords-from-description", {
        body: {
          description: detailedDescription,
        },
      });

      if (error) throw error;

      if (data.keywords && data.keywords.length > 0) {
        setSuggestedKeywords(data.keywords);
        setSelectedKeywords(data.keywords); // Auto-select all suggested keywords
        toast.success(`Generated ${data.keywords.length} keyword suggestions`);
        setCurrentStep(3);
      } else {
        toast.info("No keyword suggestions. You can add custom keywords.");
        setCurrentStep(3);
      }
    } catch (error: any) {
      console.error("Keyword generation error:", error);
      toast.error("Failed to generate keywords. You can add them manually.");
      setCurrentStep(3);
    } finally {
      setGeneratingKeywords(false);
    }
  };

  const handleAddCustomKeyword = () => {
    const trimmed = customKeyword.trim();
    if (trimmed && !selectedKeywords.includes(trimmed)) {
      setSelectedKeywords([...selectedKeywords, trimmed]);
      setCustomKeyword("");
      toast.success("Keyword added");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
  };


  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please sign in again.");
        navigate("/register");
        return;
      }

      // Geocode location
      let locationLat: number | undefined;
      let locationLng: number | undefined;
      
      if (zipcode) {
        const geocodeResult = await geocodeAddress(zipcode);
        if (geocodeResult) {
          locationLat = geocodeResult.latitude;
          locationLng = geocodeResult.longitude;
        }
      }

      // Create gig
      const { data: gigData, error: gigError } = await supabase
        .from("gigs")
        .insert({
          consumer_id: session.user.id,
          title: projectTitle,
          description: detailedDescription,
          location: zipcode,
          location_lat: locationLat,
          location_lng: locationLng,
          timeline: `${serviceStart} - ${duration}`,
          budget_min: budgetMin ? parseFloat(budgetMin.replace(/[^0-9.]/g, '')) : undefined,
          budget_max: budgetMax ? parseFloat(budgetMax.replace(/[^0-9.]/g, '')) : undefined,
          category_id: detectedCategory?.id,
          consumer_phone: phone,
          consumer_email: email,
          status: "open",
        })
        .select()
        .single();

      if (gigError) throw gigError;

      // Save intake responses
      if (Object.keys(intakeResponses).length > 0 && detectedCategory) {
        const { data: template } = await supabase
          .from('intake_form_templates')
          .select('id')
          .eq('industry_name', detectedCategory.name)
          .eq('is_active', true)
          .single();

        if (template) {
          const responseInserts = Object.entries(intakeResponses).map(([questionId, answer]) => ({
            gig_id: gigData.id,
            question_id: questionId,
            answer_text: typeof answer === 'string' ? answer : null,
            answer_options: typeof answer === 'object' ? answer : null,
          }));

          await supabase.from('intake_form_responses').insert(responseInserts);
        }
      }

      // Match diggers
      toast.info("Matching with professionals...");
      try {
        const { data: matchData } = await supabase.functions.invoke("match-diggers-semantic", {
          body: {
            gig_title: projectTitle,
            gig_description: detailedDescription,
            gig_category: detectedCategory?.name || "",
          },
        });

        if (matchData?.matches && matchData.matches.length > 0) {
          for (const match of matchData.matches) {
            await supabase.rpc('create_notification', {
              p_user_id: match.user_id,
              p_title: 'New Gig Match',
              p_message: `${match.business_name}, we found a gig that matches your expertise! "${projectTitle}"`,
              p_type: 'new_gig',
              p_link: `/gig/${gigData.id}`,
              p_metadata: {
                gig_id: gigData.id,
                confidence: match.confidence,
              }
            });
          }
        }
      } catch (matchError) {
        console.error("Error matching diggers:", matchError);
      }

      toast.success("Gig posted successfully!");
      navigate("/");
    } catch (error: any) {
      console.error("Error posting gig:", error);
      toast.error("Failed to post gig. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string): string => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    if (!numericValue) return '';
    const number = parseFloat(numericValue);
    if (isNaN(number)) return '';
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleBudgetChange = (field: 'min' | 'max', value: string) => {
    const formatted = formatCurrency(value);
    if (field === 'min') setBudgetMin(formatted);
    else setBudgetMax(formatted);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Post a Gig - Find Qualified Service Professionals"
        description="Post your project and connect with skilled service professionals. Get competitive bids from verified contractors, freelancers, and service providers."
        keywords="post project, hire contractor, find professional, post job, get quotes"
      />
      <Navigation showBackButton backLabel="Back to Home" />

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl">Post a Gig</CardTitle>
                <CardDescription className="text-base mt-1">
                  Step {currentStep} of 3
                </CardDescription>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    step <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent>
            {/* STEP 1: Basic Info & Contact */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="profession">What type of professional are you looking for? *</Label>
                  <Textarea
                    id="profession"
                    placeholder="Describe the type of professional you need (e.g., 'I need someone to refinance my mortgage', 'Looking for an electrician to rewire my kitchen')"
                    value={professionDescription}
                    onChange={(e) => setProfessionDescription(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipcode">Zipcode *</Label>
                  <Input
                    id="zipcode"
                    placeholder="Enter your zipcode"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <Button
                  onClick={handleStep1Submit}
                  disabled={detectingCategory}
                  className="w-full"
                  size="lg"
                >
                  {detectingCategory ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Next Step
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* STEP 2: Project Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {detectedCategory && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI Detected
                      </Badge>
                      <span className="text-sm font-medium">
                        {detectedCategory.parentName} → {detectedCategory.name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief title for your project"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    required
                  />
                </div>

                {detectedCategory && (
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium mb-4">Industry-Specific Questions</h3>
                    <DynamicIntakeForm
                      industryName={detectedCategory.name}
                      onResponsesChange={setIntakeResponses}
                      initialResponses={intakeResponses}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your project in detail so we can find the best professionals"
                    value={detailedDescription}
                    onChange={(e) => setDetailedDescription(e.target.value)}
                    rows={6}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budgetMin">Min Budget ($) <span className="text-muted-foreground text-sm">(Optional)</span></Label>
                    <Input
                      id="budgetMin"
                      placeholder="5,000"
                      value={budgetMin}
                      onChange={(e) => handleBudgetChange('min', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetMax">Max Budget ($) <span className="text-muted-foreground text-sm">(Optional)</span></Label>
                    <Input
                      id="budgetMax"
                      placeholder="10,000"
                      value={budgetMax}
                      onChange={(e) => handleBudgetChange('max', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceStart">When would you like services to start?</Label>
                  <Select value={serviceStart} onValueChange={setServiceStart}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">ASAP</SelectItem>
                      <SelectItem value="1week">Within 1 week</SelectItem>
                      <SelectItem value="2weeks">Within 2 weeks</SelectItem>
                      <SelectItem value="1month">Within 1 month</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Expected Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onetime">One-time job</SelectItem>
                      <SelectItem value="1-2weeks">1-2 weeks</SelectItem>
                      <SelectItem value="1month">1 month</SelectItem>
                      <SelectItem value="2-3months">2-3 months</SelectItem>
                      <SelectItem value="3+months">3+ months</SelectItem>
                      <SelectItem value="ongoing">Ongoing/Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Will you consider hiring on an hourly basis?</Label>
                  <RadioGroup value={hourlyBasis} onValueChange={setHourlyBasis}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="hourly-yes" />
                      <Label htmlFor="hourly-yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="hourly-no" />
                      <Label htmlFor="hourly-no" className="font-normal">No</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="either" id="hourly-either" />
                      <Label htmlFor="hourly-either" className="font-normal">Either</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleStep2Submit}
                    disabled={generatingKeywords}
                    className="flex-1"
                  >
                    {generatingKeywords ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                        Generating Keywords...
                      </>
                    ) : (
                      <>
                        Next Step
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Keywords & Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI-Suggested Keywords</h3>
                  {suggestedKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {suggestedKeywords.map((keyword) => (
                        <Badge
                          key={keyword}
                          variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (selectedKeywords.includes(keyword)) {
                              handleRemoveKeyword(keyword);
                            } else {
                              setSelectedKeywords([...selectedKeywords, keyword]);
                            }
                          }}
                        >
                          {selectedKeywords.includes(keyword) && (
                            <Check className="mr-1 h-3 w-3" />
                          )}
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">
                      No keyword suggestions generated. Add your own below.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customKeyword">Add Custom Keyword</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customKeyword"
                      placeholder="Enter a keyword"
                      value={customKeyword}
                      onChange={(e) => setCustomKeyword(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomKeyword();
                        }
                      }}
                    />
                    <Button onClick={handleAddCustomKeyword} variant="secondary">
                      Add
                    </Button>
                  </div>
                </div>

                {selectedKeywords.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2">Selected Keywords ({selectedKeywords.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedKeywords.map((keyword) => (
                        <Badge
                          key={keyword}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleRemoveKeyword(keyword)}
                        >
                          {keyword} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="flex-1"
                    size="lg"
                  >
                    {loading ? "Posting..." : "Post Gig"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostGig;
