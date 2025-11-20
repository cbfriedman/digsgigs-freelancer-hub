import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfessionKeywordInput } from "@/components/ProfessionKeywordInput";
import { Check, Loader2, Star, RefreshCw, Info, User, Mail, Phone, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Footer } from "@/components/Footer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PlanRecommender from "@/components/PlanRecommender";
import PricingCharts from "@/components/PricingCharts";
import BreakevenCalculator from "@/components/BreakevenCalculator";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { generateFAQSchema } from "@/components/StructuredData";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
import EscrowFeeBreakdown from "@/components/EscrowFeeBreakdown";
import LeadNumberingExplainer from "@/components/LeadNumberingExplainer";
import LeadCostTimeline from "@/components/LeadCostTimeline";
import InteractiveLeadSlider from "@/components/InteractiveLeadSlider";
import MonthlyLeadSimulator from "@/components/MonthlyLeadSimulator";
import CompetitorCostComparison from "@/components/CompetitorCostComparison";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";

import { PRICING_TIERS, INDUSTRY_PRICING, getLeadCostForIndustry, getAllIndustries, getLeadTierDescription, INDUSTRY_GROUPS } from "@/config/pricing";

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isDigger, subscriptionStatus, loading: authLoading, checkSubscription } = useAuth();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [interactiveLeads, setInteractiveLeads] = useState(50);
  const [interactiveJobValue, setInteractiveJobValue] = useState<number | string>(5000);
  const [leadsToClicksRate, setLeadsToClicksRate] = useState(25);
  const [clicksToAwardRate, setClicksToAwardRate] = useState(25);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [step1Completed, setStep1Completed] = useState(false);
  const [currentProfileIndustrySets, setCurrentProfileIndustrySets] = useState<string[][]>([]);
  const [professionLeadQuantities, setProfessionLeadQuantities] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    companyName: "",
    acceptTerms: false,
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Check if user can interact with pricing tiles - only after Step 1 is completed
  const canInteractWithPricing = step1Completed;

  // Helper function to get value indicator for a profession
  const getValueIndicator = (profession: string): string => {
    for (const group of INDUSTRY_GROUPS) {
      const industry = group.industries.find(ind => ind.name === profession);
      if (industry) return industry.indicator;
    }
    return 'LV'; // Default to low-value if not found
  };

  // Helper function to get lead cost for a profession based on tier
  const getProfessionLeadCost = (profession: string, tier: 'free' | 'pro' | 'premium'): number => {
    return getLeadCostForIndustry(profession, tier);
  };

  // Calculate total leads across all professions
  const getTotalLeads = (): number => {
    return Object.values(professionLeadQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  // Calculate volume discount based on total leads
  const getVolumeDiscount = (): number => {
    const totalLeads = getTotalLeads();
    if (totalLeads >= 51) return 0.30; // 30% discount
    if (totalLeads >= 11) return 0.15; // 15% discount
    return 0; // No discount
  };

  // Calculate total cost with volume discount
  const calculateTotalCost = (): { subtotal: number; discount: number; total: number } => {
    let subtotal = 0;
    Object.entries(professionLeadQuantities).forEach(([profession, quantity]) => {
      const leadCost = getProfessionLeadCost(profession, 'free'); // Use 'free' tier pricing as base
      subtotal += leadCost * quantity;
    });
    
    const discountRate = getVolumeDiscount();
    const discount = subtotal * discountRate;
    const total = subtotal - discount;
    
    return { subtotal, discount, total };
  };

  // Define getLeadCostForTier early so it can be used in TIERS
  const getLeadCostForTier = (tier: 'free' | 'pro' | 'premium') => {
    if (selectedIndustries.length === 0) {
      // Default to least expensive (low-value category minimum)
      return INDUSTRY_PRICING[0][tier]; // Low-value services
    }
    // Return highest cost from selected industries
    return Math.max(...selectedIndustries.map(ind => getLeadCostForIndustry(ind, tier)));
  };

  const TIERS = {
    free: {
      name: PRICING_TIERS.free.name,
      price: PRICING_TIERS.free.price,
      priceValue: PRICING_TIERS.free.priceValue,
      leadCostRange: `$${INDUSTRY_PRICING[0].free}-$${INDUSTRY_PRICING[2].free}`,
      leadCostValue: getLeadCostForTier('free'),
      escrowFee: PRICING_TIERS.free.escrowFee,
      escrowFeeValue: PRICING_TIERS.free.escrowFeeValue,
      escrowProcessingFee: PRICING_TIERS.free.escrowProcessingFee,
      escrowProcessingFeeValue: PRICING_TIERS.free.escrowProcessingFeeValue,
      escrowProcessingMinimum: PRICING_TIERS.free.escrowProcessingMinimum,
      priceId: PRICING_TIERS.free.priceId,
      productId: PRICING_TIERS.free.productId,
      popular: PRICING_TIERS.free.popular,
      volumeTier: 'Free Tier (1-10 leads/mo)',
      description: 'Full Retail price',
      savingsPercent: 0,
      features: [],
    },
    pro: {
      name: PRICING_TIERS.pro.name,
      price: PRICING_TIERS.pro.price,
      priceValue: PRICING_TIERS.pro.priceValue,
      leadCostRange: `$${INDUSTRY_PRICING[0].pro}-$${INDUSTRY_PRICING[2].pro}`,
      leadCostValue: getLeadCostForTier('pro'),
      escrowFee: PRICING_TIERS.pro.escrowFee,
      escrowFeeValue: PRICING_TIERS.pro.escrowFeeValue,
      escrowProcessingFee: PRICING_TIERS.pro.escrowProcessingFee,
      escrowProcessingFeeValue: PRICING_TIERS.pro.escrowProcessingFeeValue,
      escrowProcessingMinimum: PRICING_TIERS.pro.escrowProcessingMinimum,
      priceId: PRICING_TIERS.pro.priceId,
      productId: PRICING_TIERS.pro.productId,
      popular: PRICING_TIERS.pro.popular,
      volumeTier: 'Pro Tier (11-50 leads/mo)',
      description: 'Best Bulk Pricing - Lock in 17% savings',
      savingsPercent: 17,
      features: [],
    },
    premium: {
      name: PRICING_TIERS.premium.name,
      price: PRICING_TIERS.premium.price,
      priceValue: PRICING_TIERS.premium.priceValue,
      leadCostRange: `$${INDUSTRY_PRICING[0].premium}-$${INDUSTRY_PRICING[2].premium}`,
      leadCostValue: getLeadCostForTier('premium'),
      escrowFee: PRICING_TIERS.premium.escrowFee,
      escrowFeeValue: PRICING_TIERS.premium.escrowFeeValue,
      escrowProcessingFee: PRICING_TIERS.premium.escrowProcessingFee,
      escrowProcessingFeeValue: PRICING_TIERS.premium.escrowProcessingFeeValue,
      escrowProcessingMinimum: PRICING_TIERS.premium.escrowProcessingMinimum,
      priceId: PRICING_TIERS.premium.priceId,
      productId: PRICING_TIERS.premium.productId,
      popular: PRICING_TIERS.premium.popular,
      volumeTier: 'Premium Tier (51+ leads/mo)',
      description: 'Best Bulk Pricing - Lock in 33% savings',
      savingsPercent: 33,
      features: [],
    },
  };
  
  // Calculate clicks and awards
  const calculatedClicks = Math.round(interactiveLeads * (leadsToClicksRate / 100));
  const calculatedAwards = Math.round(calculatedClicks * (clicksToAwardRate / 100));
  
  // Convert interactiveJobValue to number for calculations
  const jobValueNumber = typeof interactiveJobValue === 'string' ? (interactiveJobValue === '' ? 0 : Number(interactiveJobValue)) : interactiveJobValue;
  
  const [refreshing, setRefreshing] = useState(false);
  const [hourlyRateMin, setHourlyRateMin] = useState<number | null>(null);
  const [hourlyRateMax, setHourlyRateMax] = useState<number | null>(null);

  const currentTier = subscriptionStatus?.subscription_tier || 'free';

  useEffect(() => {
    if (user && isDigger) {
      loadDiggerProfile();
    }
  }, [user, isDigger]);

  // Restore saved registration progress
  useEffect(() => {
    const savedProgress = localStorage.getItem("pricing_registration_progress");
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        // Only restore if it was marked as in-progress
        if (progress.isInProgress) {
          setFormData({
            fullName: progress.fullName || "",
            email: progress.email || "",
            password: "",
            confirmPassword: "",
            phone: progress.phone || "",
            companyName: progress.companyName || "",
            acceptTerms: progress.acceptTerms || false,
          });
          setSelectedIndustries(progress.industries || []);
          if (progress.step1Completed) {
            setStep1Completed(true);
          }
          setShowRegistrationForm(true);
          toast.info("Your registration progress has been restored");
          // Clear the in-progress flag
          localStorage.removeItem("pricing_registration_progress");
        }
      } catch (error) {
        console.error("Error restoring progress:", error);
      }
    }
  }, []);

  const loadDiggerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('digger_profiles')
        .select('hourly_rate_min, hourly_rate_max')
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setHourlyRateMin(data.hourly_rate_min);
        setHourlyRateMax(data.hourly_rate_max);
      }
    } catch (error) {
      console.error('Error loading digger profile:', error);
    }
  };

  const handleRefreshSubscription = async () => {
    setRefreshing(true);
    await checkSubscription();
    setRefreshing(false);
    toast.success("Your subscription status has been refreshed");
  };

  const handleSubscribe = async (tier: string, priceId: string | null) => {
    if (!user) {
      navigate('/auth', { state: { redirectTo: '/pricing' } });
      return;
    }

    if (!isDigger) {
      navigate('/digger-registration');
      return;
    }

    if (!priceId) {
      toast.info("You're currently on the free plan");
      return;
    }

    setSubscribing(tier);

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || "Failed to start subscription process");
      setSubscribing(null);
    }
  };

  const getButtonText = (tier: string, priceId: string | null) => {
    if (selectedIndustries.length === 0) return 'Select Industry First';
    const tierName = TIERS[tier as keyof typeof TIERS].name;
    if (!user || !isDigger) return `Sign Up as Digger - ${tierName}`;
    if (currentTier === tier) return 'Current Plan';
    if (!priceId) return 'Current Plan';
    if (subscribing === tier) return <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>;
    return 'Subscribe';
  };

  const isButtonDisabled = (tier: string, priceId: string | null) => {
    if (selectedIndustries.length === 0) return true;
    if (subscribing) return true;
    if (user && isDigger && currentTier === tier) return true;
    return false;
  };

  const calculateInteractiveCosts = () => {
    const tiers = ['free', 'pro', 'premium'] as const;
    return tiers.map(tierKey => {
      const leadCost = getLeadCostForTier(tierKey);
      const leadCosts = interactiveLeads * leadCost;
      const totalCost = PRICING_TIERS[tierKey].priceValue + leadCosts;
      
      return {
        name: PRICING_TIERS[tierKey].name,
        monthly: PRICING_TIERS[tierKey].priceValue,
        leadCosts,
        total: totalCost
      };
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing Plans - Transparent Subscription & Lead Costs"
        description="Compare pricing plans for service professionals on digsandgigs. Choose from Free, Pro, or Premium tiers with transparent lead costs, no hidden fees, and flexible monthly subscriptions. Calculate your ROI with our interactive pricing calculator."
        keywords="pricing plans, lead costs, subscription tiers, service professional pricing, contractor leads, freelance pricing, transparent pricing"
        structuredData={generateFAQSchema([
          { question: "What are the subscription tiers?", answer: "We offer Free ($0/month), Pro ($99/month), and Premium ($599/month) tiers with different lead costs and features." },
          { question: "How much do leads cost?", answer: "Lead costs vary by tier: Free tier leads cost $60, Pro tier leads cost $40, and Premium tier leads are FREE." },
          { question: "Is there a commission on completed jobs?", answer: "Commission rates depend on your tier: Free (9%), Pro (6%), Premium (0%)." }
        ])}
      />
      {/* Navigation */}
      <Navigation showBackButton backLabel="Back to Home" />

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Digger Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Let's get Started
            </h1>
            
            {/* Subscription Status and Refresh */}
            {isDigger && subscriptionStatus && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Badge variant={subscriptionStatus.subscription_status === 'active' ? 'default' : 'secondary'}>
                  Current: {subscriptionStatus.subscription_tier.charAt(0).toUpperCase() + subscriptionStatus.subscription_tier.slice(1)} Plan
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshSubscription}
                  disabled={refreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Step 1: Build My Digs */}
      <section className="py-16 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl font-bold text-primary">1st Step</span>
                <span className="text-5xl text-primary animate-[pulse_1s_ease-in-out_infinite]">→</span>
                <h2 className="text-3xl font-bold">Build My Digs</h2>
              </div>
              <p className="text-muted-foreground">
                Ready to get started? Fill out the form below to create your digger profile
              </p>
            </div>

            {!showRegistrationForm ? (
              <div className="text-center">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 hover:scale-105 transition-all"
                  onClick={() => setShowRegistrationForm(true)}
                >
                  Start Building Your Profile
                  <ArrowDown className="ml-2 h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Digger Registration</CardTitle>
                      <CardDescription>
                        Let us know who you are to get started
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!formData.acceptTerms) {
                        toast.error("Please accept the Terms of Service to continue");
                        return;
                      }
                      
                      const registrationSchema = z.object({
                        fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
                        email: z.string().trim().email("Invalid email address"),
                        password: z.string().min(8, "Password must be at least 8 characters"),
                        confirmPassword: z.string(),
                        phone: z.string().trim().min(10, "Phone number required"),
                        companyName: z.string().trim().min(2, "Company name must be at least 2 characters"),
                      }).refine((data) => data.password === data.confirmPassword, {
                        message: "Passwords don't match",
                        path: ["confirmPassword"],
                      });
                      
                      try {
                        registrationSchema.parse(formData);
                        
                        // Check if user is already logged in
                        if (!user) {
                          // Sign up new user
                          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                            email: formData.email,
                            password: formData.password,
                            options: {
                              emailRedirectTo: `${window.location.origin}/pricing`,
                              data: {
                                full_name: formData.fullName,
                                user_type: 'digger'
                              }
                            }
                          });

                          if (signUpError) {
                            toast.error(signUpError.message);
                            return;
                          }

                          if (!signUpData.user) {
                            toast.error("Failed to create account");
                            return;
                          }

                          // Show verification UI
                          setPendingEmail(formData.email);
                          setShowVerification(true);
                          toast.success("Please check your email for the verification code");
                          return;
                        }

                        // Check for existing incomplete profile
                        const { data: existingProfile, error: fetchError } = await supabase
                          .from('digger_profiles')
                          .select('id')
                          .eq('user_id', user.id)
                          .eq('registration_status', 'incomplete')
                          .maybeSingle();

                        if (fetchError && fetchError.code !== 'PGRST116') {
                          throw fetchError;
                        }

                        if (existingProfile) {
                          // Update existing incomplete profile
                          const { error: updateError } = await supabase
                            .from('digger_profiles')
                            .update({
                              business_name: formData.companyName,
                              phone: formData.phone,
                              company_name: formData.companyName,
                            })
                            .eq('id', existingProfile.id);

                          if (updateError) throw updateError;
                        } else {
                          // Create new incomplete profile
                          const { error: insertError } = await supabase
                            .from('digger_profiles')
                            .insert({
                              user_id: user.id,
                              business_name: formData.companyName,
                              phone: formData.phone,
                              company_name: formData.companyName,
                              location: 'To be provided',
                              registration_status: 'incomplete',
                            });

                          if (insertError) throw insertError;
                        }
                        
                        localStorage.setItem("demo_user_info", JSON.stringify({
                          ...formData,
                          timestamp: new Date().toISOString(),
                          demoType: "digger",
                        }));
                        
                        setStep1Completed(true);
                        toast.success("Step 1 saved! Now select your profession(s)");
                        
                        // Scroll to Step 2
                        setTimeout(() => {
                          const step2Element = document.getElementById('step-2-industry');
                          if (step2Element) {
                            step2Element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      } catch (error) {
                        if (error instanceof z.ZodError) {
                          toast.error(error.errors[0].message);
                        } else {
                          console.error('Error saving registration:', error);
                          toast.error("Failed to save your progress. Please try again.");
                        }
                      }
                    }}
                    className="space-y-6"
                  >
                    {!showVerification ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="fullName">
                            <User className="inline-block h-4 w-4 mr-1" />
                            Full Name *
                          </Label>
                          <Input
                            id="fullName"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="companyName">
                            <User className="inline-block h-4 w-4 mr-1" />
                            Company Name *
                          </Label>
                          <Input
                            id="companyName"
                            placeholder="Enter your company name"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">
                            <Mail className="inline-block h-4 w-4 mr-1" />
                            Email Address *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your.email@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={user !== null}
                            required
                          />
                          {user ? (
                            <p className="text-xs text-muted-foreground">You're already logged in</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              We'll send a verification code to this email
                            </p>
                          )}
                        </div>

                        {!user && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="password">
                                Password *
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                placeholder="Min. 8 characters"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="confirmPassword">
                                Confirm Password *
                              </Label>
                              <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                              />
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="phone">
                            <Phone className="inline-block h-4 w-4 mr-1" />
                            Phone Number *
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Verification Email Sent</p>
                          <p className="text-xs text-muted-foreground">
                            Check your email at <strong>{pendingEmail}</strong> for the verification link or code
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="verificationCode">
                            Enter Verification Code *
                          </Label>
                          <Input
                            id="verificationCode"
                            type="text"
                            placeholder="Enter code from email"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={async () => {
                            const { error } = await supabase.auth.resend({
                              type: 'signup',
                              email: pendingEmail,
                            });
                            if (error) toast.error("Failed to resend");
                            else toast.success("Verification email resent");
                          }}
                        >
                          Resend Email
                        </Button>
                      </div>
                    )}

                    {!showVerification && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="industries" className="font-medium flex items-center gap-2">
                            Select Your Profession *
                            {selectedIndustries.length === 0 && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </Label>
                          <div className="space-y-2">
                            <ProfessionKeywordInput
                              professions={selectedIndustries.map(keyword => ({
                                keyword,
                                cpl: {
                                  free: getLeadCostForIndustry(keyword, 'free'),
                                  pro: getLeadCostForIndustry(keyword, 'pro'),
                                  premium: getLeadCostForIndustry(keyword, 'premium')
                                },
                                valueIndicator: getValueIndicator(keyword)
                              }))}
                              onProfessionsChange={(professions) => {
                                setSelectedIndustries(professions.map(p => p.keyword));
                                const newQuantities = { ...professionLeadQuantities };
                                professions.forEach(prof => {
                                  if (!(prof.keyword in newQuantities)) newQuantities[prof.keyword] = 0;
                                });
                                Object.keys(newQuantities).forEach(keyword => {
                                  if (!professions.find(p => p.keyword === keyword)) delete newQuantities[keyword];
                                });
                                setProfessionLeadQuantities(newQuantities);
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              👆 List multiple professions and/or keywords separated by commas (,)
                            </p>
                          </div>
                        </div>

                        {/* Lead Quantity Section */}
                        {selectedIndustries.length > 0 && (
                      <div className="space-y-4 p-6 border rounded-lg bg-muted/30">
                        <Label className="font-semibold text-lg">
                          How many leads would you like to purchase?
                        </Label>
                        <div className="space-y-3">
                          {selectedIndustries.map((profession) => {
                            const indicator = getValueIndicator(profession);
                            const leadCost = getProfessionLeadCost(profession, 'free');
                            return (
                              <div key={profession} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-background rounded border">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium">
                                      {profession}
                                    </Label>
                                    <Badge variant={indicator === 'HV' ? 'default' : indicator === 'MV' ? 'secondary' : 'outline'} className="text-xs">
                                      {indicator}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ${leadCost}/lead (base rate)
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={professionLeadQuantities[profession] || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      setProfessionLeadQuantities({
                                        ...professionLeadQuantities,
                                        [profession]: value
                                      });
                                    }}
                                    className="w-24"
                                  />
                                  <span className="text-sm text-muted-foreground">leads/mo</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Cost Summary */}
                        {getTotalLeads() > 0 && (
                          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Total Leads:</span>
                                <span className="font-semibold">{getTotalLeads()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Subtotal:</span>
                                <span>${calculateTotalCost().subtotal.toFixed(2)}</span>
                              </div>
                              {getVolumeDiscount() > 0 && (
                                <>
                                  <div className="flex justify-between text-sm text-green-600">
                                    <span>Volume Discount ({(getVolumeDiscount() * 100).toFixed(0)}%):</span>
                                    <span>-${calculateTotalCost().discount.toFixed(2)}</span>
                                  </div>
                                  <div className="pt-2 border-t border-primary/20">
                                    <div className="flex justify-between font-semibold text-lg">
                                      <span>Total:</span>
                                      <span className="text-primary">${calculateTotalCost().total.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </>
                              )}
                              {getVolumeDiscount() === 0 && (
                                <div className="pt-2 border-t border-primary/20">
                                  <div className="flex justify-between font-semibold text-lg">
                                    <span>Total:</span>
                                    <span className="text-primary">${calculateTotalCost().total.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}

                    {!showVerification ? (
                      <Button type="submit" className="w-full" size="lg">
                        {user ? "Continue to Step 2 →" : "Sign Up & Continue →"}
                      </Button>
                    ) : (
                      <Button 
                        type="button"
                        className="w-full" 
                        size="lg"
                        onClick={async () => {
                          if (!verificationCode.trim()) {
                            toast.error("Please enter verification code");
                            return;
                          }
                          const { data, error } = await supabase.auth.verifyOtp({
                            email: pendingEmail,
                            token: verificationCode.trim(),
                            type: 'email'
                          });
                          if (error || !data.user) {
                            toast.error("Invalid code");
                            return;
                          }
                          const { error: insertError } = await supabase
                            .from('digger_profiles')
                            .insert({
                              user_id: data.user.id,
                              business_name: formData.companyName,
                              phone: formData.phone,
                              company_name: formData.companyName,
                              location: 'To be provided',
                              registration_status: 'incomplete',
                            });
                          if (insertError) console.error(insertError);
                          setStep1Completed(true);
                          setShowVerification(false);
                          toast.success("Verified! Now select professions");
                        }}
                      >
                        Verify & Continue →
                      </Button>
                     )}

                    {!showVerification && (
                      <>
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="terms"
                            checked={formData.acceptTerms}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, acceptTerms: checked === true })
                            }
                          />
                          <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                            I agree to the{" "}
                            <a href="/terms-of-service" className="text-primary hover:underline" target="_blank">
                              Terms of Service
                            </a>{" "}
                            and{" "}
                            <a href="/privacy-policy" className="text-primary hover:underline" target="_blank">
                              Privacy Policy
                            </a>
                          </Label>
                        </div>

                    {/* Current Profile Industry Sets Indicator */}
                    {currentProfileIndustrySets.length > 0 && (
                      <Card className="p-4 bg-primary/5 border-primary/20">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Badge variant="secondary" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                                {currentProfileIndustrySets.length}
                              </Badge>
                              Industry Set{currentProfileIndustrySets.length !== 1 ? 's' : ''} Added to This Profile
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {currentProfileIndustrySets.map((industries, idx) => (
                              <div key={idx} className="flex flex-wrap gap-1 p-2 bg-background rounded border border-border">
                                <span className="text-xs font-medium text-muted-foreground mr-2">Set {idx + 1}:</span>
                                {industries.map((industry, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {industry}
                                  </Badge>
                                ))}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            These will be saved together under {formData.companyName || 'this profile'}
                          </p>
                        </div>
                      </Card>
                    )}

                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          type="submit" 
                          className="flex-1" 
                          size="lg" 
                          disabled={selectedIndustries.length === 0}
                          onClick={(e) => {
                            e.preventDefault();
                            // Add to cart logic
                            if (!formData.acceptTerms || selectedIndustries.length === 0) {
                              if (!formData.acceptTerms) {
                                toast.error("Please accept the Terms of Service");
                              } else {
                                toast.error("Please select at least one industry");
                              }
                              return;
                            }
                            
                            // Add current industries to the tracking set
                            setCurrentProfileIndustrySets([...currentProfileIndustrySets, selectedIndustries]);
                            
                            // Clear current selection for next industry set
                            setSelectedIndustries([]);
                            setProfessionLeadQuantities({});
                            
                            toast.success("Industry set added! Add more or proceed to cart.");
                            
                            // Scroll to industry selector for next set
                            setTimeout(() => {
                              const step2Element = document.getElementById('step-2-industry');
                              if (step2Element) {
                                step2Element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          }}
                        >
                          Add Industry Set to Profile
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          className="flex-1" 
                          size="lg" 
                          disabled={currentProfileIndustrySets.length === 0 && selectedIndustries.length === 0}
                          onClick={async () => {
                            if (!formData.acceptTerms) {
                              toast.error("Please accept the Terms of Service");
                              return;
                            }
                            
                            if (!user) {
                              toast.error("Please sign in to create a profile");
                              navigate("/auth");
                              return;
                            }
                            
                            // If there are currently selected industries, add them first
                            let allSets = [...currentProfileIndustrySets];
                            if (selectedIndustries.length > 0) {
                              allSets.push(selectedIndustries);
                            }
                            
                            if (allSets.length === 0) {
                              toast.error("Please select at least one industry");
                              return;
                            }
                            
                            try {
                              // Combine all industry sets for this profile
                              const allIndustries = allSets.flat();
                              
                              // Check how many profiles exist with this base company name
                              const { data: existingProfiles, error: countError } = await supabase
                                .from("digger_profiles")
                                .select("business_name")
                                .eq("user_id", user.id)
                                .ilike("business_name", `${formData.companyName}%`);
                              
                              if (countError) throw countError;
                              
                              // Determine the suffix number for this profile
                              let profileSuffix = 1;
                              if (existingProfiles && existingProfiles.length > 0) {
                                // Extract numbers from existing profiles and find the highest
                                const existingNumbers = existingProfiles
                                  .map(p => {
                                    const match = p.business_name.match(/-(\d+)$/);
                                    return match ? parseInt(match[1]) : 0;
                                  })
                                  .filter(n => n > 0);
                                
                                if (existingNumbers.length > 0) {
                                  profileSuffix = Math.max(...existingNumbers) + 1;
                                } else {
                                  // Check if base name exists without suffix
                                  const exactMatch = existingProfiles.find(
                                    p => p.business_name === formData.companyName
                                  );
                                  profileSuffix = exactMatch ? 2 : 1;
                                }
                              }
                              
                              const profileName = `${formData.companyName}-${profileSuffix}`;
                              
                              // Check for existing incomplete profile to update
                              const { data: incompleteProfile, error: fetchError } = await supabase
                                .from("digger_profiles")
                                .select("id")
                                .eq("user_id", user.id)
                                .eq("registration_status", "incomplete")
                                .maybeSingle();

                              if (fetchError && fetchError.code !== 'PGRST116') {
                                throw fetchError;
                              }

                              let data, error;
                              
                              if (incompleteProfile) {
                                // Update existing incomplete profile to complete
                                const result = await supabase
                                  .from("digger_profiles")
                                  .update({
                                    business_name: profileName,
                                    company_name: formData.companyName,
                                    phone: formData.phone,
                                    location: "TBD",
                                    profession: allIndustries[0],
                                    naics_code: allIndustries,
                                    lead_tier_description: getLeadTierDescription(allIndustries),
                                    registration_status: 'complete',
                                  })
                                  .eq("id", incompleteProfile.id)
                                  .select()
                                  .single();
                                
                                data = result.data;
                                error = result.error;
                              } else {
                                // Create new complete profile
                                const result = await supabase
                                  .from("digger_profiles")
                                  .insert({
                                    user_id: user.id,
                                    business_name: profileName,
                                    company_name: formData.companyName,
                                    phone: formData.phone,
                                    location: "TBD",
                                    profession: allIndustries[0],
                                    naics_code: allIndustries,
                                    lead_tier_description: getLeadTierDescription(allIndustries),
                                    registration_status: 'complete',
                                  })
                                  .select()
                                  .single();
                                
                                data = result.data;
                                error = result.error;
                              }
                              
                              if (error) throw error;
                              
                              // Save lead quantities to localStorage for checkout
                              const leadPurchaseData = {
                                profileId: data.id,
                                profileName: profileName,
                                professionLeadQuantities: professionLeadQuantities,
                                totalLeads: getTotalLeads(),
                                costBreakdown: calculateTotalCost(),
                                timestamp: new Date().toISOString(),
                              };
                              localStorage.setItem("pending_lead_purchase", JSON.stringify(leadPurchaseData));
                              
                              // Reset form for next profile
                              setCurrentProfileIndustrySets([]);
                              setSelectedIndustries([]);
                              setProfessionLeadQuantities({});
                              
                              toast.success(`Profile "${profileName}" created! (ID: ${data.profile_number}). Ready to purchase leads.`);
                              
                              // TODO: Navigate to lead purchase selection or checkout
                            } catch (error) {
                              console.error("Error creating profile:", error);
                              toast.error("Failed to create profile. Please try again.");
                            }
                          }}
                        >
                          Create Profile ({currentProfileIndustrySets.length + (selectedIndustries.length > 0 ? 1 : 0)} Industry Set{(currentProfileIndustrySets.length + (selectedIndustries.length > 0 ? 1 : 0)) !== 1 ? 's' : ''})
                        </Button>
                      </div>
                      
                      <Button 
                        type="button"
                        variant="secondary"
                        className="w-full" 
                        size="lg"
                        onClick={() => {
                          // Complete reset for a new profile
                          setFormData({
                            fullName: "",
                            companyName: "",
                            email: "",
                            password: "",
                            confirmPassword: "",
                            phone: "",
                            acceptTerms: false,
                          });
                          setSelectedIndustries([]);
                          setCurrentProfileIndustrySets([]);
                          setProfessionLeadQuantities({});
                          setStep1Completed(false);
                          toast.info("Starting fresh - create a new profile");
                          
                          // Scroll to top
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Start New Profile (Different Person/Company)
                      </Button>
                    </div>
                    
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      No payment required • No commitment to buy
                    </p>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  </section>

      {/* Industry Selector - Step 2 (shown after Step 1 is completed, synced with Step 1 selection) */}
      {step1Completed && (
        <section id="step-2-industry" className="py-8 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Label htmlFor="industry-select" className="text-base font-medium mb-3 block text-center">
                Refine your Industries (optional)
              </Label>
              <div className="flex items-center gap-4 justify-center">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-2xl font-bold text-primary whitespace-nowrap">2nd Step</span>
                  <span className="text-5xl text-primary animate-[pulse_1s_ease-in-out_infinite]">→</span>
                </div>
                <div className="flex-1 max-w-md">
                  <ProfessionKeywordInput
                    professions={selectedIndustries.map(keyword => {
                      return {
                        keyword,
                        cpl: {
                          free: getLeadCostForIndustry(keyword, 'free'),
                          pro: getLeadCostForIndustry(keyword, 'pro'),
                          premium: getLeadCostForIndustry(keyword, 'premium')
                        },
                        valueIndicator: getValueIndicator(keyword)
                      };
                    })}
                    onProfessionsChange={(professions) => {
                      setSelectedIndustries(professions.map(p => p.keyword));
                    }}
                  />
                  <div className="mt-2 flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      List multiple professions and/or keywords separated by commas (,)
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground mt-4">
                💡 Your selections from Step 1 are already applied
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Cards - pricing updates in real-time, clickable after Step 1 */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {!canInteractWithPricing && selectedIndustries.length > 0 && (
            <div className="text-center mb-8">
              <p className="text-muted-foreground text-lg">
                Complete and submit Step 1 to proceed with your selection
              </p>
            </div>
          )}
          {!canInteractWithPricing && selectedIndustries.length === 0 && (
            <div className="text-center mb-8">
              <p className="text-muted-foreground text-lg">
                Select an industry in Step 1 to see pricing
              </p>
            </div>
          )}
          <div className={`${!canInteractWithPricing ? 'pointer-events-none opacity-50' : ''}`}>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {Object.entries(TIERS).map(([key, tier]) => (
                <Card 
                  key={key}
                  onClick={() => canInteractWithPricing && !isButtonDisabled(key, tier.priceId) && handleSubscribe(key, tier.priceId)}
                  className={`relative transition-all ${
                    !canInteractWithPricing
                      ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-xl hover:scale-105'
                } ${
                  currentTier === key 
                    ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                    : tier.popular 
                    ? 'border-primary/50 shadow-md' 
                    : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {currentTier === key && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-green-500 text-white">
                      Active
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold mt-4">
                    {tier.volumeTier}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-2">
                    Expected: {key === 'free' ? '1-10 leads per month' : key === 'pro' ? '11-50 leads per month' : '51+ leads per month'}
                  </p>
                  {tier.savingsPercent !== undefined && (
                    <div className="mt-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={tier.savingsPercent === 0 ? "bg-muted text-muted-foreground text-sm px-3 py-1 cursor-help" : "bg-green-500 text-white text-sm px-3 py-1 cursor-help"}>
                              {tier.savingsPercent === 0 ? "Standard Rate" : `Save ${tier.savingsPercent}%`}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              {tier.savingsPercent === 0 
                                ? "This is the standard Free tier rate with no volume commitment. Higher volume commitments unlock lower per-lead costs." 
                                : `By committing to ${key === 'pro' ? '11-50' : '51+'} leads per month, you save ${tier.savingsPercent}% compared to the standard Free tier rate.`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  {tier.description && (
                    <CardDescription className="mt-3 text-sm font-medium text-primary">
                      {tier.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Industry Selection Required Notice */}
                  {selectedIndustries.length === 0 && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-lg text-center">
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                        ⬆️ Select an industry above to unlock pricing
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Lead Cost (highest selected):</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">
                                {tier.volumeTier === 'Free Tier (1-10 leads/mo)' 
                                  ? 'Standard pricing - Commit to receiving 1-10 leads per month. All leads charged at this rate.'
                                  : tier.volumeTier === 'Pro Tier (11-50 leads/mo)'
                                  ? 'Best Bulk Pricing - Commit to 11-50 leads/month. Lock in 17% savings on every lead.'
                                  : 'Best Bulk Pricing - Commit to 51+ leads/month. Lock in 33% savings on every lead.'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-primary">${tier.leadCostValue}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg border border-dashed border-muted-foreground/30">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Escrow Fees:</span>
                            <Badge variant="outline" className="text-xs px-2 py-0">Optional</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">Only if gig poster requests escrow</span>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">Fee charged only when gig posters request escrow protection for their project. Charged on each milestone or progress payment released through escrow, with a minimum fee of $10 per release.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-primary">{tier.escrowProcessingFee}</span>
                    </div>
                  </div>

                  {tier.features.length > 0 && (
                    <ul className="space-y-3">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canInteractWithPricing && !isButtonDisabled(key, tier.priceId)) {
                        handleSubscribe(key, tier.priceId);
                      }
                    }}
                    disabled={isButtonDisabled(key, tier.priceId) || !canInteractWithPricing}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {getButtonText(key, tier.priceId)}
                  </Button>
                </CardContent>
              </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How Commitment-Based Pricing Works - only shown after Step 1 is completed */}
      {step1Completed && (
        <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-base font-semibold mb-4 text-center">🔒 How Commitment-Based Pricing Works:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• <strong>Choose your profession</strong></li>
                <li>• <strong>Choose Your Tier:</strong> At the start of each month, select the tier that matches your expected lead volume</li>
                <li>• <strong>Lock In Your Rate:</strong> All leads you receive that month will be charged at your chosen tier's rate</li>
                <li>• <strong>Pay As You Go:</strong> You only pay for leads you actually receive - no upfront costs or monthly fees</li>
                <li>• <strong>Standard: 1-10 leads/month:</strong> Standard pricing - Perfect for getting started or low volume</li>
                <li>• <strong>Pro: 11-50 leads/month:</strong> Bulk Pricing - Save 17% when you expect 11+ leads</li>
                <li>• <strong>Premium: 51+ leads/month:</strong> Best Bulk Pricing - Save 33% with maximum volume commitment</li>
                <li>• <strong>Credit roll over</strong> to the following month(s) if not enough leads.</li>
                <li>• <strong>Refund credits</strong> after deducting the Standard Price of Sold leads</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-4 italic text-center">
                Choose wisely! Your commitment level determines your per-lead cost for the entire month, regardless of how many leads you actually receive.
              </p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Hourly Upcharge Display for Logged-in Diggers */}
      {step1Completed && isDigger && user && (hourlyRateMin || hourlyRateMax) && (
        <section className="py-8 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-4 text-center">Your Hourly Award Upcharge</h3>
              <HourlyUpchargeDisplay
                hourlyRateMin={hourlyRateMin}
                hourlyRateMax={hourlyRateMax}
                subscriptionTier={currentTier}
              />
            </div>
          </div>
        </section>
      )}


      {step1Completed && (
        <div className="container mx-auto px-4 space-y-16 py-16">
          <InteractiveLeadSlider />
          <MonthlyLeadSimulator />
          <CompetitorCostComparison />
          <LeadCostTimeline />
          <LeadNumberingExplainer />
          <EscrowFeeBreakdown />
          <PlanRecommender />
          <PricingCharts />
          <BreakevenCalculator />
        </div>
      )}

      <Footer />
    </div>
  );
}
