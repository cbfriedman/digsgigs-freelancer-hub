import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles, Check, Clock, Info, Shield } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";
import { DynamicIntakeForm } from "@/components/DynamicIntakeForm";
import { geocodeAddress } from "@/utils/geocoding";
import { GigCategorySelector } from "@/components/GigCategorySelector";
import PostGigTrustBanner from "@/components/PostGigTrustBanner";
import PostGigProgressDots from "@/components/PostGigProgressDots";
import { getIndustryContentByName } from "@/config/industryContent";

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
  
  // Step 1 data - Project basics only
  const [professionDescription, setProfessionDescription] = useState("");
  const [zipcode, setZipcode] = useState("");
  
  // Step 2 data - Contact info (moved from Step 1)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Step 3 data - Project details
  const [detectedCategory, setDetectedCategory] = useState<{id: string, name: string, parentName: string} | null>(null);
  const [manualCategoryId, setManualCategoryId] = useState<string>("");
  const [requiresManualSelection, setRequiresManualSelection] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [serviceStart, setServiceStart] = useState("");
  const [duration, setDuration] = useState("");
  const [hourlyBasis, setHourlyBasis] = useState("");
  const [intakeResponses, setIntakeResponses] = useState<Record<string, any>>({});
  
  // Step 4 data - Keywords
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");

  // Check for pending gig data after returning from registration
  useEffect(() => {
    const checkPendingGig = async () => {
      const pendingGig = sessionStorage.getItem('pendingGig');
      if (pendingGig) {
        const gigData = JSON.parse(pendingGig);
        // Restore form state
        setProfessionDescription(gigData.professionDescription || "");
        setZipcode(gigData.zipcode || "");
        setEmail(gigData.email || "");
        setPhone(gigData.phone || "");
        setProjectTitle(gigData.projectTitle || "");
        setDetailedDescription(gigData.detailedDescription || "");
        setEstimatedBudget(gigData.estimatedBudget || "");
        setServiceStart(gigData.serviceStart || "");
        setDuration(gigData.duration || "");
        setHourlyBasis(gigData.hourlyBasis || "");
        setSelectedKeywords(gigData.selectedKeywords || []);
        setSuggestedKeywords(gigData.suggestedKeywords || []);
        setEscrowRequested(gigData.escrowRequested || false);
        setTermsAccepted(gigData.termsAccepted || false);
        if (gigData.detectedCategory) {
          setDetectedCategory(gigData.detectedCategory);
        }
        if (gigData.manualCategoryId) {
          setManualCategoryId(gigData.manualCategoryId);
          setRequiresManualSelection(gigData.requiresManualSelection || false);
        }
        setCurrentStep(gigData.currentStep || 4);
        
        // Check if user is now logged in and auto-submit
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          sessionStorage.removeItem('pendingGig');
          toast.success("Welcome back! Your gig details have been restored. Click 'Post Gig' to submit.");
        }
      }
    };
    checkPendingGig();
  }, []);

  // Step 1: Validate project basics and detect category
  const handleStep1Submit = async () => {
    if (!professionDescription.trim() || !zipcode.trim()) {
      toast.error("Please describe your project and enter your zipcode");
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

      if (error) {
        console.error("Function error:", error);
        let errorMessage = "Failed to analyze profession. Please try again.";
        if (error.message) errorMessage = error.message;
        else if (data?.error) errorMessage = data.error;
        throw new Error(errorMessage);
      }

      if (data?.error) throw new Error(data.error);

      if (data?.requires_manual_selection) {
        setRequiresManualSelection(true);
        toast.info("Please select a category manually");
        setCurrentStep(2);
        return;
      }

      if (data?.category_id) {
        setDetectedCategory({
          id: data.category_id,
          name: data.category_name,
          parentName: data.parent_category
        });
        toast.success(`Detected: ${data.parent_category} → ${data.category_name}`);
        setCurrentStep(2);
      } else {
        setRequiresManualSelection(true);
        toast.info("Could not auto-detect category. Please select one manually.");
        setCurrentStep(2);
      }
    } catch (error: any) {
      console.error("Category detection error:", error);
      let errorMessage = "Failed to analyze profession. Please try again.";
      if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      setDetectingCategory(false);
    }
  };

  // Step 2: Validate contact info and proceed
  const handleStep2Submit = () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    // Phone is optional
    setCurrentStep(3);
  };

  // Step 3: Validate project details and generate keywords
  const handleStep3Submit = async () => {
    if (!projectTitle.trim() || !detailedDescription.trim()) {
      toast.error("Please fill in project title and description");
      return;
    }

    const selectedCategoryId = detectedCategory?.id || manualCategoryId;
    if (!selectedCategoryId) {
      toast.error("Please select a category");
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
        setSelectedKeywords(data.keywords);
        toast.success(`Generated ${data.keywords.length} keyword suggestions`);
        setCurrentStep(4);
      } else {
        toast.info("No keyword suggestions. You can add custom keywords.");
        setCurrentStep(4);
      }
    } catch (error: any) {
      console.error("Keyword generation error:", error);
      toast.error("Failed to generate keywords. You can add them manually.");
      setCurrentStep(4);
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

      if (data?.requiresApiKey || data?.error?.includes("OPENAI_API_KEY") || data?.error?.includes("LOVABLE_API_KEY")) {
        toast.error("AI enhancement is not available. Please configure OPENAI_API_KEY in Supabase to enable this feature.");
        return;
      }

      if (data.enhancedDescription) {
        setDetailedDescription(data.enhancedDescription);
        toast.success("Description enhanced successfully!");
      } else if (data?.error) {
        toast.error(data.error || "Failed to enhance description. Please try again.");
      }
    } catch (error: any) {
      console.error("Description enhancement error:", error);
      const errorMessage = error?.message || error?.error || "Failed to enhance description. Please try again.";
      
      if (errorMessage.includes("OPENAI_API_KEY") || errorMessage.includes("LOVABLE_API_KEY") || errorMessage.includes("not configured")) {
        toast.error("AI enhancement is not available. Please configure OPENAI_API_KEY in Supabase to enable this feature.");
      } else {
        toast.error(errorMessage);
      }
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
      
      // For authenticated users, require email verification
      if (session?.user && !session.user.email_confirmed_at) {
        toast.error("Please verify your email address to post a gig. Check your inbox for the verification code or use the banner on your dashboard to resend it.");
        setLoading(false);
        navigate("/register?returnTo=/post-gig");
        return;
      }
      
      const verifiedGiggerEmail = sessionStorage.getItem('verifiedGiggerEmail');
      const verifiedGiggerPhone = sessionStorage.getItem('verifiedGiggerPhone');
      
      if (!session && !verifiedGiggerEmail) {
        const pendingGigData = {
          professionDescription,
          zipcode,
          email,
          phone,
          projectTitle,
          detailedDescription,
          estimatedBudget,
          serviceStart,
          duration,
          hourlyBasis,
          selectedKeywords,
          suggestedKeywords,
          escrowRequested,
          termsAccepted,
          detectedCategory: detectedCategory || (manualCategoryId ? { id: manualCategoryId, name: "", parentName: "" } : null),
          manualCategoryId,
          requiresManualSelection,
          currentStep: 4,
        };
        sessionStorage.setItem('pendingGig', JSON.stringify(pendingGigData));
        toast.info("Please verify your email to post your gig.");
        navigate("/register?returnTo=/post-gig");
        setLoading(false);
        return;
      }
      
      const consumerId = session?.user?.id || null;
      const finalEmail = verifiedGiggerEmail || email || session?.user?.email;
      const finalPhone = verifiedGiggerPhone || phone;

      let locationLat: number | undefined;
      let locationLng: number | undefined;
      
      if (zipcode) {
        const geocodeResult = await geocodeAddress(zipcode);
        if (geocodeResult) {
          locationLat = geocodeResult.latitude;
          locationLng = geocodeResult.longitude;
        }
      }

      const { data: gigData, error: gigError } = await supabase
        .from("gigs")
        .insert({
          consumer_id: consumerId,
          title: projectTitle,
          description: detailedDescription,
          location: zipcode,
          location_lat: locationLat,
          location_lng: locationLng,
          timeline: `${serviceStart} - ${duration}`,
          budget_min: estimatedBudget ? parseFloat(estimatedBudget.replace(/[^0-9.]/g, '')) : undefined,
          budget_max: null,
          category_id: detectedCategory?.id || manualCategoryId,
          consumer_phone: finalPhone,
          consumer_email: finalEmail,
          confirmation_status: "pending",
          confirmation_sent_at: new Date().toISOString(),
          is_confirmed_lead: false,
          status: "pending_confirmation",
          escrow_requested_by_consumer: escrowRequested,
        })
        .select()
        .single();

      if (gigError) throw gigError;

      if (Object.keys(intakeResponses).length > 0 && detectedCategory) {
        try {
          const { data: template, error: templateError } = await supabase
            .from('intake_form_templates')
            .select('id')
            .eq('industry_name', detectedCategory.name)
            .eq('is_active', true)
            .maybeSingle();

          if (templateError) {
            if (templateError.code === 'PGRST205' || templateError.message?.includes('Could not find the table') || templateError.message?.includes('404')) {
              console.log('Intake form templates table not found - skipping intake form responses');
            } else {
              console.warn('Error loading intake form template:', templateError);
            }
          } else if (template) {
            const responseInserts = Object.entries(intakeResponses).map(([questionId, answer]) => ({
              gig_id: gigData.id,
              question_id: questionId,
              answer_text: typeof answer === 'string' ? answer : null,
              answer_options: typeof answer === 'object' ? answer : null,
            }));

            const { error: insertError } = await supabase.from('intake_form_responses').insert(responseInserts);
            if (insertError) {
              if (insertError.code === 'PGRST205' || insertError.message?.includes('Could not find the table') || insertError.message?.includes('404')) {
                console.log('Intake form responses table not found - skipping intake form responses');
              } else {
                console.warn('Error saving intake form responses:', insertError);
              }
            }
          }
        } catch (error: any) {
          if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table') || error?.message?.includes('404')) {
            console.log('Intake form tables not found - skipping intake form responses');
          } else {
            console.warn('Error saving intake form responses:', error);
          }
        }
      }

      toast.info("Sending confirmation email...");
      const { error: emailError } = await supabase.functions.invoke("send-gig-confirmation", {
        body: {
          gigId: gigData.id,
          email: finalEmail,
          gigTitle: projectTitle,
          gigDescription: detailedDescription,
          location: zipcode,
          estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget.replace(/[^0-9.]/g, '')) : undefined,
          keywords: selectedKeywords,
        },
      });

      if (emailError) {
        console.error("Error sending confirmation email:", emailError);
        toast.error("Failed to send confirmation email. Please try again.");
        return;
      }

      toast.success("Confirmation email sent! Please check your inbox to confirm your gig.");
      
      if (typeof gtag !== 'undefined') {
        gtag('event', 'gig_submitted', {
          event_category: 'conversion',
          event_label: detectedCategory?.name || 'unknown',
          value: 1,
          gig_id: gigData.id,
          category: detectedCategory?.name,
          parent_category: detectedCategory?.parentName,
          zipcode: zipcode,
          has_budget: !!estimatedBudget,
          keyword_count: selectedKeywords.length,
          escrow_requested: escrowRequested
        });
      }
      
      sessionStorage.removeItem('verifiedGiggerEmail');
      sessionStorage.removeItem('verifiedGiggerPhone');
      sessionStorage.removeItem('pendingGig');
      
      navigate(`/gig-confirmed?gigId=${gigData.id}`);
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

  const handleBudgetChange = (value: string) => {
    const formatted = formatCurrency(value);
    setEstimatedBudget(formatted);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Post a Gig - Find Qualified Service Professionals"
        description="Post your project and connect with skilled service professionals. Get competitive bids from verified contractors, freelancers, and service providers."
        keywords="post project, hire contractor, find professional, post job, get quotes"
      />
      <Navigation showBackButton backLabel="Back to Home" />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Trust Banner - Only on Step 1 */}
        {currentStep === 1 && !showPreview && <PostGigTrustBanner />}

        <Card className="shadow-lg">
          <CardContent className="pt-6">
            {/* Progress Dots - Replaces "Step X of Y" */}
            {!showPreview && (
              <PostGigProgressDots currentStep={currentStep} totalSteps={4} />
            )}

            {/* STEP 1: Project Basics (Simplified) */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="profession" className="text-base font-medium">
                    What do you need help with? *
                  </Label>
                  <Textarea
                    id="profession"
                    placeholder="Describe your project (e.g., 'Need an electrician to rewire my kitchen and install new outlets')"
                    value={professionDescription}
                    onChange={(e) => setProfessionDescription(e.target.value)}
                    rows={4}
                    required
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipcode" className="text-base font-medium">
                    Your Zipcode *
                  </Label>
                  <Input
                    id="zipcode"
                    placeholder="Enter your zipcode"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    required
                    className="text-base"
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
                      Finding Pros...
                    </>
                  ) : (
                    <>
                      Get Free Quotes
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Takes less than 60 seconds
                </p>
              </div>
            )}

            {/* STEP 2: Contact Info */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold">How should contractors reach you?</h2>
                  <p className="text-sm text-muted-foreground mt-1">We'll only share this with pros who want to bid on your project</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base font-medium">
                    Phone Number <span className="text-muted-foreground text-sm">(Optional - faster responses)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-base"
                  />
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
                    className="flex-1"
                    size="lg"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Project Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold">Tell us more about your project</h2>
                  <p className="text-sm text-muted-foreground mt-1">More details help pros give you accurate quotes</p>
                </div>

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

                {/* Industry-Specific Gigger Prompt */}
                {detectedCategory && (() => {
                  const industryContent = getIndustryContentByName(detectedCategory.parentName);
                  if (industryContent?.giggerPrompt) {
                    return (
                      <>
                        <Alert variant="default" className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800 dark:text-blue-200">
                            {industryContent.giggerPrompt.heading}
                          </AlertTitle>
                          <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm mt-2">
                            <p>{industryContent.giggerPrompt.body}</p>
                            {industryContent.giggerPrompt.bulletPoints && (
                              <ul className="mt-2 space-y-1 list-disc list-inside">
                                {industryContent.giggerPrompt.bulletPoints.map((point, index) => (
                                  <li key={index}>{point}</li>
                                ))}
                              </ul>
                            )}
                            {industryContent.disclaimer && (
                              <p className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 text-xs font-medium">
                                {industryContent.disclaimer}
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                        {/* Legal Disclaimer - Full compliance text rendered as visible HTML */}
                        {industryContent.legalDisclaimer && (
                          <div className="p-4 bg-muted/50 border border-border rounded-lg">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              <strong className="text-foreground">Disclaimer:</strong>{' '}
                              {industryContent.legalDisclaimer.replace('Disclaimer: ', '')}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  }
                  return null;
                })()}

                {requiresManualSelection && !detectedCategory && (
                  <div className="space-y-2">
                    <GigCategorySelector
                      value={manualCategoryId}
                      onChange={async (categoryId) => {
                        setManualCategoryId(categoryId);
                        const { data: category } = await supabase
                          .from("categories")
                          .select("id, name, parent_category_id")
                          .eq("id", categoryId)
                          .single();
                        
                        if (category) {
                          let parentName = "Unknown";
                          if (category.parent_category_id) {
                            const { data: parent } = await supabase
                              .from("categories")
                              .select("name")
                              .eq("id", category.parent_category_id)
                              .single();
                            parentName = parent?.name || "Unknown";
                          }
                          
                          setDetectedCategory({
                            id: category.id,
                            name: category.name,
                            parentName: parentName
                          });
                        }
                      }}
                    />
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

                <div className="space-y-2">
                  <Label htmlFor="estimatedBudget">Estimated Budget ($) <span className="text-muted-foreground text-sm">(Optional)</span></Label>
                  <Input
                    id="estimatedBudget"
                    placeholder="10,000"
                    value={estimatedBudget}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                  />
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
                    onClick={() => setCurrentStep(2)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleStep3Submit}
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

            {/* STEP 4: Keywords & Submit */}
            {currentStep === 4 && !showPreview && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold">Almost done!</h2>
                  <p className="text-sm text-muted-foreground mt-1">Review keywords to match you with the right pros</p>
                </div>

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

                <p className="text-xs text-muted-foreground">
                  Select from the suggested keywords above to help match your gig with the right professionals.
                </p>

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
                    onClick={() => setCurrentStep(3)}
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

                    {estimatedBudget && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Estimated Budget</h3>
                        <p className="text-sm">${estimatedBudget}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Contact Email</h3>
                        <p className="text-sm">{email}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Contact Phone</h3>
                        <p className="text-sm">{phone || "Not provided"}</p>
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
