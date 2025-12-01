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
  const [enhancingDescription, setEnhancingDescription] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [escrowRequested, setEscrowRequested] = useState(false);
  
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
          location: zipcode,
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

  const handleEnhanceDescription = async () => {
    if (!detailedDescription.trim()) {
      toast.error("Please enter a description first");
      return;
    }

    setEnhancingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-gig-description", {
        body: {
          description: detailedDescription,
          title: projectTitle,
          category: detectedCategory?.name || "",
        },
      });

      if (error) throw error;

      if (data.enhancedDescription) {
        setDetailedDescription(data.enhancedDescription);
        toast.success("Description enhanced successfully!");
      }
    } catch (error: any) {
      console.error("Description enhancement error:", error);
      toast.error("Failed to enhance description. Please try again.");
    } finally {
      setEnhancingDescription(false);
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

  const handleShowPreview = () => {
    if (!termsAccepted) {
      toast.error("Please accept the Terms and Conditions to continue");
      return;
    }
    setShowPreview(true);
  };


  const handleFinalSubmit = async () => {
    if (!termsAccepted) {
      toast.error("Please accept the Terms and Conditions to proceed");
      return;
    }

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

      // Create gig with pending confirmation status
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
          confirmation_status: "pending",
          confirmation_sent_at: new Date().toISOString(),
          is_confirmed_lead: false,
          status: "pending_confirmation",
          escrow_requested_by_consumer: escrowRequested,
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

      // Send confirmation email
      toast.info("Sending confirmation email...");
      const { error: emailError } = await supabase.functions.invoke("send-gig-confirmation", {
        body: {
          gigId: gigData.id,
          email: email,
          gigTitle: projectTitle,
          gigDescription: detailedDescription,
          location: zipcode,
          budgetMin: budgetMin ? parseFloat(budgetMin.replace(/[^0-9.]/g, '')) : undefined,
          budgetMax: budgetMax ? parseFloat(budgetMax.replace(/[^0-9.]/g, '')) : undefined,
          keywords: selectedKeywords,
        },
      });

      if (emailError) {
        console.error("Error sending confirmation email:", emailError);
        toast.error("Failed to send confirmation email. Please try again.");
        return;
      }

      toast.success("Confirmation email sent! Please check your inbox to confirm your gig.");
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
                  <Label htmlFor="profession">Describe your gig in detail *</Label>
                  <Textarea
                    id="profession"
                    placeholder="Describe your project or service need in detail (e.g., 'I need help refinancing my mortgage to get a better rate', 'Looking for an electrician to rewire my kitchen and install new outlets')"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnhanceDescription}
                    disabled={enhancingDescription || !detailedDescription.trim()}
                    className="w-full sm:w-auto"
                  >
                    {enhancingDescription ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI Enhance Description
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Let AI make your description more comprehensive and professional
                  </p>
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

                {/* Escrow Protection */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="escrow"
                      checked={escrowRequested}
                      onChange={(e) => setEscrowRequested(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="escrow" className="cursor-pointer font-medium">
                        Request Escrow Protection
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Secure your payment with escrow. Note: This may result in bids that are approximately 8% higher to cover the escrow fee.
                      </p>
                    </div>
                  </div>
                  {escrowRequested && (
                    <div className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 p-3 rounded border border-amber-200 dark:border-amber-800">
                      ⚠️ Diggers typically increase their bid amounts to cover the 8% escrow fee. Expect bids to be approximately 8% higher than without escrow.
                    </div>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="border-t pt-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                          I agree to the{" "}
                          <button
                            type="button"
                            onClick={() => setShowTerms(!showTerms)}
                            className="text-primary underline hover:text-primary/80"
                          >
                            Terms and Conditions
                          </button>
                        </Label>
                      </div>
                    </div>

                    {showTerms && (
                      <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto text-sm space-y-3">
                        <h4 className="font-semibold text-base">Digs and Gigs - Terms and Conditions for Gig Posting</h4>
                        
                        <div>
                          <p className="font-medium">1. Gig Information Accuracy</p>
                          <p className="text-muted-foreground">You confirm that all information provided in your gig posting is accurate, complete, and truthful. Misrepresentation of project details, budget, location, or requirements may result in account suspension.</p>
                        </div>

                        <div>
                          <p className="font-medium">2. Lead Purchase and Contact</p>
                          <p className="text-muted-foreground">By posting this gig, you agree that qualified professionals (Diggers) may purchase your lead at our standard rates. You will be contacted by professionals who have paid to access your project details.</p>
                        </div>

                        <div>
                          <p className="font-medium">3. Payment Obligation</p>
                          <p className="text-muted-foreground">There is no charge to post a gig. However, you are responsible for payment to any professional you choose to hire for services rendered. Digs and Gigs is a lead generation marketplace and does not handle project payments directly.</p>
                        </div>

                        <div>
                          <p className="font-medium">4. Communication Responsibility</p>
                          <p className="text-muted-foreground">You agree to respond to legitimate inquiries from professionals in a timely manner. Failure to communicate or respond may impact your account standing and future gig visibility.</p>
                        </div>

                        <div>
                          <p className="font-medium">5. Professional Vetting</p>
                          <p className="text-muted-foreground">While Digs and Gigs matches you with professionals based on expertise and location, you are responsible for conducting your own due diligence, including verifying licenses, insurance, references, and qualifications before hiring.</p>
                        </div>

                        <div>
                          <p className="font-medium">6. Dispute Resolution</p>
                          <p className="text-muted-foreground">Any disputes between you and a professional must be resolved directly. Digs and Gigs is not liable for project outcomes, quality of work, or financial disputes between parties.</p>
                        </div>

                        <div>
                          <p className="font-medium">7. Gig Modification and Cancellation</p>
                          <p className="text-muted-foreground">Once confirmed and live, your gig can be edited or cancelled at any time. However, professionals who have already purchased your lead will retain access to your contact information.</p>
                        </div>

                        <div>
                          <p className="font-medium">8. Prohibited Content</p>
                          <p className="text-muted-foreground">Gigs must not contain illegal activities, discriminatory language, fraudulent offers, or content that violates our community guidelines. Violation may result in immediate removal and account termination.</p>
                        </div>

                        <div>
                          <p className="font-medium">9. Data Usage</p>
                          <p className="text-muted-foreground">Your gig information will be used to match you with qualified professionals. By posting, you consent to your contact information being shared with professionals who purchase your lead.</p>
                        </div>

                        <div>
                          <p className="font-medium">10. Limitation of Liability</p>
                          <p className="text-muted-foreground">Digs and Gigs provides a marketplace platform only. We are not liable for project outcomes, professional conduct, safety issues, property damage, or any other matters arising from work performed.</p>
                        </div>

                        <p className="text-xs text-muted-foreground pt-3 border-t">
                          By checking the box above, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. Last updated: December 2025.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

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
                    onClick={handleShowPreview}
                    disabled={loading}
                    className="flex-1"
                    size="lg"
                  >
                    Preview Gig
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* PREVIEW: Review before submission */}
            {showPreview && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Review Your Gig</h2>
                  <p className="text-muted-foreground">Please review all details before submitting for confirmation</p>
                </div>

                <Card className="border-2">
                  <CardContent className="p-6 space-y-5">
                    {detectedCategory && (
                      <div className="pb-4 border-b">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI Detected Category
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {detectedCategory.parentName} → {detectedCategory.name}
                        </p>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">Project Title</h3>
                      <p className="text-lg font-medium">{projectTitle}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">AI-Enhanced Description</h3>
                      <p className="whitespace-pre-wrap text-sm">{detailedDescription}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Location</h3>
                        <p className="text-sm">{zipcode}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Timeline</h3>
                        <p className="text-sm">{serviceStart} - {duration}</p>
                      </div>
                    </div>

                    {(budgetMin || budgetMax) && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Budget Range</h3>
                        <p className="text-sm">
                          ${budgetMin || '0'} - ${budgetMax || '0'}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Contact Email</h3>
                        <p className="text-sm">{email}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Contact Phone</h3>
                        <p className="text-sm">{phone}</p>
                      </div>
                    </div>

                    {selectedKeywords.length > 0 && (
                      <div className="pt-2">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Selected Keywords ({selectedKeywords.length})</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedKeywords.map((keyword, idx) => (
                            <Badge key={idx} variant="secondary">{keyword}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {hourlyBasis && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Hourly Basis</h3>
                        <p className="text-sm capitalize">{hourlyBasis}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>Next Step:</strong> A confirmation email will be sent to <strong>{email}</strong>. 
                    Please click the confirmation link in the email to activate your gig and start receiving inquiries from qualified professionals.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(false)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="flex-1"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                        Submitting...
                      </>
                    ) : (
                      "Submit for Confirmation"
                    )}
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
