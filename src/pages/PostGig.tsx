import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, MapPin, DollarSign, Clock, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { geocodeAddress } from "@/utils/geocoding";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";

const gigSchema = z.object({
  title: z.string().trim().min(10, "Title must be at least 10 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().min(50, "Description must be at least 50 characters").max(2000, "Description must be less than 2000 characters"),
  budget_min: z.number().min(0, "Budget must be positive").optional(),
  budget_max: z.number().min(0, "Budget must be positive").optional(),
  category_id: z.string().uuid("Category will be auto-detected").optional(),
  deadline: z.string().optional(),
});

const PostGig = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [categoryName, setCategoryName] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    timeline: "",
    budget_min: "",
    budget_max: "",
    category_id: "",
    deadline: "",
    contact_preferences: "",
    consumer_phone: "",
    consumer_email: "",
    acceptTerms: false,
    requestEscrow: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // TEMPORARILY DISABLED FOR SCREENSHOTS
    return;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to post a gig");
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", session.user.id)
      .single();

    if (profile?.user_type === "digger") {
      toast.error("Only consumers can post gigs");
      navigate("/");
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast.error("Please accept the Terms of Service to continue");
      return;
    }
    
    setLoading(true);

    try {
      // Auto-detect category if not already set
      if (!formData.category_id && formData.title && formData.description) {
        toast.info("Analyzing your gig to determine the best category...");
        await handleAutoDetect();
      }

      const validatedData = gigSchema.parse({
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min.replace(/[^0-9.]/g, '')) : undefined,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max.replace(/[^0-9.]/g, '')) : undefined,
        deadline: formData.deadline || undefined,
        category_id: formData.category_id || undefined,
      });

      if (validatedData.budget_min && validatedData.budget_max && validatedData.budget_min > validatedData.budget_max) {
        toast.error("Minimum budget cannot be greater than maximum budget");
        setLoading(false);
        return;
      }

      // Fetch category name if we have a category_id
      if (validatedData.category_id && !categoryName) {
        const { data: categoryData } = await supabase
          .from("categories")
          .select("name, parent_category_id, categories!parent_category_id(name)")
          .eq("id", validatedData.category_id)
          .single();
        
        if (categoryData) {
          const parentName = (categoryData as any).categories?.name || "";
          const fullName = parentName ? `${parentName} → ${categoryData.name}` : categoryData.name;
          setCategoryName(fullName);
        }
      }

      // Show preview instead of submitting directly
      setLoading(false);
      setShowPreview(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to validate form");
      }
      setLoading(false);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setDocuments(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async (): Promise<string[]> => {
    if (documents.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      for (const file of documents) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('gig-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading document:', uploadError);
          throw uploadError;
        }

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('gig-documents')
            .getPublicUrl(filePath);
          
          uploadedUrls.push(publicUrl);
        }
      }
    } catch (error) {
      console.error('Error in document upload:', error);
      toast.error("Failed to upload some documents. Please try again.");
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
  };

  const handleApproveAndPost = async () => {
    setShowPreview(false);
    setLoading(true);

    try {
      const validatedData = gigSchema.parse({
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min.replace(/[^0-9.]/g, '')) : undefined,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max.replace(/[^0-9.]/g, '')) : undefined,
        deadline: formData.deadline || undefined,
        category_id: formData.category_id || undefined,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth");
        return;
      }

      // Upload documents first
      const documentUrls = await uploadDocuments();

      // Geocode the location
      let locationLat: number | undefined;
      let locationLng: number | undefined;
      
      if (formData.location) {
        setGeocoding(true);
        const geocodeResult = await geocodeAddress(formData.location);
        setGeocoding(false);
        
        if (geocodeResult) {
          locationLat = geocodeResult.latitude;
          locationLng = geocodeResult.longitude;
          toast.success("Location geocoded successfully");
        } else {
          toast.error("Could not geocode location. Gig will be posted without map coordinates.");
        }
      }

      // Send confirmation email before posting

      // Send confirmation email before posting
      const { data: confirmationData, error: confirmationError } = await supabase.functions.invoke(
        'send-gig-confirmation',
        {
          body: {
            gigData: {
              title: validatedData.title,
              description: validatedData.description,
              location: formData.location,
              timeline: formData.timeline,
              budget_min: validatedData.budget_min,
              budget_max: validatedData.budget_max,
              consumer_id: session.user.id,
              category_id: validatedData.category_id,
              deadline: validatedData.deadline,
              contact_preferences: formData.contact_preferences || null,
              consumer_phone: formData.consumer_phone || null,
              consumer_email: formData.consumer_email,
              status: "open",
              documents: documentUrls.length > 0 ? documentUrls : null,
              keywords: keywords,
              escrow_requested_by_consumer: formData.requestEscrow,
            },
          },
        }
      );

      if (confirmationError) {
        console.error("Error sending confirmation email:", confirmationError);
        throw new Error("Failed to send confirmation email");
      }

      toast.success("Confirmation Email Sent!", {
        description: `Please check ${formData.consumer_email} and click the confirmation link to post your gig.`,
        duration: 8000,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        location: "",
        timeline: "",
        budget_min: "",
        budget_max: "",
        category_id: "",
        deadline: "",
        contact_preferences: "",
        consumer_phone: "",
        consumer_email: "",
        acceptTerms: false,
        requestEscrow: false,
      });
      setDocuments([]);
      setKeywords([]);
      setShowPreview(false);
      
      // Navigate to dashboard
      navigate("/role-dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to post gig. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowPreview(false);
    toast.info("Edit your gig details below");
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleAutoDetect = async () => {
    if (!formData.title || !formData.description) {
      return;
    }

    setAutoDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-categorize-gig", {
        body: {
          title: formData.title,
          description: formData.description,
        },
      });

      if (error) throw error;

      if (data.category_id) {
        setSuggestedCategory(data.category_id);
        setFormData((prev) => ({ ...prev, category_id: data.category_id }));
        setCategoryName(`${data.parent_category} → ${data.category_name}`);
        toast.success(
          <div className="space-y-1">
            <div className="font-semibold">Category detected!</div>
            <div className="text-sm">{data.parent_category} → {data.category_name}</div>
          </div>
        );
      }
    } catch (error: any) {
      console.error("Auto-detect error:", error);
      // Silently fail during auto-detection
    } finally {
      setAutoDetecting(false);
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

  const handleBudgetChange = (field: 'budget_min' | 'budget_max', value: string) => {
    const formatted = formatCurrency(value);
    setFormData({ ...formData, [field]: formatted });
  };

  const formatBudget = () => {
    if (formData.budget_min && formData.budget_max) {
      return `$${formData.budget_min} - $${formData.budget_max}`;
    } else if (formData.budget_min) {
      return `Starting at $${formData.budget_min}`;
    } else if (formData.budget_max) {
      return `Up to $${formData.budget_max}`;
    }
    return "Budget not specified";
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Post a Gig - Find Qualified Service Professionals"
        description="Post your project and connect with skilled service professionals. Get competitive bids from verified contractors, freelancers, and service providers. Free to post, only pay when you hire."
        keywords="post project, hire contractor, find professional, post job, get quotes, service request"
      />
      <Navigation showBackButton backLabel="Back to Home" />

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl">Post a Gig</CardTitle>
                <CardDescription className="text-base mt-1">
                  Find skilled freelancers for your project
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Build a responsive e-commerce website"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project in detail, including requirements, deliverables, and expectations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={8}
                  maxLength={2000}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.description.length}/2000 characters
                </p>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    Location *
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </Label>
                  <Input
                    id="location"
                    placeholder="City, State or Zip Code"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    We'll convert this to map coordinates for location-based filtering
                  </p>
                </div>

              <div className="space-y-2">
                <Label htmlFor="consumer_phone">Your Phone Number *</Label>
                <Input
                  id="consumer_phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.consumer_phone}
                  onChange={(e) => setFormData({ ...formData, consumer_phone: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Professionals will use this to contact you about your project
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumer_email">Your Email Address *</Label>
                <Input
                  id="consumer_email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.consumer_email}
                  onChange={(e) => setFormData({ ...formData, consumer_email: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  We'll send a confirmation email before posting your gig
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Project Timeline *</Label>
                <Input
                  id="timeline"
                  placeholder="e.g., 2-3 weeks, ASAP, Flexible"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_min">Min Budget</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="budget_min"
                      type="text"
                      placeholder="500"
                      value={formData.budget_min}
                      onChange={(e) => handleBudgetChange('budget_min', e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_max">Max Budget</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="budget_max"
                      type="text"
                      placeholder="1,000"
                      value={formData.budget_max}
                      onChange={(e) => handleBudgetChange('budget_max', e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Project Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_preferences">Contact Preferences</Label>
                <Select
                  value={formData.contact_preferences}
                  onValueChange={(value) => setFormData({ ...formData, contact_preferences: value })}
                >
                  <SelectTrigger id="contact_preferences">
                    <SelectValue placeholder="Select your preferred contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_only">Email only</SelectItem>
                    <SelectItem value="phone_preferred">Phone preferred</SelectItem>
                    <SelectItem value="text_messages">Text messages OK</SelectItem>
                    <SelectItem value="email_and_phone">Email and Phone</SelectItem>
                    <SelectItem value="any_method">Any method</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Escrow Protection Option */}
              <Card className="border-2 border-dashed border-muted-foreground/30 bg-accent/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base">Payment Protection (Optional)</CardTitle>
                        <Badge variant="outline" className="text-xs">Recommended</Badge>
                      </div>
                      <CardDescription className="text-sm">
                        Secure your project with escrow - funds are held safely and released as work is completed
                      </CardDescription>
                    </div>
                  </div>
                  <Alert className="mt-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
                      ⚠️ <strong>Important:</strong> Requesting escrow may result in higher bids, as diggers often include the 8% escrow fee in their pricing.
                    </AlertDescription>
                  </Alert>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="requestEscrow"
                      checked={formData.requestEscrow}
                      onCheckedChange={(checked) => setFormData({ ...formData, requestEscrow: checked as boolean })}
                    />
                    <div className="flex-1 space-y-3">
                      <Label htmlFor="requestEscrow" className="cursor-pointer leading-relaxed font-medium">
                        Yes, I want escrow protection for this project
                      </Label>
                      
                      {formData.requestEscrow && (
                        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                          <AlertDescription className="text-sm space-y-2">
                            <div className="font-semibold text-foreground">Escrow Fee Breakdown:</div>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• <strong>8% fee</strong> charged to the digger on milestone releases</li>
                              <li>• <strong>$10 minimum fee</strong> per payment release</li>
                              <li>• Funds held securely until work is approved</li>
                              <li>• Professional dispute resolution if needed</li>
                            </ul>
                            <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800">
                              <div className="text-sm font-medium text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg">
                                ⚠️ <strong>Warning:</strong> Diggers typically increase their bid amounts to cover the 8% escrow fee. Expect bids to be approximately 8% higher than without escrow.
                              </div>
                            </div>
                            {(formData.budget_min || formData.budget_max) && (
                              <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800">
                                <div className="font-semibold text-foreground mb-1">Example for your project:</div>
                                {formData.budget_max && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Budget of </span>
                                    <span className="font-semibold text-foreground">${formData.budget_max}</span>
                                    <span className="text-muted-foreground"> = </span>
                                    <span className="font-semibold text-red-600">
                                      ${Math.max(10, Math.round(parseFloat(formData.budget_max) * 0.08))} escrow fee
                                    </span>
                                    <span className="text-muted-foreground"> charged to digger</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {!formData.requestEscrow && (
                        <p className="text-xs text-muted-foreground">
                          Without escrow, you and the digger manage payments directly. DigsandGigs takes no responsibility for payment disputes.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="documents" className="flex items-center gap-2">
                  Upload Documents (Optional)
                  <span className="text-xs text-muted-foreground font-normal">Plans, Specs, Photos, etc.</span>
                </Label>
                <Input
                  id="documents"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={handleDocumentChange}
                  className="cursor-pointer"
                />
                {documents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium">
                      {documents.length} document(s) selected:
                    </p>
                    <div className="space-y-2">
                      {documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <span className="text-sm truncate flex-1">{doc.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDocument(index)}
                            className="ml-2 h-7 text-xs"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Terms Acceptance */}
              <div className="space-y-4 pt-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked as boolean })}
                    required
                  />
                  <Label htmlFor="acceptTerms" className="cursor-pointer leading-relaxed">
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => window.open("/terms", "_blank")}
                      className="text-primary hover:underline"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => window.open("/privacy", "_blank")}
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </button>
                    . I understand that DiggsAndGiggs is a marketplace platform and all work agreements are between me and the service provider directly.
                  </Label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading || uploading} className="flex-1">
                  {uploading ? "Uploading documents..." : loading ? "Posting..." : "Preview Gig Post"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")} disabled={loading || uploading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Review & Confirm Your Gig</DialogTitle>
            <p className="text-muted-foreground">Please review all details before posting</p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* AI-Detected Category */}
            {categoryName && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">AI Detected</Badge>
                  <span className="text-sm font-medium">Category</span>
                </div>
                <p className="text-lg font-semibold">{categoryName}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This category was automatically selected based on your gig description
                </p>
              </div>
            )}

            {/* Gig Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-1">{formData.title}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{formData.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Location</span>
                  </div>
                  <p>{formData.location}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Timeline</span>
                  </div>
                  <p>{formData.timeline}</p>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Contact Phone</div>
                <p className="font-medium">{formData.consumer_phone}</p>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Contact Email</div>
                <p className="font-medium">{formData.consumer_email}</p>
              </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Budget</span>
                </div>
                <p>{formatBudget()}</p>
              </div>
              
              {formData.deadline && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Deadline</div>
                  <p>{new Date(formData.deadline).toLocaleDateString()}</p>
                </div>
              )}
              
              {formData.contact_preferences && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Contact Preferences</div>
                  <p>{formData.contact_preferences}</p>
                </div>
              )}

              {documents.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Documents ({documents.length})</div>
                  <div className="space-y-1">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="text-sm p-2 bg-muted/50 rounded flex items-center gap-2">
                        <span className="text-xs">📄</span>
                        {doc.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {formData.requestEscrow && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm">Escrow Protection Requested</span>
                </div>
              )}
            </div>

            {/* Keywords Section */}
            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="mb-3">
                <Label className="text-base font-semibold">Keywords (Optional)</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add relevant keywords to help professionals find your gig
                </p>
              </div>
              
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="e.g., urgent, commercial, licensed"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                />
                <Button type="button" onClick={handleAddKeyword} variant="secondary">
                  Add
                </Button>
              </div>

              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <Badge 
                      key={keyword} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveKeyword(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmation Message */}
            <Alert>
              <AlertDescription>
                By posting this gig, you confirm that all information is accurate and you agree to our Terms of Service. 
                Your gig will be matched with relevant professionals using AI.
              </AlertDescription>
            </Alert>
          </div>
          
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleCancelPreview}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleEdit}>
              Edit Details
            </Button>
            <Button onClick={handleApproveAndPost} disabled={loading || geocoding || uploading}>
              {loading || geocoding || uploading ? "Posting..." : "Confirm & Post Gig"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostGig;