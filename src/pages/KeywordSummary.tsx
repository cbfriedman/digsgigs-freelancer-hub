import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShoppingCart, Info, Trash2, Plus } from "lucide-react";
import { getLeadCostForIndustry, getLeadCostFromCPC, getIndustryCategory, calculateBulkDiscount, type BulkDiscountResult } from "@/config/pricing";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GOOGLE_CPC_KEYWORDS, getIndustryForKeyword } from "@/config/googleCpcKeywords";
import { findMatchingIndustry } from "@/config/pricing";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SelectedKeyword {
  keyword: string;
  industry: string;
}

interface LeadSelection {
  id: string; // Unique ID for each selection entry
  keyword: string;
  industry: string;
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h';
  quantity: number;
  isConfirmed: boolean;
}

// Generate a unique ID for selection entries
const generateSelectionId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function KeywordSummary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<SelectedKeyword[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [selections, setSelections] = useState<LeadSelection[]>([]);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Get profileId from URL params if available
  const profileId = searchParams.get('profileId');

  // Helper to determine the correct industry for a keyword
  const determineKeywordIndustry = (keyword: string, fallbackCategory: string): string => {
    // First try to find the keyword in GOOGLE_CPC_KEYWORDS
    const foundIndustry = getIndustryForKeyword(keyword);
    if (foundIndustry) {
      return foundIndustry;
    }
    
    // Try fuzzy/partial matching with INDUSTRY_PRICING industries
    const matchedIndustry = findMatchingIndustry(keyword);
    if (matchedIndustry) {
      return matchedIndustry;
    }
    
    // Fall back to the category name
    return fallbackCategory || "General";
  };

  // Initialize selections from keywords (one default entry per keyword)
  const initializeSelectionsFromKeywords = (loadedKeywords: SelectedKeyword[]) => {
    const initialSelections: LeadSelection[] = loadedKeywords.map((kw) => ({
      id: generateSelectionId(),
      keyword: kw.keyword,
      industry: kw.industry,
      exclusivity: 'exclusive-24h',
      quantity: 0,
      isConfirmed: false
    }));
    setSelections(initialSelections);
  };

  useEffect(() => {
    const loadKeywords = async () => {
      setIsLoading(true);
      
      // If profileId is provided, load keywords from database
      if (profileId) {
        try {
          const { data: profile, error } = await supabase
            .from('digger_profiles')
            .select('keywords, profession, profile_name, business_name')
            .eq('id', profileId)
            .single();
          
          if (error) throw error;
          
          if (profile && profile.keywords && profile.keywords.length > 0) {
            const category = profile.profession || profile.profile_name || profile.business_name || "";
            setCategoryName(category);
            
            // Convert keywords to SelectedKeyword format with correct industries
            const loadedKeywords = profile.keywords.map((kw: string) => ({
              keyword: kw,
              industry: determineKeywordIndustry(kw, category)
            }));
            
            setKeywords(loadedKeywords);
            initializeSelectionsFromKeywords(loadedKeywords);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error loading profile keywords:", error);
        }
      }
      
      // Fall back to sessionStorage
      const savedData = sessionStorage.getItem('selectedKeywords');
      if (savedData) {
        const data = JSON.parse(savedData);
        const loadedKeywords = data.keywords || [];
        
        // Recalculate correct industry for each keyword
        const correctedKeywords = loadedKeywords.map((kw: SelectedKeyword) => ({
          keyword: kw.keyword,
          industry: determineKeywordIndustry(kw.keyword, data.categoryName || "")
        }));
        
        setKeywords(correctedKeywords);
        setCategoryName(data.categoryName || "");
        initializeSelectionsFromKeywords(correctedKeywords);
      } else if (!profileId) {
        // No keywords and no profile, redirect back
        navigate('/pricing');
      }
      
      setIsLoading(false);
    };
    
    loadKeywords();
  }, [navigate, profileId]);

  // Function to lookup Google CPC for a keyword
  const lookupGoogleCPC = (keyword: string, industry: string): { cpc: number; isEstimated: boolean } => {
    // Search through all industry categories in GOOGLE_CPC_KEYWORDS
    for (const industryData of GOOGLE_CPC_KEYWORDS) {
      const keywordData = industryData.keywords.find(
        kw => kw.keyword.toLowerCase() === keyword.toLowerCase()
      );
      if (keywordData) {
        return { cpc: keywordData.cpc, isEstimated: false };
      }
    }
    
    // Intelligent fallback CPC based on industry value tier
    const leadCost = getLeadCostForIndustry(industry, 'non-exclusive');
    
    // Non-exclusive is ~20% of Google CPC, so reverse calculate
    // Estimate Google CPC = Non-exclusive cost / 0.20
    const estimatedCPC = leadCost / 0.20;
    
    return { cpc: Math.round(estimatedCPC * 100) / 100, isEstimated: true };
  };

  const updateSelection = (selectionId: string, field: 'quantity' | 'exclusivity' | 'isConfirmed', value: any) => {
    setSelections(prev => prev.map(selection => {
      if (selection.id !== selectionId) return selection;
      
      if (field === 'quantity') {
        return { ...selection, quantity: parseInt(value) || 0 };
      } else if (field === 'exclusivity') {
        return { ...selection, exclusivity: value };
      } else if (field === 'isConfirmed') {
        return { ...selection, isConfirmed: value };
      }
      return selection;
    }));
  };

  // Add another lead type entry for a keyword
  const addLeadTypeForKeyword = (keyword: string, industry: string) => {
    // Get existing selections for this keyword to determine what lead types are already added
    const existingForKeyword = selections.filter(s => s.keyword === keyword);
    
    // Determine which lead type to add (pick the first one not already selected)
    const leadTypes: Array<{exclusivity: LeadSelection['exclusivity'], isConfirmed: boolean}> = [
      { exclusivity: 'exclusive-24h', isConfirmed: false },
      { exclusivity: 'semi-exclusive', isConfirmed: false },
      { exclusivity: 'non-exclusive', isConfirmed: true },
      { exclusivity: 'non-exclusive', isConfirmed: false },
    ];
    
    const availableType = leadTypes.find(type => 
      !existingForKeyword.some(s => 
        s.exclusivity === type.exclusivity && s.isConfirmed === type.isConfirmed
      )
    );
    
    if (!availableType) {
      toast({
        title: "All Lead Types Added",
        description: "You've already added all available lead types for this keyword",
        variant: "destructive"
      });
      return;
    }
    
    const newSelection: LeadSelection = {
      id: generateSelectionId(),
      keyword,
      industry,
      exclusivity: availableType.exclusivity,
      quantity: 0,
      isConfirmed: availableType.isConfirmed
    };
    
    setSelections(prev => [...prev, newSelection]);
    
    toast({
      title: "Lead Type Added",
      description: `Added another lead type for "${keyword}"`,
    });
  };

  // Delete a specific selection entry
  const deleteSelectionEntry = (selectionId: string) => {
    const selection = selections.find(s => s.id === selectionId);
    if (!selection) return;
    
    // Check if this is the last selection for this keyword
    const selectionsForKeyword = selections.filter(s => s.keyword === selection.keyword);
    
    if (selectionsForKeyword.length === 1) {
      // This is the last one, remove the keyword entirely
      handleDeleteKeyword(selection.keyword);
    } else {
      // Just remove this selection entry
      setSelections(prev => prev.filter(s => s.id !== selectionId));
      toast({
        title: "Lead Type Removed",
        description: `Removed lead type for "${selection.keyword}"`,
      });
    }
  };

  const calculateGrandTotal = () => {
    let total = 0;
    selections.forEach(selection => {
      const cpcData = lookupGoogleCPC(selection.keyword, selection.industry);
      const category = getIndustryCategory(selection.keyword, selection.industry);
      const pricePerLead = getLeadCostFromCPC(cpcData.cpc, selection.exclusivity, selection.isConfirmed, category);
      total += pricePerLead * selection.quantity;
    });
    return total;
  };

  const discountInfo: BulkDiscountResult = calculateBulkDiscount(calculateGrandTotal());

  const handleDeleteKeyword = (keywordToDelete: string) => {
    const updatedKeywords = keywords.filter(kw => kw.keyword !== keywordToDelete);
    setKeywords(updatedKeywords);
    
    // Remove all selections for this keyword
    setSelections(prev => prev.filter(s => s.keyword !== keywordToDelete));
    
    // Update sessionStorage
    const savedData = sessionStorage.getItem('selectedKeywords');
    if (savedData) {
      const data = JSON.parse(savedData);
      data.keywords = updatedKeywords;
      sessionStorage.setItem('selectedKeywords', JSON.stringify(data));
    }
    
    toast({
      title: "Keyword Removed",
      description: `"${keywordToDelete}" has been removed from your list`,
    });
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) {
      toast({
        title: "Invalid Keyword",
        description: "Please enter a keyword",
        variant: "destructive"
      });
      return;
    }

    // Check if keyword already exists
    if (keywords.some(kw => kw.keyword.toLowerCase() === newKeyword.trim().toLowerCase())) {
      toast({
        title: "Duplicate Keyword",
        description: "This keyword is already in your list",
        variant: "destructive"
      });
      return;
    }

    // Determine the correct industry for the new keyword
    const correctIndustry = determineKeywordIndustry(newKeyword.trim(), categoryName);

    const newKeywordObj: SelectedKeyword = {
      keyword: newKeyword.trim(),
      industry: correctIndustry
    };

    const updatedKeywords = [...keywords, newKeywordObj];
    setKeywords(updatedKeywords);

    // Add a default selection entry
    const newSelection: LeadSelection = {
      id: generateSelectionId(),
      keyword: newKeywordObj.keyword,
      industry: newKeywordObj.industry,
      exclusivity: 'exclusive-24h',
      quantity: 0,
      isConfirmed: false
    };
    setSelections(prev => [...prev, newSelection]);

    // Update sessionStorage
    const savedData = sessionStorage.getItem('selectedKeywords');
    if (savedData) {
      const data = JSON.parse(savedData);
      data.keywords = updatedKeywords;
      sessionStorage.setItem('selectedKeywords', JSON.stringify(data));
    }

    toast({
      title: "Keyword Added",
      description: `"${newKeyword.trim()}" has been added to your list`,
    });

    setNewKeyword("");
    setIsAddingKeyword(false);
  };

  const handleProceedToCheckout = () => {
    const leadPurchases = selections.filter(s => s.quantity > 0);
    
    if (leadPurchases.length === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select at least one lead to purchase",
        variant: "destructive"
      });
      return;
    }
    
    // Save lead purchase selections and discount info to sessionStorage
    sessionStorage.setItem('leadPurchaseSelections', JSON.stringify(leadPurchases));
    sessionStorage.setItem('leadPurchaseDiscount', JSON.stringify(discountInfo));
    
    toast({
      title: "Proceeding to Checkout",
      description: `${leadPurchases.length} lead type${leadPurchases.length !== 1 ? 's' : ''} ready for purchase`,
    });
    
    // Navigate to checkout with profileId if available
    const checkoutUrl = profileId ? `/checkout?profileId=${profileId}` : '/checkout';
    navigate(checkoutUrl);
  };

  // Get label for a lead type combination
  const getLeadTypeLabel = (exclusivity: string, isConfirmed: boolean): string => {
    if (exclusivity === 'exclusive-24h') return '24-Hr. Exclusive';
    if (exclusivity === 'semi-exclusive') return 'Semi Exclusive';
    if (exclusivity === 'non-exclusive' && isConfirmed) return 'Confirmed';
    return 'Unconfirmed';
  };

  // Get the combined value for the dropdown
  const getLeadTypeValue = (exclusivity: string, isConfirmed: boolean): string => {
    if (exclusivity === 'exclusive-24h') return 'exclusive-24h';
    if (exclusivity === 'semi-exclusive') return 'semi-exclusive';
    if (isConfirmed) return 'non-exclusive-confirmed';
    return 'non-exclusive-unconfirmed';
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background py-12 flex items-center justify-center">
          <p className="text-muted-foreground">Loading keywords...</p>
        </div>
      </>
    );
  }

  if (keywords.length === 0) {
    return null; // Will redirect in useEffect
  }

  // Group selections by keyword for display
  const selectionsByKeyword = keywords.map(kw => ({
    ...kw,
    selections: selections.filter(s => s.keyword === kw.keyword)
  }));

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(profileId ? `/digger/${profileId}` : '/pricing')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Keyword Selection
            </Button>
            <h1 className="text-4xl font-bold mb-2">
              Selected Keywords Summary
            </h1>
            {categoryName && (
              <p className="text-lg text-muted-foreground">
                Category: {categoryName}
              </p>
            )}
          </div>

          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configure Your Lead Purchases</CardTitle>
              <Dialog open={isAddingKeyword} onOpenChange={setIsAddingKeyword}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Keyword
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Keyword</DialogTitle>
                    <DialogDescription>
                      Enter a keyword to add to your lead purchase list
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-keyword">Keyword</Label>
                      <Input
                        id="new-keyword"
                        placeholder="e.g., business tax accountant"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddKeyword();
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => {
                        setIsAddingKeyword(false);
                        setNewKeyword("");
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddKeyword}>
                        Add Keyword
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {selectionsByKeyword.map(({ keyword, industry, selections: keywordSelections }, keywordIndex) => {
                  const cpcData = lookupGoogleCPC(keyword, industry);
                  const category = getIndustryCategory(keyword, industry);
                  
                  // Check if all lead types are already added
                  const allLeadTypesAdded = keywordSelections.length >= 4;

                  return (
                    <div key={keywordIndex} className="border rounded-lg p-4 bg-card">
                      {/* Keyword Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{keyword}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteKeyword(keyword)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                              title="Remove keyword entirely"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <Info className="h-4 w-4" />
                            <span>
                              Google CPC: <span className="font-semibold text-foreground">${cpcData.cpc.toFixed(2)}</span>
                              {cpcData.isEstimated && (
                                <span className="text-xs ml-1 text-amber-600 dark:text-amber-400">(estimated)</span>
                              )}
                            </span>
                          </div>
                          {cpcData.isEstimated && (
                            <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              <Info className="h-3 w-3 inline mr-1" />
                              Estimated CPC based on industry category. Actual Google CPC may vary.
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Lead Type Entries */}
                      <div className="space-y-4">
                        {keywordSelections.map((selection, selectionIndex) => {
                          const pricePerLead = getLeadCostFromCPC(cpcData.cpc, selection.exclusivity, selection.isConfirmed, category);
                          const subtotal = pricePerLead * selection.quantity;

                          return (
                            <div key={selection.id} className={`grid grid-cols-1 md:grid-cols-4 gap-4 items-end ${selectionIndex > 0 ? 'pt-4 border-t border-border/50' : ''}`}>
                              <div>
                                <Label htmlFor={`lead-type-${selection.id}`}>Lead Type</Label>
                                <select
                                  id={`lead-type-${selection.id}`}
                                  value={getLeadTypeValue(selection.exclusivity, selection.isConfirmed)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'non-exclusive-unconfirmed') {
                                      updateSelection(selection.id, 'exclusivity', 'non-exclusive');
                                      updateSelection(selection.id, 'isConfirmed', false);
                                    } else if (val === 'non-exclusive-confirmed') {
                                      updateSelection(selection.id, 'exclusivity', 'non-exclusive');
                                      updateSelection(selection.id, 'isConfirmed', true);
                                    } else if (val === 'semi-exclusive') {
                                      updateSelection(selection.id, 'exclusivity', 'semi-exclusive');
                                      updateSelection(selection.id, 'isConfirmed', false);
                                    } else if (val === 'exclusive-24h') {
                                      updateSelection(selection.id, 'exclusivity', 'exclusive-24h');
                                      updateSelection(selection.id, 'isConfirmed', false);
                                    }
                                  }}
                                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                >
                                  <option value="exclusive-24h">24-Hr. Exclusive - ${getLeadCostFromCPC(cpcData.cpc, 'exclusive-24h', false, category).toFixed(2)}/lead</option>
                                  <option value="semi-exclusive">Semi Exclusive - ${getLeadCostFromCPC(cpcData.cpc, 'semi-exclusive', false, category).toFixed(2)}/lead</option>
                                  <option value="non-exclusive-confirmed">Confirmed - ${getLeadCostFromCPC(cpcData.cpc, 'non-exclusive', true, category).toFixed(2)}/lead</option>
                                  <option value="non-exclusive-unconfirmed">Unconfirmed - ${getLeadCostFromCPC(cpcData.cpc, 'non-exclusive', false, category).toFixed(2)}/lead</option>
                                </select>
                              </div>

                              <div>
                                <Label htmlFor={`quantity-${selection.id}`}>Quantity</Label>
                                <Input
                                  id={`quantity-${selection.id}`}
                                  type="number"
                                  min="0"
                                  value={selection.quantity}
                                  onChange={(e) => updateSelection(selection.id, 'quantity', e.target.value)}
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <Label>Per Lead / Subtotal</Label>
                                <div className="mt-1">
                                  <Badge variant="outline" className="mb-1">
                                    ${pricePerLead.toFixed(2)}/lead
                                  </Badge>
                                  <div className="text-xl font-bold text-primary">
                                    ${subtotal.toFixed(2)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                {keywordSelections.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteSelectionEntry(selection.id)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    title="Remove this lead type"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Another Lead Type Button */}
                      {!allLeadTypesAdded && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addLeadTypeForKeyword(keyword, industry)}
                          className="mt-4"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Another Lead Type
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💰</span>
                  <span className="font-semibold text-blue-900 dark:text-blue-100">Bulk Purchase Discount</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  10% off first $1,000 • 20% off amount above $1,000
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono">${discountInfo.originalTotal.toFixed(2)}</span>
                </div>

                {discountInfo.discountOnFirstThousand > 0 && (
                  <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                    <span>10% off first $1,000:</span>
                    <span className="font-mono">-${discountInfo.discountOnFirstThousand.toFixed(2)}</span>
                  </div>
                )}

                {discountInfo.discountOnExcess > 0 && (
                  <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                    <span>20% off remaining:</span>
                    <span className="font-mono">-${discountInfo.discountOnExcess.toFixed(2)}</span>
                  </div>
                )}

                <Separator className="my-3" />

                <div className="flex items-center justify-between pt-2 font-semibold text-lg">
                  <span>Total After Discount:</span>
                  <span className="text-3xl text-primary font-bold">
                    ${discountInfo.finalTotal.toFixed(2)}
                  </span>
                </div>

                {discountInfo.totalDiscount > 0 && (
                  <div className="text-center py-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <span className="text-green-700 dark:text-green-300 font-semibold">
                      You Save: ${discountInfo.totalDiscount.toFixed(2)} ({discountInfo.savingsPercentage.toFixed(1)}%)
                    </span>
                  </div>
                )}

                <Button onClick={handleProceedToCheckout} size="lg" className="w-full mt-4">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Proceed to Checkout
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={() => navigate(profileId ? `/digger/${profileId}` : '/pricing')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Keyword Selection
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
