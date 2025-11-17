import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, Info, Briefcase, X, Star, GripVertical } from "lucide-react";
import { RegistrationCategorySelector } from "@/components/RegistrationCategorySelector";
import { geocodeAddress } from "@/utils/geocoding";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface IndustryCode {
  id: string;
  code_type: "SIC" | "NAICS";
  code: string;
  title: string;
  description: string | null;
}

interface Reference {
  name: string;
  email: string;
  phone: string;
  description: string;
}

// Sortable Profession Card Component
interface SortableProfessionCardProps {
  code: IndustryCode;
  index: number;
  isPrimary: boolean;
  customTitle: string;
  onTogglePrimary: (index: number) => void;
  onRemove: (index: number) => void;
}

const SortableProfessionCard = ({ 
  code, 
  index, 
  isPrimary, 
  customTitle,
  onTogglePrimary, 
  onRemove 
}: SortableProfessionCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: code.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 bg-background rounded-lg border border-border group hover:border-primary/30 transition-all ${
        isDragging ? 'shadow-lg z-50' : ''
      }`}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 flex-shrink-0 ${
          isPrimary 
            ? 'text-yellow-500 hover:text-yellow-600' 
            : 'text-muted-foreground hover:text-yellow-500'
        }`}
        onClick={() => onTogglePrimary(index)}
        type="button"
        title={isPrimary ? "Primary profession" : "Set as primary"}
      >
        <Star className={`h-4 w-4 ${isPrimary ? 'fill-yellow-500' : ''}`} />
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-foreground">
            {customTitle || code.title}
          </span>
          {isPrimary && (
            <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
              Primary
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {code.code_type}: {code.code}
          </Badge>
        </div>
        {code.description && (
          <p className="text-sm text-muted-foreground">
            {code.description}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={() => onRemove(index)}
        type="button"
      >
        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
};

const DiggerRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIndustryCodes, setSelectedIndustryCodes] = useState<IndustryCode[]>([]);
  const [customOccupationTitles, setCustomOccupationTitles] = useState<string[]>([]);
  const [references, setReferences] = useState<Reference[]>([{ name: "", email: "", phone: "", description: "" }]);
  const [professionToRemove, setProfessionToRemove] = useState<number | null>(null);
  const [primaryProfessionIndex, setPrimaryProfessionIndex] = useState<number>(0);
  const [lastRemovedProfession, setLastRemovedProfession] = useState<{ code: IndustryCode; title: string; index: number } | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [formData, setFormData] = useState({
    handle: "",
    business_name: "",
    phone: "",
    location: "",
    profession: "",
    bio: "",
    portfolio_url: "",
    hourly_rate_min: "",
    hourly_rate_max: "",
    years_experience: "",
    availability: "",
    is_insured: false,
    is_bonded: false,
    is_licensed: "not_required" as "yes" | "no" | "not_required",
    offers_free_estimates: false,
    offers_commission_bidding: true,
    offers_hourly_work: false,
    pricing_model: "both" as "commission" | "hourly" | "both",
    acceptTerms: false,
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    // TEMPORARILY DISABLED FOR SCREENSHOTS
    return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is a digger
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", session.user.id)
      .single();

    if (profile?.user_type !== "digger") {
      toast.error("Only diggers can access this page");
      navigate("/");
      return;
    }
  };

  const addReference = () => {
    setReferences([...references, { name: "", email: "", phone: "", description: "" }]);
  };

  const updateReference = (index: number, field: keyof Reference, value: string) => {
    const newReferences = [...references];
    newReferences[index][field] = value;
    setReferences(newReferences);
  };

  const removeReference = (index: number) => {
    if (references.length > 1) {
      setReferences(references.filter((_, i) => i !== index));
    }
  };

  const removeProfession = (index: number) => {
    // Store the removed profession for undo
    const removedCode = selectedIndustryCodes[index];
    const removedTitle = customOccupationTitles[index];
    setLastRemovedProfession({ code: removedCode, title: removedTitle, index });

    // Remove from arrays
    const newCodes = selectedIndustryCodes.filter((_, i) => i !== index);
    const newTitles = customOccupationTitles.filter((_, i) => i !== index);
    setSelectedIndustryCodes(newCodes);
    setCustomOccupationTitles(newTitles);
    setProfessionToRemove(null);

    // Adjust primary index if needed
    if (primaryProfessionIndex === index) {
      setPrimaryProfessionIndex(0);
    } else if (primaryProfessionIndex > index) {
      setPrimaryProfessionIndex(primaryProfessionIndex - 1);
    }

    // Clear any existing timeout
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
    }

    // Set timeout to clear undo option after 5 seconds
    const timeoutId = setTimeout(() => {
      setLastRemovedProfession(null);
    }, 5000);
    setUndoTimeoutId(timeoutId);

    // Show toast with undo option
    toast.success("Profession removed", {
      description: `${removedTitle || removedCode.title} has been removed from your profile.`,
      action: {
        label: "Undo",
        onClick: handleUndoRemove,
      },
      duration: 5000,
    });
  };

  const togglePrimaryProfession = (index: number) => {
    setPrimaryProfessionIndex(index);
    const professionName = customOccupationTitles[index] || selectedIndustryCodes[index]?.title;
    toast.success("Primary profession updated", {
      description: `${professionName} is now your primary profession.`,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = selectedIndustryCodes.findIndex(code => code.id === active.id);
    const newIndex = selectedIndustryCodes.findIndex(code => code.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newCodes = arrayMove(selectedIndustryCodes, oldIndex, newIndex);
      const newTitles = arrayMove(customOccupationTitles, oldIndex, newIndex);
      
      setSelectedIndustryCodes(newCodes);
      setCustomOccupationTitles(newTitles);

      // Update primary profession index if it was affected
      if (primaryProfessionIndex === oldIndex) {
        setPrimaryProfessionIndex(newIndex);
      } else if (oldIndex < primaryProfessionIndex && newIndex >= primaryProfessionIndex) {
        setPrimaryProfessionIndex(primaryProfessionIndex - 1);
      } else if (oldIndex > primaryProfessionIndex && newIndex <= primaryProfessionIndex) {
        setPrimaryProfessionIndex(primaryProfessionIndex + 1);
      }

      toast.success("Profession order updated", {
        description: "Drag and drop to continue reordering your professions.",
      });
    }
  };

  const handleUndoRemove = () => {
    if (!lastRemovedProfession) return;

    // Clear the timeout
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }

    const { code, title, index } = lastRemovedProfession;

    // Restore the profession at its original position
    const newCodes = [...selectedIndustryCodes];
    const newTitles = [...customOccupationTitles];
    
    newCodes.splice(index, 0, code);
    newTitles.splice(index, 0, title);

    setSelectedIndustryCodes(newCodes);
    setCustomOccupationTitles(newTitles);
    setLastRemovedProfession(null);

    toast.success("Profession restored", {
      description: `${title || code.title} has been restored to your profile.`,
    });
  };

  const confirmRemoveProfession = () => {
    if (professionToRemove !== null) {
      removeProfession(professionToRemove);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0 && selectedIndustryCodes.length === 0) {
      toast.error("Please select at least one primary profession using the 'Select Primary Profession' button");
      return;
    }

    if (!formData.acceptTerms) {
      toast.error("Please accept the Terms of Service to continue");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

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
          toast.error("Could not geocode location. Profile will be created without map coordinates.");
        }
      }

      // Determine pricing model based on selections
      let pricingModel: "commission" | "hourly" | "both" = "commission";
      if (formData.offers_commission_bidding && formData.offers_hourly_work) {
        pricingModel = "both";
      } else if (formData.offers_hourly_work) {
        pricingModel = "hourly";
      } else {
        pricingModel = "commission";
      }

      // Create digger profile
      const { data: diggerProfile, error: profileError } = await supabase
        .from("digger_profiles")
        .insert({
          user_id: session.user.id,
          handle: formData.handle,
          business_name: formData.business_name,
          phone: formData.phone,
          location: formData.location,
          location_lat: locationLat,
          location_lng: locationLng,
          profession: formData.profession,
          bio: formData.bio,
          portfolio_url: formData.portfolio_url || null,
          hourly_rate_min: formData.hourly_rate_min ? parseFloat(formData.hourly_rate_min) : null,
          hourly_rate_max: formData.hourly_rate_max ? parseFloat(formData.hourly_rate_max) : null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
          availability: formData.availability || null,
          is_insured: formData.is_insured,
          is_bonded: formData.is_bonded,
          is_licensed: formData.is_licensed,
          offers_free_estimates: formData.offers_free_estimates,
          pricing_model: pricingModel,
          sic_code: selectedIndustryCodes.filter(c => c.code_type === "SIC").map(c => c.code),
          naics_code: selectedIndustryCodes.filter(c => c.code_type === "NAICS").map(c => c.code),
          custom_occupation_title: customOccupationTitles.length > 0 ? customOccupationTitles.join(", ") : null,
          primary_profession_index: primaryProfessionIndex,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Add selected categories
      const categoryInserts = selectedCategories.map((categoryId) => ({
        digger_id: diggerProfile.id,
        category_id: categoryId,
      }));

      const { error: categoriesError } = await supabase
        .from("digger_categories")
        .insert(categoryInserts);

      if (categoriesError) throw categoriesError;

      // Add references
      const validReferences = references.filter(
        (ref) => ref.name && ref.email
      );

      if (validReferences.length > 0) {
        const referenceInserts = validReferences.map((ref) => ({
          digger_id: diggerProfile.id,
          reference_name: ref.name,
          reference_email: ref.email,
          reference_phone: ref.phone || null,
          project_description: ref.description || null,
        }));

        const { error: referencesError } = await supabase
          .from("references")
          .insert(referenceInserts);

        if (referencesError) throw referencesError;
      }

      toast.success("Profile created successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Digger Registration</CardTitle>
            <CardDescription>
              Complete your profile to start receiving gig opportunities. You can register under multiple categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Basic Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="handle">Display Handle *</Label>
                  <Input
                    id="handle"
                    value={formData.handle}
                    onChange={(e) => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="e.g., electrician_mike, lawyer_susan, designer_alex"
                    required
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a unique username. Your real name/business will stay private. Only lowercase letters, numbers, and underscores.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name (Private) *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Your business or professional name"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This is kept private and not shown to consumers
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      Location *
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, State or Zip Code"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll convert this to map coordinates for location-based filtering
                    </p>
                  </div>
                </div>

                {/* Selected Professions Summary */}
                {(selectedIndustryCodes.length > 0 || customOccupationTitles.length > 0) && (
                  <Card className="border-primary/20 bg-primary/5 animate-fade-in">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Selected Primary Professions ({selectedIndustryCodes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext 
                          items={selectedIndustryCodes.map(code => code.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {selectedIndustryCodes.map((code, index) => (
                              <SortableProfessionCard
                                key={code.id}
                                code={code}
                                index={index}
                                isPrimary={primaryProfessionIndex === index}
                                customTitle={customOccupationTitles[index]}
                                onTogglePrimary={togglePrimaryProfession}
                                onRemove={setProfessionToRemove}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                      <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p>
                          Drag <GripVertical className="h-3 w-3 inline mx-1" /> to reorder professions. 
                          Click <Star className="h-3 w-3 inline mx-1" /> to mark your primary specialty.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Primary Professions Selection */}
                <div className="space-y-4 border border-primary/20 rounded-lg p-4 bg-primary/5">
                  <div>
                    <Label className="text-base font-semibold">Primary Professions *</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select all professions you offer. This helps us match you with relevant gigs. 
                      Click "Select Primary Profession" to add multiple professions.
                    </p>
                  </div>
                  <RegistrationCategorySelector
                    selectedCategories={selectedCategories}
                    onCategoriesChange={setSelectedCategories}
                    onIndustryCodesChange={(codes, titles) => {
                      setSelectedIndustryCodes(codes);
                      setCustomOccupationTitles(titles);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession">Professional Title (Optional)</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="e.g., Licensed Master Electrician"
                  />
                  <p className="text-xs text-muted-foreground">
                    A custom title to display on your profile (e.g., "Master Plumber" or "Certified Arborist")
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio *</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Describe your skills, experience, and what makes you stand out..."
                    required
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_min">Hourly Rate Min ($)</Label>
                    <Input
                      id="hourly_rate_min"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate_min}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_min: e.target.value })}
                      placeholder="50.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_max">Hourly Rate Max ($)</Label>
                    <Input
                      id="hourly_rate_max"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate_max}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_max: e.target.value })}
                      placeholder="150.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_experience">Years of Experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    placeholder="e.g., Full-time, Part-time, Weekends"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio/Website URL</Label>
                  <Input
                    id="portfolio_url"
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <Separator />

              {/* Payment & Service Options */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Payment & Service Options</h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-4 text-sm border border-border">
                  <p className="font-medium text-base">Choose how you want to work on the platform:</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-primary">1. Commission-Based Gigs (Bidding)</span>
                    </div>
                    <p className="text-muted-foreground ml-4">
                      Bid on projects and access leads based on your subscription tier.
                    </p>
                    <div className="ml-4 space-y-1 text-muted-foreground">
                      <p>• <strong>Lead Cost:</strong> Free ($60/lead), Pro ($40/lead), Premium ($20/lead)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-primary">2. Hourly Work</span>
                    </div>
                    <p className="text-muted-foreground ml-4">
                      Display your hourly rate range. When awarded hourly work, you pay an upcharge based on your tier.
                    </p>
                    <div className="ml-4 space-y-1 text-muted-foreground">
                      <p>• <strong>Hourly Award Upcharge:</strong> Free (3 hours of your rate), Pro (2 hours), Premium (1 hour)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-primary">3. Free Estimates</span>
                    </div>
                    <p className="text-muted-foreground ml-4">
                      Market yourself as offering free estimates. When a client requests an estimate, you pay an upcharge.
                    </p>
                    <div className="ml-4 space-y-1 text-muted-foreground">
                      <p>• <strong>Free Estimate Upcharge:</strong> Free ($100), Pro ($75), Premium ($50)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  <Label className="text-base font-semibold">Select Your Service Options</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose which types of work you want to offer. You can select multiple options.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                      <Checkbox
                        id="offers_commission_bidding"
                        checked={formData.offers_commission_bidding}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, offers_commission_bidding: checked as boolean })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="offers_commission_bidding" className="cursor-pointer font-medium">
                          Commission-Based Gigs (Bidding)
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lead Cost: Free ($60), Pro ($40), Premium ($20)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                      <Checkbox
                        id="offers_hourly_work"
                        checked={formData.offers_hourly_work}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, offers_hourly_work: checked as boolean })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="offers_hourly_work" className="cursor-pointer font-medium">
                          Hourly Rate Work
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Hourly Award Upcharge: Free (3 hours), Pro (2 hours), Premium (1 hour)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                      <Checkbox
                        id="offers_free_estimates"
                        checked={formData.offers_free_estimates}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, offers_free_estimates: checked as boolean })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="offers_free_estimates" className="cursor-pointer font-medium">
                          Free Estimates
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Free Estimate Upcharge: Free ($100), Pro ($75), Premium ($50)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Trust Signals */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Professional Credentials</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_insured"
                      checked={formData.is_insured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_insured: checked as boolean })}
                    />
                    <Label htmlFor="is_insured" className="cursor-pointer">
                      I am insured
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_bonded"
                      checked={formData.is_bonded}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_bonded: checked as boolean })}
                    />
                    <Label htmlFor="is_bonded" className="cursor-pointer">
                      I am bonded
                    </Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Licensed Status</Label>
                  <RadioGroup 
                    value={formData.is_licensed} 
                    onValueChange={(value) => setFormData({ ...formData, is_licensed: value as "yes" | "no" | "not_required" })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="licensed_yes" />
                      <Label htmlFor="licensed_yes" className="cursor-pointer font-normal">
                        Yes, I am licensed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="licensed_no" />
                      <Label htmlFor="licensed_no" className="cursor-pointer font-normal">
                        No, I am not licensed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not_required" id="licensed_not_required" />
                      <Label htmlFor="licensed_not_required" className="cursor-pointer font-normal">
                        License not required for my profession
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <p className="text-sm text-muted-foreground">
                  These credentials will be displayed on your profile to build trust with consumers
                </p>
              </div>

              <Separator />

              {/* References */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">Verifiable References</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add references with contact information. This information is private and only visible to you.
                  </p>
                </div>
                {references.map((ref, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Reference {index + 1}</h4>
                        {references.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeReference(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={ref.name}
                            onChange={(e) => updateReference(index, "name", e.target.value)}
                            placeholder="John Smith"
                            required={index === 0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={ref.email}
                            onChange={(e) => updateReference(index, "email", e.target.value)}
                            placeholder="john@example.com"
                            required={index === 0}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          type="tel"
                          value={ref.phone}
                          onChange={(e) => updateReference(index, "phone", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Project Description</Label>
                        <Textarea
                          value={ref.description}
                          onChange={(e) => updateReference(index, "description", e.target.value)}
                          placeholder="Describe the project you worked on with this reference..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addReference} className="w-full">
                  Add Another Reference
                </Button>
              </div>

              <Separator />

              {/* Terms Acceptance */}
              <div className="space-y-4">
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
                    . I understand that DiggsAndGiggs is a marketplace platform and all work agreements are between me and the client directly.
                  </Label>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating Profile..." : "Create Digger Profile"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Remove Profession Confirmation Dialog */}
        <AlertDialog open={professionToRemove !== null} onOpenChange={(open) => !open && setProfessionToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Primary Profession?</AlertDialogTitle>
              <AlertDialogDescription>
                {professionToRemove !== null && (
                  <>
                    Are you sure you want to remove <strong>{customOccupationTitles[professionToRemove] || selectedIndustryCodes[professionToRemove]?.title}</strong>?
                    <br /><br />
                    This will affect which gigs you receive notifications for. You can add it back later if needed.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRemoveProfession} className="bg-destructive hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default DiggerRegistration;
