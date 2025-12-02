import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShoppingCart, CreditCard, CheckCircle2, ArrowLeft, Plus, Minus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { getLeadCostFromCPC, getIndustryCategory, calculateBulkDiscount, INDUSTRY_PRICING, getLeadCostForIndustry } from "@/config/pricing";
import { GOOGLE_CPC_KEYWORDS, getIndustryForKeyword } from "@/config/googleCpcKeywords";
import SEOHead from "@/components/SEOHead";

interface LeadSelection {
  id: string;
  keyword: string;
  industry: string;
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h';
  quantity: number;
  isConfirmed: boolean;
  pricePerLead?: number;
  subtotal?: number;
}

interface DiscountInfo {
  subtotal: number;
  originalTotal?: number;
  discountOnFirstThousand: number;
  discountOnExcess: number;
  totalDiscount: number;
  finalTotal: number;
  savingsPercentage?: number;
}

type LeadType = 'exclusive-24h' | 'semi-exclusive' | 'confirmed' | 'unconfirmed';

const LEAD_TYPE_OPTIONS: { value: LeadType; label: string }[] = [
  { value: 'exclusive-24h', label: '24-Hr Exclusive' },
  { value: 'semi-exclusive', label: 'Semi Exclusive' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'unconfirmed', label: 'Unconfirmed' },
];

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selections, setSelections] = useState<LeadSelection[]>([]);
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Get profileId from URL params
  const searchParams = new URLSearchParams(location.search);
  const profileId = searchParams.get('profileId');

  // Helper to look up Google CPC for a keyword
  const lookupGoogleCPC = useCallback((keyword: string, industry: string): { cpc: number; isEstimated: boolean } => {
    const keywordLower = keyword.toLowerCase();
    
    // Search through all industry keyword arrays
    for (const industryData of GOOGLE_CPC_KEYWORDS) {
      // Check for exact keyword match
      const exactMatch = industryData.keywords.find(
        k => k.keyword.toLowerCase() === keywordLower
      );
      if (exactMatch) {
        return { cpc: exactMatch.cpc, isEstimated: false };
      }
    }
    
    // Try partial match across all industries
    for (const industryData of GOOGLE_CPC_KEYWORDS) {
      const partialMatch = industryData.keywords.find(
        k => k.keyword.toLowerCase().includes(keywordLower) || keywordLower.includes(k.keyword.toLowerCase())
      );
      if (partialMatch) {
        return { cpc: partialMatch.cpc, isEstimated: true };
      }
    }
    
    // Fallback: estimate CPC based on lead cost (same logic as KeywordSummary)
    const leadCost = getLeadCostForIndustry(industry, 'non-exclusive');
    const estimatedCPC = leadCost / 0.20;
    
    return { cpc: Math.round(estimatedCPC * 100) / 100, isEstimated: true };
  }, []);

  // Calculate price per lead based on CPC and lead type
  const calculatePricePerLead = useCallback((keyword: string, industry: string, exclusivity: string, isConfirmed: boolean): number => {
    const { cpc } = lookupGoogleCPC(keyword, industry);
    const category = getIndustryCategory(keyword, industry);
    return getLeadCostFromCPC(cpc, exclusivity as 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h', isConfirmed, category);
  }, [lookupGoogleCPC]);

  // Recalculate discount info based on current selections
  const recalculateDiscounts = useCallback((currentSelections: LeadSelection[]): DiscountInfo => {
    const subtotal = currentSelections.reduce((sum, sel) => {
      if (sel.quantity <= 0) return sum;
      const price = calculatePricePerLead(sel.keyword, sel.industry, sel.exclusivity, sel.isConfirmed);
      return sum + (price * sel.quantity);
    }, 0);
    
    const result = calculateBulkDiscount(subtotal);
    return {
      subtotal: result.originalTotal,
      originalTotal: result.originalTotal,
      discountOnFirstThousand: result.discountOnFirstThousand,
      discountOnExcess: result.discountOnExcess,
      totalDiscount: result.totalDiscount,
      finalTotal: result.finalTotal,
      savingsPercentage: result.savingsPercentage,
    };
  }, [calculatePricePerLead]);

  // Update selections and recalculate
  const updateSelectionsAndRecalculate = useCallback((newSelections: LeadSelection[]) => {
    setSelections(newSelections);
    const newDiscount = recalculateDiscounts(newSelections);
    setDiscountInfo(newDiscount);
    
    // Sync to sessionStorage
    const purchasesWithPricing = newSelections
      .filter(sel => sel.quantity > 0)
      .map(sel => ({
        ...sel,
        pricePerLead: calculatePricePerLead(sel.keyword, sel.industry, sel.exclusivity, sel.isConfirmed),
        subtotal: calculatePricePerLead(sel.keyword, sel.industry, sel.exclusivity, sel.isConfirmed) * sel.quantity,
      }));
    
    sessionStorage.setItem('leadPurchaseSelections', JSON.stringify(purchasesWithPricing));
    sessionStorage.setItem('leadPurchaseDiscount', JSON.stringify(newDiscount));
    sessionStorage.setItem('allLeadSelections', JSON.stringify(newSelections));
  }, [recalculateDiscounts, calculatePricePerLead]);

  // Handler: Update quantity for a selection
  const updateQuantity = useCallback((selectionId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const updated = selections.map(sel => 
      sel.id === selectionId ? { ...sel, quantity: newQuantity } : sel
    );
    updateSelectionsAndRecalculate(updated);
  }, [selections, updateSelectionsAndRecalculate]);

  // Handler: Update lead type for a selection
  const updateLeadType = useCallback((selectionId: string, newLeadType: LeadType) => {
    const updated = selections.map(sel => {
      if (sel.id !== selectionId) return sel;
      
      // Map lead type to exclusivity and isConfirmed
      let exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive';
      let isConfirmed = false;
      
      switch (newLeadType) {
        case 'exclusive-24h':
          exclusivity = 'exclusive-24h';
          break;
        case 'semi-exclusive':
          exclusivity = 'semi-exclusive';
          break;
        case 'confirmed':
          exclusivity = 'non-exclusive';
          isConfirmed = true;
          break;
        case 'unconfirmed':
          exclusivity = 'non-exclusive';
          isConfirmed = false;
          break;
      }
      
      return { ...sel, exclusivity, isConfirmed };
    });
    updateSelectionsAndRecalculate(updated);
  }, [selections, updateSelectionsAndRecalculate]);

  // Handler: Delete a selection
  const deleteSelection = useCallback((selectionId: string) => {
    const updated = selections.filter(sel => sel.id !== selectionId);
    updateSelectionsAndRecalculate(updated);
    
    if (updated.length === 0) {
      toast.info("All items removed. Redirecting...");
      setTimeout(() => navigate(profileId ? `/digger/${profileId}` : '/pricing'), 1500);
    }
  }, [selections, updateSelectionsAndRecalculate, navigate, profileId]);

  // Handler: Add new lead type for a keyword
  const addLeadTypeForKeyword = useCallback((keyword: string, industry: string) => {
    // Find existing lead types for this keyword
    const existingTypes = selections
      .filter(sel => sel.keyword === keyword)
      .map(sel => {
        if (sel.exclusivity === 'exclusive-24h') return 'exclusive-24h';
        if (sel.exclusivity === 'semi-exclusive') return 'semi-exclusive';
        return sel.isConfirmed ? 'confirmed' : 'unconfirmed';
      });
    
    // Find first available lead type
    const availableType = LEAD_TYPE_OPTIONS.find(opt => !existingTypes.includes(opt.value));
    
    if (!availableType) {
      toast.info("All lead types already added for this keyword");
      return;
    }
    
    // Create new selection
    let exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive';
    let isConfirmed = false;
    
    switch (availableType.value) {
      case 'exclusive-24h':
        exclusivity = 'exclusive-24h';
        break;
      case 'semi-exclusive':
        exclusivity = 'semi-exclusive';
        break;
      case 'confirmed':
        isConfirmed = true;
        break;
    }
    
    const newSelection: LeadSelection = {
      id: `${keyword}-${availableType.value}-${Date.now()}`,
      keyword,
      industry,
      exclusivity,
      quantity: 1,
      isConfirmed,
    };
    
    updateSelectionsAndRecalculate([...selections, newSelection]);
  }, [selections, updateSelectionsAndRecalculate]);

  // Get current lead type from selection
  const getLeadTypeFromSelection = (sel: LeadSelection): LeadType => {
    if (sel.exclusivity === 'exclusive-24h') return 'exclusive-24h';
    if (sel.exclusivity === 'semi-exclusive') return 'semi-exclusive';
    return sel.isConfirmed ? 'confirmed' : 'unconfirmed';
  };

  // Get lead type badge styling
  const getLeadTypeBadge = (leadType: LeadType) => {
    switch (leadType) {
      case 'exclusive-24h':
        return { variant: 'destructive' as const, label: '24-Hr Exclusive' };
      case 'semi-exclusive':
        return { variant: 'default' as const, label: 'Semi Exclusive' };
      case 'confirmed':
        return { variant: 'secondary' as const, label: 'Confirmed' };
      case 'unconfirmed':
        return { variant: 'outline' as const, label: 'Unconfirmed' };
    }
  };

  useEffect(() => {
    // Get lead purchase selections from sessionStorage
    const savedSelections = sessionStorage.getItem('leadPurchaseSelections');
    const savedAllSelections = sessionStorage.getItem('allLeadSelections');
    const savedDiscount = sessionStorage.getItem('leadPurchaseDiscount');
    
    // Prefer allLeadSelections (includes zero-qty items) over leadPurchaseSelections
    const selectionsToUse = savedAllSelections || savedSelections;
    
    if (!selectionsToUse) {
      toast.error("No checkout data found");
      navigate("/pricing");
      return;
    }

    try {
      const parsedSelections = JSON.parse(selectionsToUse);
      
      if (!parsedSelections || parsedSelections.length === 0) {
        toast.error("No items selected");
        navigate("/pricing");
        return;
      }
      
      // Filter to only show items with quantity > 0
      const activeSelections = parsedSelections.filter((sel: LeadSelection) => sel.quantity > 0);
      
      if (activeSelections.length === 0) {
        toast.error("No items with quantity selected");
        navigate("/pricing");
        return;
      }
      
      setSelections(activeSelections);
      
      // Recalculate discount info
      const newDiscount = recalculateDiscounts(activeSelections);
      setDiscountInfo(newDiscount);
      
      setLoading(false);
    } catch (error) {
      console.error("Error parsing checkout data:", error);
      toast.error("Invalid checkout data");
      navigate("/pricing");
    }
  }, [navigate, recalculateDiscounts]);

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      navigate("/register");
      return;
    }
    
    const activeSelections = selections.filter(sel => sel.quantity > 0);
    
    if (activeSelections.length === 0) {
      toast.error("Please add at least one item to checkout");
      return;
    }

    setProcessing(true);
    try {
      // Prepare selections with pricing
      const selectionsWithPricing = activeSelections.map(sel => ({
        ...sel,
        pricePerLead: calculatePricePerLead(sel.keyword, sel.industry, sel.exclusivity, sel.isConfirmed),
        subtotal: calculatePricePerLead(sel.keyword, sel.industry, sel.exclusivity, sel.isConfirmed) * sel.quantity,
      }));

      const { data, error } = await supabase.functions.invoke("create-bulk-lead-checkout", {
        body: {
          selections: selectionsWithPricing,
          totalAmount: discountInfo?.finalTotal || 0,
          diggerProfileId: profileId,
          discountInfo: discountInfo,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL received");

      window.location.href = data.url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to process checkout");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Group selections by keyword
  const groupedSelections = selections.reduce((acc, sel) => {
    if (!acc[sel.keyword]) {
      acc[sel.keyword] = {
        keyword: sel.keyword,
        industry: sel.industry,
        selections: [],
      };
    }
    acc[sel.keyword].selections.push(sel);
    return acc;
  }, {} as Record<string, { keyword: string; industry: string; selections: LeadSelection[] }>);

  const keywordGroups = Object.values(groupedSelections);

  return (
    <>
      <SEOHead
        title="Checkout - Digsandgigs"
        description="Complete your lead purchase on Digsandgigs"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => {
              const backUrl = profileId 
                ? `/keyword-summary?profileId=${profileId}`
                : '/keyword-summary';
              navigate(backUrl);
            }}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads Selection
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Checkout</h1>
            <p className="text-muted-foreground">
              Review and edit your lead purchase before payment
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Order Details</h2>
                </div>
                
                <div className="space-y-6">
                  {keywordGroups.map((group) => {
                    const { cpc, isEstimated } = lookupGoogleCPC(group.keyword, group.industry);
                    const existingLeadTypes = group.selections.map(getLeadTypeFromSelection);
                    const canAddMore = existingLeadTypes.length < 4;
                    
                    // Calculate keyword subtotal
                    const keywordSubtotal = group.selections.reduce((sum, sel) => {
                      if (sel.quantity <= 0) return sum;
                      const price = calculatePricePerLead(sel.keyword, sel.industry, sel.exclusivity, sel.isConfirmed);
                      return sum + (price * sel.quantity);
                    }, 0);
                    
                    return (
                      <div key={group.keyword} className="border rounded-lg overflow-hidden">
                        {/* Keyword Header */}
                        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{group.keyword}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Google CPC: ${cpc.toFixed(2)}</span>
                              {isEstimated && (
                                <Badge variant="outline" className="text-xs">Est.</Badge>
                              )}
                            </div>
                          </div>
                          {canAddMore && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addLeadTypeForKeyword(group.keyword, group.industry)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Lead Type
                            </Button>
                          )}
                        </div>
                        
                        {/* Lead Type Entries */}
                        <div className="divide-y">
                          {group.selections.map((sel) => {
                            const leadType = getLeadTypeFromSelection(sel);
                            const pricePerLead = calculatePricePerLead(sel.keyword, sel.industry, sel.exclusivity, sel.isConfirmed);
                            const lineTotal = pricePerLead * sel.quantity;
                            
                            return (
                              <div key={sel.id} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                                {/* Lead Type Selector */}
                                <div className="w-40">
                                  <Select
                                    value={leadType}
                                    onValueChange={(val) => updateLeadType(sel.id, val as LeadType)}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {LEAD_TYPE_OPTIONS.map(opt => (
                                        <SelectItem 
                                          key={opt.value} 
                                          value={opt.value}
                                          disabled={opt.value !== leadType && existingLeadTypes.includes(opt.value)}
                                        >
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(sel.id, sel.quantity - 1)}
                                    disabled={sel.quantity <= 0}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={sel.quantity}
                                    onChange={(e) => updateQuantity(sel.id, parseInt(e.target.value) || 0)}
                                    className="w-16 h-8 text-center"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(sel.id, sel.quantity + 1)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                {/* Price Per Lead */}
                                <div className="text-sm text-muted-foreground whitespace-nowrap">
                                  × ${pricePerLead.toFixed(2)}/lead
                                </div>
                                
                                {/* Line Total */}
                                <div className="font-semibold ml-auto whitespace-nowrap">
                                  ${lineTotal.toFixed(2)}
                                </div>
                                
                                {/* Delete Button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => deleteSelection(sel.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Keyword Subtotal */}
                        <div className="bg-muted/30 px-4 py-2 flex justify-between text-sm">
                          <span className="text-muted-foreground">Keyword Subtotal</span>
                          <span className="font-medium">${keywordSubtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">What You're Getting</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Exclusive or shared lead access based on your selection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Full contact information for each lead</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Real-time notifications for new matching gigs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Instant lead award for exclusive purchases</span>
                  </li>
                </ul>
              </Card>
            </div>

            {/* Payment Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${discountInfo?.subtotal.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  {discountInfo && discountInfo.totalDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount (10% on first $1,000)</span>
                        <span>-${discountInfo.discountOnFirstThousand.toFixed(2)}</span>
                      </div>
                      {discountInfo.discountOnExcess > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount (20% on excess)</span>
                          <span>-${discountInfo.discountOnExcess.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${discountInfo?.finalTotal.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  {discountInfo && discountInfo.totalDiscount > 0 && (
                    <div className="bg-green-50 dark:bg-green-950 rounded-md p-2 text-center">
                      <span className="text-sm text-green-600 font-medium">
                        You Save: ${discountInfo.totalDiscount.toFixed(2)} ({((discountInfo.totalDiscount / discountInfo.subtotal) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={processing || selections.filter(s => s.quantity > 0).length === 0}
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Proceed to Payment
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Secure payment powered by Stripe
                </p>
              </Card>
            </div>
          </div>

          {/* Back to Keyword Selection Button */}
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                const backUrl = profileId 
                  ? `/digger/${profileId}`
                  : '/pricing';
                navigate(backUrl);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Keyword Selection
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
